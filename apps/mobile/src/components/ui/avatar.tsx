import * as React from 'react';
import {
  Image,
  type ImageProps,
  type StyleProp,
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

type AvatarSize = 'default' | 'sm' | 'lg';

type AvatarContextValue = {
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
};

const AvatarContext = React.createContext<AvatarContextValue | undefined>(
  undefined,
);

function Avatar({
  size = 'default',
  style,
  ...props
}: ViewProps & { size?: AvatarSize }) {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const contextValue = React.useMemo(
    () => ({ imageLoaded, setImageLoaded }),
    [imageLoaded],
  );

  return (
    <AvatarContext.Provider value={contextValue}>
      <View style={[styles.avatar, sizeStyles[size], style]} {...props} />
    </AvatarContext.Provider>
  );
}

function AvatarImage({ onLoad, onError, style, ...props }: ImageProps) {
  const avatar = React.useContext(AvatarContext);

  return (
    <Image
      resizeMode="cover"
      style={[styles.image, style]}
      onLoad={(event) => {
        onLoad?.(event);
        avatar?.setImageLoaded(true);
      }}
      onError={(event) => {
        onError?.(event);
        avatar?.setImageLoaded(false);
      }}
      {...props}
    />
  );
}

function AvatarFallback({ style, ...props }: TextProps) {
  const avatar = React.useContext(AvatarContext);

  if (avatar?.imageLoaded) return null;

  return <Text style={[styles.fallback, style]} {...props} />;
}

function AvatarBadge({
  size = 'default',
  style,
  ...props
}: ViewProps & { size?: AvatarSize }) {
  return (
    <View style={[styles.badge, badgeSizeStyles[size], style]} {...props} />
  );
}

function AvatarGroup({ children, style, ...props }: ViewProps) {
  const childrenWithOverlap = React.Children.map(children, (child, index) => {
    if (!React.isValidElement<{ style?: StyleProp<ViewStyle> }>(child)) {
      return child;
    }

    return React.cloneElement(child, {
      style: [child.props.style, index > 0 && styles.groupOverlap],
    });
  });

  return (
    <View style={[styles.group, style]} {...props}>
      {childrenWithOverlap}
    </View>
  );
}

function AvatarGroupCount({
  size = 'default',
  style,
  ...props
}: TextProps & { size?: AvatarSize }) {
  return (
    <Text style={[styles.groupCount, sizeStyles[size], style]} {...props} />
  );
}

const badgeSizeStyles = StyleSheet.create({
  sm: { height: 8, width: 8 },
  default: { height: 10, width: 10 },
  lg: { height: 12, width: 12 },
});

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  small: { height: 24, width: 24 },
  default: { height: 32, width: 32 },
  large: { height: 40, width: 40 },
  image: { height: '100%', width: '100%' },
  fallback: {
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    color: '#525A65',
    fontSize: 14,
    height: '100%',
    textAlign: 'center',
    textAlignVertical: 'center',
    width: '100%',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 2,
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    zIndex: 1,
  },
  group: { alignItems: 'center', flexDirection: 'row' },
  groupOverlap: { marginLeft: -8 },
  groupCount: {
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 2,
    color: '#525A65',
    fontSize: 14,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});

const sizeStyles = {
  sm: styles.small,
  default: styles.default,
  lg: styles.large,
} satisfies Record<AvatarSize, object>;

export {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
};
