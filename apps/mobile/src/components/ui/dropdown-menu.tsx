import {
  type ComponentProps,
  createContext,
  type PropsWithChildren,
  useContext,
  useState,
} from 'react';
import {
  Modal,
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

const MenuContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);
const useMenu = () =>
  useContext(MenuContext) ?? { open: false, setOpen: () => undefined };

function DropdownMenu({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  return (
    <MenuContext.Provider value={{ open, setOpen }}>
      {children}
    </MenuContext.Provider>
  );
}
function DropdownMenuTrigger({
  children,
  ...props
}: PropsWithChildren<NativeViewProps>) {
  const { setOpen } = useMenu();
  return (
    <Pressable onPress={() => setOpen(true)} {...props}>
      {children}
    </Pressable>
  );
}
function DropdownMenuContent({
  children,
  style,
  ...props
}: PropsWithChildren<NativeViewProps>) {
  const { open, setOpen } = useMenu();
  return (
    <Modal transparent visible={open} onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
        <View style={[styles.content, style] as never} {...props}>
          {children}
        </View>
      </Pressable>
    </Modal>
  );
}
function DropdownMenuItem({
  children,
  onPress,
  style,
  ...props
}: PropsWithChildren<NativeViewProps & { onPress?: () => void }>) {
  const { setOpen } = useMenu();
  return (
    <Pressable
      onPress={() => {
        onPress?.();
        setOpen(false);
      }}
      style={({ pressed }) => [
        styles.item,
        pressed && styles.pressed,
        style as StyleProp<ViewStyle>,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}
function DropdownMenuLabel({ style, ...props }: ComponentProps<typeof Text>) {
  return <Text style={[styles.label, style] as never} {...props} />;
}
function DropdownMenuSeparator(props: ViewProps) {
  return <View style={styles.separator} {...props} />;
}
function DropdownMenuGroup({
  children,
  ...props
}: PropsWithChildren<ViewProps>) {
  return <View {...props}>{children}</View>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  content: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    elevation: 4,
    margin: 24,
    padding: 6,
  },
  item: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  pressed: { backgroundColor: '#F1F5F9' },
  label: { color: '#17212B', fontSize: 13, fontWeight: '600', padding: 8 },
  separator: {
    backgroundColor: '#E5E7EB',
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
});

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
