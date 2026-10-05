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

type DialogContextValue = { open: boolean; setOpen: (open: boolean) => void };
const DialogContext = createContext<DialogContextValue | null>(null);
const useDialog = () =>
  useContext(DialogContext) ?? { open: false, setOpen: () => undefined };

function Dialog({
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
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

function DialogTrigger({
  children,
  ...props
}: PropsWithChildren<NativeViewProps>) {
  const { setOpen } = useDialog();
  return (
    <Pressable onPress={() => setOpen(true)} {...props}>
      {children}
    </Pressable>
  );
}

function DialogClose({
  children,
  ...props
}: PropsWithChildren<NativeViewProps>) {
  const { setOpen } = useDialog();
  return (
    <Pressable onPress={() => setOpen(false)} {...props}>
      {children}
    </Pressable>
  );
}

function DialogContent({
  children,
  style,
  ...props
}: PropsWithChildren<NativeViewProps>) {
  const { open, setOpen } = useDialog();
  return (
    <Modal
      transparent
      visible={open}
      animationType="fade"
      onRequestClose={() => setOpen(false)}
    >
      <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
        <View style={[styles.content, style] as never} {...props}>
          <Pressable onPress={(event) => event.stopPropagation()}>
            {children}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

function DialogHeader({ style, ...props }: NativeViewProps) {
  return <View style={[styles.header, style] as never} {...props} />;
}
function DialogFooter({ style, ...props }: NativeViewProps) {
  return <View style={[styles.footer, style] as never} {...props} />;
}
function DialogTitle({ style, ...props }: ComponentProps<typeof Text>) {
  return <Text style={[styles.title, style] as never} {...props} />;
}
function DialogDescription({ style, ...props }: ComponentProps<typeof Text>) {
  return <Text style={[styles.description, style] as never} {...props} />;
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxWidth: 520,
    padding: 20,
    width: '100%',
  },
  header: { gap: 6, marginBottom: 16 },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  title: { color: '#17212B', fontSize: 18, fontWeight: '700' },
  description: { color: '#68737D', fontSize: 14 },
});

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
