// Local notification for the quest timer. Nothing here talks to a server:
// expo-notifications schedules on the device itself, so this stays free and
// works offline like the rest of the app.
//
// Every call is best-effort. A denied permission, an unsupported platform or a
// missing native module must never break a workout, so failures are swallowed
// and the in-app countdown remains the source of truth.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/** Show the banner even if the app happens to be open when it fires. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let asked = false;
let channelReady = false;

/**
 * Android 8+ drops notifications that reference a channel that doesn't exist,
 * so the channel has to be created before anything is scheduled against it.
 */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  try {
    await Notifications.setNotificationChannelAsync('quest-timer', {
      name: 'Quest timers',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
    channelReady = true;
  } catch {
    /* channel creation failed; scheduling falls back to the default channel */
  }
}

/**
 * Ask once per app run. Returns false on web and on refusal, in which case the
 * caller just skips scheduling -- the timer itself still works.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    // Don't nag: if they said no, respect it for the rest of the run.
    if (!current.canAskAgain || asked) return false;
    asked = true;
    const next = await Notifications.requestPermissionsAsync();
    return next.granted;
  } catch {
    return false;
  }
}

/**
 * Fire a notification `seconds` from now. Returns the id so it can be pulled
 * back if the player pauses or cancels, or null if scheduling wasn't possible.
 */
export async function scheduleQuestDone(title: string, seconds: number): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!(seconds > 0)) return null; // already finished; nothing to schedule
  if (!(await ensureNotificationPermission())) return null;
  await ensureChannel();
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Quest complete',
        body: `${title} — time's up. Claim your reward.`,
        sound: true,
      },
      trigger: { seconds: Math.ceil(seconds), channelId: 'quest-timer' },
    });
  } catch {
    return null;
  }
}

/** Pull a scheduled notification back. Safe to call with a stale or null id. */
export async function cancelScheduled(id: string | null | undefined): Promise<void> {
  if (!id || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* already fired or already gone */
  }
}
