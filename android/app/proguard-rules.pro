# FORGE ProGuard rules
# Obfuscates + shrinks the release build. Keep React Native / libraries' entry points.

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo modules
-keep class expo.modules.** { *; }
-keep class com.swmansion.reanimated.** { *; }

# Navigation
-keep class com.reactnativenavigation.** { *; }

# Don't strip debug metadata we might need for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep our native modules referenced by name
-keep class com.forge.fitness.** { *; }

# Keep your app's main classes
-keep class * extends android.app.Activity
-keep class * extends android.app.Application

# Play Integrity
-keep class com.google.android.play.core.integrity.** { *; }
