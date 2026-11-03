import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

export type PushNotificationStatus =
  | 'unsupported'
  | 'permission-required'
  | 'enabled'
  | 'blocked';

function isNativePushSupported() {
  return Platform.OS !== 'web' && Device.isDevice;
}

function getProjectId() {
  return Constants.expoConfig?.extra?.eas?.projectId;
}

async function getExpoToken() {
  const projectId = getProjectId();
  const result = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  return result.data;
}

export async function getPushNotificationStatus(): Promise<PushNotificationStatus> {
  if (!isNativePushSupported()) return 'unsupported';

  const permission = await Notifications.getPermissionsAsync();
  if (permission.status === Notifications.PermissionStatus.DENIED) {
    return 'blocked';
  }

  return permission.granted ? 'enabled' : 'permission-required';
}

export async function enablePushNotifications(): Promise<PushNotificationStatus> {
  if (!isNativePushSupported()) return 'unsupported';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Vornway',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    permission = await Notifications.requestPermissionsAsync();
  }

  if (permission.status === Notifications.PermissionStatus.DENIED) {
    return 'blocked';
  }
  if (!permission.granted) return 'permission-required';

  const token = await getExpoToken();
  await api.push.subscribeNative.request({
    payload: {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    },
  });

  try {
    await api.push.test.request();
  } catch (error) {
    // Registration succeeded; a test delivery must not make the toggle fail.
    console.warn('Push test notification failed:', error);
  }

  return 'enabled';
}

export async function disablePushNotifications(): Promise<PushNotificationStatus> {
  if (!isNativePushSupported()) return 'unsupported';

  const token = await getExpoToken();
  await api.push.unsubscribeNative.request({ payload: { token } });
  return 'permission-required';
}
