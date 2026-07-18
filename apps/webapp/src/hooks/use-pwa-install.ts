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
    // Check if we already have a global prompt
    if (globalDeferredPrompt && !deferredPrompt) {
      console.log('Using existing global prompt:', globalDeferredPrompt);
      setDeferredPrompt(globalDeferredPrompt);
      setIsInstallable(true);
    }

    // Debug function to check PWA requirements
    const checkPWARequirements = () => {
      const requirements = {
        manifest: !!document.querySelector('link[rel="manifest"]'),
        serviceWorker: 'serviceWorker' in navigator,
        https:
          location.protocol === 'https:' || location.hostname === 'localhost',
        icons: true, // We'll assume icons are present since we set them
      };

      console.log('PWA Requirements:', requirements);
      const allMet = Object.values(requirements).every(Boolean);
      console.log('All PWA requirements met:', allMet);

      return allMet;
    };

    // Check requirements on load
    checkPWARequirements();
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

    // Handle the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      const event = e as BeforeInstallPromptEvent;
      console.log('beforeinstallprompt event fired!', event);

      // Prevent the browser from displaying the default install dialog
      e.preventDefault();

      // Stash the event so it can be triggered later
      setDeferredPrompt(event);
      setIsInstallable(true);

      console.log('Install prompt deferred, app is installable');
    }; // Handle app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Additional debugging
    console.log('PWA install listeners registered');

    // Check if already prompted before
    const timeoutId = setTimeout(() => {
      if (!deferredPrompt) {
        console.log(
          'No beforeinstallprompt event after 3 seconds. Possible reasons:',
        );
        console.log('1. App is already installed');
        console.log('2. Not served over HTTPS (except localhost)');
        console.log('3. Manifest is invalid or missing required fields');
        console.log('4. Service worker is not registered');
        console.log('5. User has already dismissed the prompt recently');
      }
    }, 3000);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timeoutId);
    };
  }, []); // Empty dependency array is correct here

  const installApp = async (): Promise<{
    success: boolean;
    reason?: 'not-available' | 'dismissed' | 'error';
  }> => {
    // Check both local state and global prompt
    const promptToUse = deferredPrompt || globalDeferredPrompt;

    console.log('Install app called');
    console.log('deferredPrompt:', deferredPrompt);
    console.log('globalDeferredPrompt:', globalDeferredPrompt);
    console.log('promptToUse:', promptToUse);

    if (!promptToUse) {
      console.log('No deferred prompt available, showing instructions');
      return { success: false, reason: 'not-available' };
    }

    try {
      console.log('Calling prompt()...');
      // Show the install dialog
      await promptToUse.prompt();

      // Wait for the user to respond to the prompt
      const choiceResult = await promptToUse.userChoice;
      console.log('User choice:', choiceResult);

      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted install');
        setDeferredPrompt(null);
        setGlobalDeferredPrompt(null);
        setIsInstallable(false);
        return { success: true };
      } else {
        console.log('User dismissed install');
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
