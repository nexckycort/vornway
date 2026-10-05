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

type SheetSide = 'top' | 'right' | 'bottom' | 'left';
type SheetViewProps = Omit<ViewProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
};
type SheetContextValue = { open: boolean; setOpen: (open: boolean) => void };
const SheetContext = createContext<SheetContextValue | null>(null);

function useSheet() {
  return useContext(SheetContext) ?? { open: false, setOpen: () => undefined };
}
function Sheet({
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
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}
function SheetTrigger({
  children,
  ...props
}: PropsWithChildren<SheetViewProps>) {
  const { setOpen } = useSheet();
  return (
    <Pressable onPress={() => setOpen(true)} {...props}>
      {children}
    </Pressable>
  );
}
function SheetClose({ children, ...props }: PropsWithChildren<SheetViewProps>) {
  const { setOpen } = useSheet();
  return (
    <Pressable onPress={() => setOpen(false)} {...props}>
      {children}
    </Pressable>
  );
}
function SheetPortal({ children }: PropsWithChildren) {
  return <>{children}</>;
}
function SheetOverlay({ onPress }: { onPress?: () => void }) {
  return <Pressable onPress={onPress} style={sheetStyles.overlay} />;
}
function SheetContent({
  children,
  side = 'right',
  style,
  showCloseButton = true,
  ...props
}: PropsWithChildren<
  SheetViewProps & { side?: SheetSide; showCloseButton?: boolean }
>) {
  const { open, setOpen } = useSheet();
  return (
    <Modal
      transparent
      visible={open}
      animationType="slide"
      onRequestClose={() => setOpen(false)}
    >
      <View style={[sheetStyles.modal, sheetModalStyles[side]]}>
        <SheetOverlay onPress={() => setOpen(false)} />
        <View
          style={[sheetStyles.content, sheetSideStyles[side], style] as never}
          {...props}
        >
          {showCloseButton && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => setOpen(false)}
              style={sheetStyles.close}
            >
              <Text style={sheetStyles.closeText}>×</Text>
            </Pressable>
          )}
          {children}
        </View>
      </View>
    </Modal>
  );
}
function SheetHeader({ style, ...props }: SheetViewProps) {
  return <View style={[sheetStyles.header, style] as never} {...props} />;
}
function SheetFooter({ style, ...props }: SheetViewProps) {
  return <View style={[sheetStyles.footer, style] as never} {...props} />;
}
function SheetTitle({ style, ...props }: React.ComponentProps<typeof Text>) {
  return <Text style={[sheetStyles.title, style] as never} {...props} />;
}
function SheetDescription({
  style,
  ...props
}: React.ComponentProps<typeof Text>) {
  return <Text style={[sheetStyles.description, style] as never} {...props} />;
}

const sheetModalStyles = StyleSheet.create({
  top: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-start' },
  bottom: { justifyContent: 'flex-end' },
  left: { justifyContent: 'flex-start' },
});
const sheetSideStyles = StyleSheet.create({
  top: {
    alignSelf: 'stretch',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    maxHeight: '85%',
  },
  right: {
    alignSelf: 'flex-end',
    borderBottomLeftRadius: 16,
    borderTopLeftRadius: 16,
    height: '100%',
    maxWidth: '88%',
    width: 360,
  },
  bottom: {
    alignSelf: 'stretch',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
  },
  left: {
    alignSelf: 'flex-start',
    borderBottomRightRadius: 16,
    borderTopRightRadius: 16,
    height: '100%',
    maxWidth: '88%',
    width: 360,
  },
});
const sheetStyles = StyleSheet.create({
  modal: { flex: 1 },
  overlay: { backgroundColor: 'rgba(0,0,0,0.55)', flex: 1 },
  content: { backgroundColor: '#FFFFFF', padding: 24 },
  close: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    top: 12,
    width: 32,
  },
  closeText: {
    color: '#68737D',
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 28,
  },
  header: { gap: 6, marginBottom: 16 },
  footer: { gap: 8, marginTop: 20 },
  title: { color: '#17212B', fontSize: 16, fontWeight: '500' },
  description: { color: '#68737D', fontSize: 14 },
});

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
