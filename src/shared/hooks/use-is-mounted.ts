'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => undefined;
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
}
