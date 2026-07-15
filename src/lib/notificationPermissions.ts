/**
 * notificationPermissions — thin wrappers around expo-notifications'
 * permission calls. Unlike photoCapture's ensurePermission (a one-shot
 * action that alerts on denial), this is a persistent settings screen: it
 * owns and displays its own banner, so these functions just report status
 * rather than showing an Alert themselves.
 */
import * as Notifications from 'expo-notifications';

export function getPermissionStatus(): Promise<Notifications.NotificationPermissionsStatus> {
  return Notifications.getPermissionsAsync();
}

export function requestNotificationPermission(): Promise<Notifications.NotificationPermissionsStatus> {
  return Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
}
