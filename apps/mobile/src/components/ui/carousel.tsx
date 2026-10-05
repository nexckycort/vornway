import {
  createContext,
  type PropsWithChildren,
  useContext,
  useRef,
} from 'react';
import {
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  View,
} from 'react-native';

type CarouselContextValue = {
  next: () => void;
  previous: () => void;
  canNext: boolean;
  canPrevious: boolean;
};
const CarouselContext = createContext<CarouselContextValue | null>(null);
function useCarousel() {
  const context = useContext(CarouselContext);
  if (!context) throw new Error('useCarousel must be used within Carousel');
  return context;
}
function Carousel({
  children,
  orientation = 'horizontal',
}: PropsWithChildren<{ orientation?: 'horizontal' | 'vertical' }>) {
  const ref = useRef<ScrollViewInstance>(null);
  return (
    <CarouselContext.Provider
      value={{
        next: () => ref.current?.scrollTo({ x: 320, animated: true }),
        previous: () => ref.current?.scrollTo({ x: 0, animated: true }),
        canNext: true,
        canPrevious: true,
      }}
    >
      <ScrollView
        ref={ref}
        horizontal={orientation === 'horizontal'}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
    </CarouselContext.Provider>
  );
}
function CarouselContent({ children }: PropsWithChildren) {
  return <View style={styles.content}>{children}</View>;
}
function CarouselItem({ children }: PropsWithChildren) {
  return <View style={styles.item}>{children}</View>;
}
function CarouselPrevious({ children = '‹' }: PropsWithChildren) {
  const { previous } = useCarousel();
  return (
    <Pressable onPress={previous} style={styles.control}>
      <View>{children}</View>
    </Pressable>
  );
}
function CarouselNext({ children = '›' }: PropsWithChildren) {
  const { next } = useCarousel();
  return (
    <Pressable onPress={next} style={styles.control}>
      <View>{children}</View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  content: { alignItems: 'stretch', flexDirection: 'row', gap: 12 },
  item: { flexBasis: '100%' },
  control: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    elevation: 2,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
};
