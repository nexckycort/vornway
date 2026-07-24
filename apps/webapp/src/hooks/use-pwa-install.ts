import { useEffect, useState } from 'react';
import {
  globalDeferredPrompt,
  setGlobalDeferredPrompt,
} from '#/lib/pwa-install-global';
import { m } from '#/paraglide/messages.js';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstallable, setIsInstallable] = useState(!!globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (globalDeferredPrompt && !deferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
      setIsInstallable(true);
    }

    // Check if app is already installed
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia(
        '(display-mode: standalone)',
      ).matches;
      const isFullscreen = window.matchMedia(
        '(display-mode: fullscreen)',
      ).matches;
      const isMinimalUI = window.matchMedia(
        '(display-mode: minimal-ui)',
      ).matches;

      // Check if launched from home screen (iOS Safari)
      const isIOSInstalled =
        'standalone' in window.navigator &&
        (window.navigator as Navigator & { standalone?: boolean })
          .standalone === true;

      return isStandalone || isFullscreen || isMinimalUI || isIOSInstalled;
    };

    setIsInstalled(checkIfInstalled());

    const handleBeforeInstallPrompt = (e: Event) => {
      const event = e as BeforeInstallPromptEvent;
      e.preventDefault();
      setDeferredPrompt(event);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []); // Empty dependency array is correct here

  const installApp = async (): Promise<{
    success: boolean;
    reason?: 'not-available' | 'dismissed' | 'error';
  }> => {
    const promptToUse = deferredPrompt || globalDeferredPrompt;

    if (!promptToUse) {
      return { success: false, reason: 'not-available' };
    }

    try {
      await promptToUse.prompt();
      const choiceResult = await promptToUse.userChoice;

      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        setGlobalDeferredPrompt(null);
        setIsInstallable(false);
        return { success: true };
      } else {
        return { success: false, reason: 'dismissed' };
      }
    } catch (error) {
      console.error('Error during app installation:', error);
      return { success: false, reason: 'error' };
    }
  };
  const getInstallInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return {
        title: m['profile.installIosTitle'](),
        steps: [
          m['profile.installIosShare'](),
          m['profile.installIosAddHome'](),
          m['profile.installIosConfirm'](),
        ],
      };
    } else if (userAgent.includes('android')) {
      return {
        title: m['profile.installAndroidTitle'](),
        steps: [
          m['profile.installAndroidMenu'](),
          m['profile.installAndroidAdd'](),
          m['profile.installAndroidConfirm'](),
        ],
      };
    } else {
      return {
        title: m['profile.installDesktopTitle'](),
        steps: [
          m['profile.installDesktopIcon'](),
          m['profile.installDesktopClick'](),
          m['profile.installDesktopMenu'](),
        ],
      };
    }
  };

  const isCompatibleBrowser = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    return (
      userAgent.includes('chrome') ||
      userAgent.includes('edge') ||
      userAgent.includes('opera') ||
      userAgent.includes('samsung')
    );
  };

  return {
    isInstallable,
    isInstalled,
    installApp,
    getInstallInstructions,
    isCompatibleBrowser,
  };
}
