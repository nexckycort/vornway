import type { ComponentProps, ReactNode } from 'react';
import {
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

type NativeViewProps = Omit<ViewProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
};

function Pagination({ style, ...props }: NativeViewProps) {
  return (
    <View
      accessibilityRole="adjustable"
      style={[styles.pagination, style] as never}
      {...props}
    />
  );
}
function PaginationContent({ style, ...props }: NativeViewProps) {
  return <View style={[styles.content, style] as never} {...props} />;
}
function PaginationItem({ style, ...props }: NativeViewProps) {
  return <View style={[styles.item, style] as never} {...props} />;
}
function PaginationLink({
  children,
  isActive,
  onPress,
  style,
  ...props
}: NativeViewProps & {
  isActive?: boolean;
  onPress?: () => void;
  children?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.link, isActive && styles.active, style] as never}
      {...props}
    >
      <Text style={[styles.text, isActive && styles.activeText] as never}>
        {children}
      </Text>
    </Pressable>
  );
}
function PaginationPrevious(
  props: Omit<ComponentProps<typeof PaginationLink>, 'children'>,
) {
  return (
    <PaginationLink accessibilityLabel="Previous page" {...props}>
      ‹
    </PaginationLink>
  );
}
function PaginationNext(
  props: Omit<ComponentProps<typeof PaginationLink>, 'children'>,
) {
  return (
    <PaginationLink accessibilityLabel="Next page" {...props}>
      ›
    </PaginationLink>
  );
}
function PaginationEllipsis(_props: ViewProps) {
  return (
    <Text accessibilityLabel="More pages" style={styles.ellipsis}>
      …
    </Text>
  );
}
const styles = StyleSheet.create({
  pagination: { alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  item: {},
  link: {
    alignItems: 'center',
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    minWidth: 36,
    paddingHorizontal: 10,
  },
  active: { backgroundColor: '#1479F8', borderColor: '#1479F8' },
  text: { color: '#17212B', fontSize: 14 },
  activeText: { color: '#FFFFFF', fontWeight: '700' },
  ellipsis: { color: '#68737D', fontSize: 20, paddingHorizontal: 6 },
});

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
