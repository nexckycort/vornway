export const MAIN_VIEW_PATHS = new Set([
  '/',
  '/expenses/friends',
  '/groups',
  '/groups/',
  '/goals',
  '/goals/',
  '/profile',
  '/profile/',
]);

type BrowserBackNavigationOptions = {
  getGroupReturnTo: () => string | undefined;
  navigate: (to: string) => void;
};

const GROUP_DETAIL_PATH = /^\/groups\/[^/]+\/?$/;

function hasOpenOverlay() {
  return Boolean(
    document.querySelector(
      '[data-slot="drawer-content"], [data-slot="dialog-content"]',
    ),
  );
}

export function installBrowserBackNavigation() {
  let currentPathname = window.location.pathname;
  let options: BrowserBackNavigationOptions | null = null;

  const handlePopState = (event: PopStateEvent) => {
    if (!options || hasOpenOverlay()) return;

    const target = GROUP_DETAIL_PATH.test(currentPathname)
      ? (options.getGroupReturnTo() ?? '/groups')
      : MAIN_VIEW_PATHS.has(currentPathname) && currentPathname !== '/'
        ? '/'
        : null;

    if (!target) return;

    event.stopImmediatePropagation();
    queueMicrotask(() => options?.navigate(target));
  };

  window.addEventListener('popstate', handlePopState, { capture: true });

  return {
    configure(nextOptions: BrowserBackNavigationOptions) {
      options = nextOptions;
    },
    setCurrentPathname(pathname: string) {
      currentPathname = pathname;
    },
  };
}
