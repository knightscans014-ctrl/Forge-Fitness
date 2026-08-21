#!/usr/bin/env python3
"""Rewire the generated Android project to sign release builds with a real key.

`expo prebuild` emits a build.gradle whose *release* buildType is signed with
the debug keystore, with a comment telling you to fix it. Sideloading tolerates
that; Play does not, and the debug key differs per machine so upgrades break.

This runs in CI after prebuild, only when the keystore secrets are present.

Why a file and not an inline heredoc: this is exact-string surgery on generated
Groovy, and the first version got it wrong in a way that silently produced the
opposite of the intent -- `debug` is listed before `release` in `buildTypes`,
so "replace the first signingConfig after buildTypes" rewired the debug build
and left release on the debug key. The asserts below encode that lesson.
"""
import sys

GRADLE = 'android/app/build.gradle'

CONFIG_BLOCK = """        release {
            storeFile file(FORGE_UPLOAD_STORE_FILE)
            storePassword FORGE_UPLOAD_STORE_PASSWORD
            keyAlias FORGE_UPLOAD_KEY_ALIAS
            keyPassword FORGE_UPLOAD_KEY_PASSWORD
        }
"""

# The release buildType's comment makes this anchor unique. Matching on the
# bare `signingConfig signingConfigs.debug` line would also match the debug
# buildType, which must keep using the debug key.
OLD_RELEASE = """        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug"""

NEW_RELEASE = """        release {
            signingConfig signingConfigs.release"""


def main() -> int:
    with open(GRADLE) as fh:
        s = fh.read()

    if 'signingConfigs.release' in s:
        print('Release signing already configured; nothing to do.')
        return 0

    if s.count('    signingConfigs {\n') != 1:
        print('ERROR: expected exactly one signingConfigs block', file=sys.stderr)
        return 1
    s = s.replace('    signingConfigs {\n', '    signingConfigs {\n' + CONFIG_BLOCK, 1)

    if s.count(OLD_RELEASE) != 1:
        print('ERROR: could not find the release buildType signing anchor. '
              'The Expo template probably changed -- update this script.',
              file=sys.stderr)
        return 1
    s = s.replace(OLD_RELEASE, NEW_RELEASE, 1)

    # Guard against the exact bug this script was written to avoid.
    build_types = s[s.index('buildTypes'):]
    if 'debug {\n            signingConfig signingConfigs.debug' not in build_types:
        print('ERROR: debug buildType no longer uses the debug key', file=sys.stderr)
        return 1
    if 'release {\n            signingConfig signingConfigs.release' not in build_types:
        print('ERROR: release buildType is not using the release key', file=sys.stderr)
        return 1

    with open(GRADLE, 'w') as fh:
        fh.write(s)
    print('Release builds will be signed with the supplied keystore.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
