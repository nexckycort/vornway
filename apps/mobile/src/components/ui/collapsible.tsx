import {
  createContext,
  type PropsWithChildren,
  useContext,
  useState,
} from 'react';
import {
  Pressable,
  type PressableProps,
  View,
  type ViewProps,
} from 'react-native';

type CollapsibleContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

function useCollapsibleContext() {
  const context = useContext(CollapsibleContext);
  if (!context) {
    throw new Error('Collapsible parts must be used inside Collapsible');
  }
  return context;
}

function Collapsible({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  ...props
}: PropsWithChildren<
  ViewProps & {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  return (
    <CollapsibleContext.Provider value={{ open, setOpen }}>
      <View {...props}>{children}</View>
    </CollapsibleContext.Provider>
  );
}

function CollapsibleTrigger({ onPress, ...props }: PressableProps) {
  const { open, setOpen } = useCollapsibleContext();
  return (
    <Pressable
      {...props}
      accessibilityState={{ ...props.accessibilityState, expanded: open }}
      onPress={(event) => {
        setOpen(!open);
        onPress?.(event);
      }}
    />
  );
}

function CollapsibleContent({
  children,
  ...props
}: PropsWithChildren<ViewProps>) {
  const { open } = useCollapsibleContext();
  if (!open) return null;
  return <View {...props}>{children}</View>;
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
