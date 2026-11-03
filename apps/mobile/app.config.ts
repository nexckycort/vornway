import type { ExpoConfig } from 'expo/config';
import { loadRepoEnv } from './scripts/load-repo-env.ts';

const EAS_PROJECT_ID = 'e542d974-339e-4cb5-8ff3-25b832567759';

type AppVariant = 'development' | 'preview' | 'production';

const repoEnv = loadRepoEnv();
Object.assign(process.env, repoEnv);

const APP_VARIANT = resolveAppVariant(repoEnv.APP_VARIANT);

const runtimeVersionPolicy =
  process.env.MOBILE_VERSION_POLICY ??
  (APP_VARIANT === 'development' ? 'appVersion' : 'fingerprint');

const VARIANT_CONFIG = {
  development: {
    appName: 'Vornway Dev',
    bundleIdentifier: 'com.vornway.app.dev',
  },
  preview: {
    appName: 'Vornway Preview',
    bundleIdentifier: 'com.vornway.app.preview',
  },
  production: {
    appName: 'Vornway',
    bundleIdentifier: 'com.vornway.app',
  },
} as const;

function resolveAppVariant(value: string | undefined): AppVariant {
  switch (value) {
    case 'development':
    case 'preview':
    case 'production':
      return value;
    default:
      return 'production';
  }
}

const variant = VARIANT_CONFIG[APP_VARIANT];

const extra = {
  appVariant: APP_VARIANT,
  apiUrl: repoEnv.EXPO_PUBLIC_API_URL,
  eas: {
    projectId: EAS_PROJECT_ID,
  },
};

export type AppExtra = typeof extra;

const config: ExpoConfig = {
  name: variant.appName,
  slug: 'vornway',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'vornway',
  userInterfaceStyle: 'automatic',
  runtimeVersion: {
    // Fingerprint is slow per dev launch; preview/production keep it so OTAs match the native project.
    policy: runtimeVersionPolicy,
  },
  updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
  ios: {
    bundleIdentifier: variant.bundleIdentifier,
    icon: './assets/expo.icon',
  },
  android: {
    package: variant.bundleIdentifier,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    '@react-native-vector-icons/ionicons',
    'expo-camera',
    'expo-notifications',
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  extra,
  owner: 'vornway',
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
