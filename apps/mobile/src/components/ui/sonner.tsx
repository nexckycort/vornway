import { useEffect } from 'react';
import { Platform, ToastAndroid } from 'react-native';

function Toaster() {
  return null;
}
function toast(message: string) {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
}
function useToast() {
  useEffect(() => undefined, []);
  return { toast };
}

export { Toaster, toast, useToast };
