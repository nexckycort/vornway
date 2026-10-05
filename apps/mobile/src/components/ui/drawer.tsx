import {
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

type DrawerSide = 'top' | 'right' | 'bottom' | 'left';
type DrawerViewProps = Omit<ViewProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
};
type DrawerContextValue = { open: boolean; setOpen: (open: boolean) => void };
const DrawerContext = createContext<DrawerContextValue | null>(null);

function useDrawer() {
  return useContext(DrawerContext) ?? { open: false, setOpen: () => undefined };
}
function Drawer({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: PropsWithChildren<{
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}>) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  return (
    <DrawerContext.Provider value={{ open, setOpen }}>
      {children}
    </DrawerContext.Provider>
  );
}
function DrawerTrigger({
  children,
  ...props
}: PropsWithChildren<DrawerViewProps>) {
  const { setOpen } = useDrawer();
  return (
    <Pressable onPress={() => setOpen(true)} {...props}>
      {children}
    </Pressable>
  );
}
function DrawerClose({
  children,
  ...props
}: PropsWithChildren<DrawerViewProps>) {
  const { setOpen } = useDrawer();
  return (
    <Pressable onPress={() => setOpen(false)} {...props}>
      {children}
    </Pressable>
  );
}
function DrawerPortal({ children }: PropsWithChildren) {
  return <>{children}</>;
}
function DrawerOverlay({ onPress }: { onPress?: () => void }) {
  return <Pressable onPress={onPress} style={drawerStyles.overlay} />;
}
function DrawerContent({
  children,
  side = 'bottom',
  style,
  scrollable = false,
  ...props
}: PropsWithChildren<
  DrawerViewProps & { side?: DrawerSide; scrollable?: boolean }
>) {
  const { open, setOpen } = useDrawer();
  return (
    <Modal
      transparent
      visible={open}
      animationType="slide"
      onRequestClose={() => setOpen(false)}
    >
      <View style={[drawerStyles.modal, drawerModalStyles[side]]}>
        <DrawerOverlay onPress={() => setOpen(false)} />
        <View
          style={
            [
              drawerStyles.content,
              drawerSideStyles[side],
              scrollable && drawerStyles.scrollable,
              style,
            ] as never
          }
          {...props}
        >
          {side === 'bottom' && <View style={drawerStyles.handle} />}
          {children}
        </View>
      </View>
    </Modal>
  );
}
function DrawerHeader({ style, ...props }: DrawerViewProps) {
  return <View style={[drawerStyles.header, style] as never} {...props} />;
}
function DrawerFooter({ style, ...props }: DrawerViewProps) {
  return <View style={[drawerStyles.footer, style] as never} {...props} />;
}
function DrawerTitle({ style, ...props }: React.ComponentProps<typeof Text>) {
  return <Text style={[drawerStyles.title, style] as never} {...props} />;
}
function DrawerDescription({
  style,
  ...props
}: React.ComponentProps<typeof Text>) {
  return <Text style={[drawerStyles.description, style] as never} {...props} />;
}

const drawerModalStyles = StyleSheet.create({
  top: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-start' },
  bottom: { justifyContent: 'flex-end' },
  left: { justifyContent: 'flex-start' },
});
const drawerSideStyles = StyleSheet.create({
  top: {
    alignSelf: 'stretch',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    maxHeight: '84%',
    paddingTop: 12,
  },
  right: {
    alignSelf: 'flex-end',
    borderBottomLeftRadius: 20,
    borderTopLeftRadius: 20,
    height: '100%',
    maxWidth: '88%',
    width: 360,
  },
  bottom: {
    alignSelf: 'stretch',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '84%',
    paddingTop: 12,
  },
  left: {
    alignSelf: 'flex-start',
    borderBottomRightRadius: 20,
    borderTopRightRadius: 20,
    height: '100%',
    maxWidth: '88%',
    width: 360,
  },
});
const drawerStyles = StyleSheet.create({
  modal: { flex: 1 },
  overlay: { backgroundColor: 'rgba(0,0,0,0.15)', flex: 1 },
  content: { backgroundColor: '#FFFFFF', padding: 20 },
  scrollable: { overflow: 'scroll' },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#CBD5E1',
    borderRadius: 999,
    height: 6,
    marginBottom: 12,
    width: 88,
  },
  header: { gap: 6, marginBottom: 16 },
  footer: { gap: 8, marginTop: 20 },
  title: { color: '#17212B', fontSize: 16, fontWeight: '600' },
  description: { color: '#68737D', fontSize: 14 },
});

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
