import { BlurView } from 'expo-blur';
import { type ReactNode, useEffect, useState } from 'react';
import { Modal, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable, View } from '@/tw';

type BottomDrawerProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  blurIntensity?: number;
};

export function BottomDrawer({
  visible,
  onClose,
  children,
  blurIntensity = 40,
}: BottomDrawerProps) {
  const insets = useSafeAreaInsets();
  const [isMounted, setIsMounted] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      dragY.value = 0;
      progress.value = withTiming(1, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    progress.value = withTiming(
      0,
      {
        duration: 220,
        easing: Easing.inOut(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          dragY.value = 0;
          runOnJS(setIsMounted)(false);
        }
      },
    );
  }, [visible, dragY, progress]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity:
      interpolate(progress.value, [0, 1], [0, 1]) *
      interpolate(dragY.value, [0, 220], [1, 0.45], Extrapolation.CLAMP),
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.7, 1]),
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [52, 0]) + dragY.value,
      },
      {
        scale: interpolate(progress.value, [0, 1], [0.98, 1]),
      },
    ],
  }));

  const requestClose = () => {
    onClose();
  };

  const handlePanGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        dragY.value = event.translationY;
      } else {
        dragY.value = 0;
      }
    })
    .onEnd((event) => {
      const shouldClose = dragY.value > 120 || event.velocityY > 900;
      if (shouldClose) {
        runOnJS(requestClose)();
        return;
      }
      dragY.value = withTiming(0, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
    });

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={isMounted}
      animationType="none"
      onRequestClose={requestClose}
    >
      <Pressable onPress={requestClose} className="flex-1 justify-end">
        <Animated.View
          style={[StyleSheet.absoluteFillObject, backdropAnimatedStyle]}
        >
          <BlurView
            intensity={blurIntensity}
            tint="dark"
            style={StyleSheet.absoluteFillObject}
          />
          <View className="flex-1 bg-black/10" />
        </Animated.View>

        <Animated.View style={sheetAnimatedStyle}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="rounded-t-3xl bg-white px-5 pt-3"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <GestureDetector gesture={handlePanGesture}>
              <View className="mb-4 items-center py-2">
                <View className="h-1.5 w-12 rounded-full bg-slate-300" />
              </View>
            </GestureDetector>

            {children}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
