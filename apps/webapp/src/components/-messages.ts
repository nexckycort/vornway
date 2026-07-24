import { m } from '#/paraglide/messages.js';

export function getSharedComponentMessages() {
  return {
    common: {
      back: m['common.back'](),
      close: m['common.close'](),
      retry: m['common.retry'](),
      updateApp: m['common.updateApp'](),
      updating: m['common.updating'](),
    },
    mobilePageLayout: {
      backAria: m['components.mobilePageLayout.backAria'](),
    },
    network: {
      offline: m['components.network.offline'](),
    },
    native: {
      pullToRefresh: m['components.native.pullToRefresh'](),
      refreshing: m['components.native.refreshing'](),
      syncingChanges: (count: number) =>
        m['components.native.syncingChanges']({ count }),
      installTitle: m['components.native.installTitle'](),
      installCopy: m['components.native.installCopy'](),
      installAction: m['components.native.installAction'](),
      dismissInstall: m['components.native.dismissInstall'](),
    },
    fullscreenLoader: {
      title: m['components.fullscreenLoader.title'](),
      copy: m['components.fullscreenLoader.copy'](),
    },
    updateBanner: {
      update: m['components.updateBanner.update'](),
      updating: m['components.updateBanner.updating'](),
    },
  };
}
