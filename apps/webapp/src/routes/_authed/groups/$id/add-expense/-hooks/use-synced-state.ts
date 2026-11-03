import { type Dispatch, type SetStateAction, useState } from 'react';

export function useSyncedState<S>(
  deps: readonly unknown[],
  init: () => S,
  sync: (current: S) => S,
): [S, Dispatch<SetStateAction<S>>] {
  const [state, setState] = useState(init);
  const [previousDeps, setPreviousDeps] = useState(deps);

  if (deps.some((dep, index) => !Object.is(dep, previousDeps[index]))) {
    setPreviousDeps(deps);
    setState(sync);
  }

  return [state, setState];
}
