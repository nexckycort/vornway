import { useState } from 'react';

export function useWhenChanged(deps: readonly unknown[], onChange: () => void) {
  const [previous, setPrevious] = useState<readonly unknown[] | null>(null);
  if (previous?.every((value, index) => Object.is(value, deps[index]))) return;

  setPrevious(deps);
  onChange();
}
