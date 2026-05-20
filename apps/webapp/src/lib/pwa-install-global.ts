interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    const event = e as BeforeInstallPromptEvent;
    // console.debug('Global beforeinstallprompt captured:', event);
    e.preventDefault();
    globalDeferredPrompt = event;
  });
}

export { globalDeferredPrompt };
export const setGlobalDeferredPrompt = (
  prompt: BeforeInstallPromptEvent | null,
) => {
  globalDeferredPrompt = prompt;
};
export const clearGlobalDeferredPrompt = () => {
  globalDeferredPrompt = null;
};
