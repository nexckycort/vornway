import { useLocation, useNavigate } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';

export const GROUP_FLOW_FALLBACK = '/groups';

export type GroupFlowState = {
  returnTo?: string;
};

type LocationLike = {
  href?: string;
  pathname: string;
  search?: string | Record<string, unknown>;
  hash?: string;
};

export function getLocationHref(location: LocationLike) {
  if (location.href) return location.href;
  const search = typeof location.search === 'string' ? location.search : '';
  return `${location.pathname}${search}${location.hash ?? ''}`;
}

export function getGroupFlowReturnTo(
  state: GroupFlowState | undefined,
  groupId?: string,
) {
  const returnTo = state?.returnTo;
  if (!returnTo?.startsWith('/')) return undefined;
  if (groupId && isGroupFlowPath(returnTo, groupId)) return undefined;
  return returnTo;
}

export function getGroupFlowEntryState(returnTo: string): never {
  return { returnTo } as never;
}

export function keepGroupFlowState(returnTo: string) {
  return ((state: object): GroupFlowState => ({
    ...state,
    returnTo,
  })) as never;
}

export function useGroupFlowNavigation(groupId: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo =
    getGroupFlowReturnTo(location.state as GroupFlowState, groupId) ??
    GROUP_FLOW_FALLBACK;
  const flowState = useMemo(() => keepGroupFlowState(returnTo), [returnTo]);

  const navigateToFlowBack = useCallback(
    () =>
      navigate({
        to: returnTo,
        replace: true,
      } as never),
    [navigate, returnTo],
  );

  const navigateToGroupRoot = useCallback(
    (replace = true) =>
      navigate({
        to: '/groups/$id',
        params: { id: groupId },
        replace,
        state: flowState,
      }),
    [flowState, groupId, navigate],
  );

  return {
    flowState,
    navigateToFlowBack,
    navigateToGroupRoot,
    returnTo,
  };
}

function isGroupFlowPath(path: string, groupId: string) {
  const groupRoot = `/groups/${groupId}`;
  return path === groupRoot || path.startsWith(`${groupRoot}/`);
}
