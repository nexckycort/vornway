export const MAIN_VIEW_PATHS = new Set([
  '/',
  '/expenses/friends',
  '/groups',
  '/groups/',
  '/finances',
  '/finances/',
  '/profile',
  '/profile/',
  '/finances/accounts',
  '/finances/accounts/',
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
  let currentSearch = window.location.search;
  let options: BrowserBackNavigationOptions | null = null;

  const handlePopState = (event: PopStateEvent) => {
    if (!options || hasOpenOverlay()) return;

    const isGroupCreationPath = /^\/groups\/new(?:\/|$)/.test(currentPathname);
    const creationSource = new URLSearchParams(currentSearch).get('from');
    const target = isGroupCreationPath
      ? creationSource === 'home'
        ? '/'
        : '/groups'
      : GROUP_DETAIL_PATH.test(currentPathname)
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
    setCurrentPathname(pathname: string, search = '') {
      currentPathname = pathname;
      currentSearch = search;
    },
  };
}
