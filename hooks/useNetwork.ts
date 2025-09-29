import { useSyncExternalStore } from "react";

import { networkMonitor } from "@infra/network/NetworkMonitor";

export function useNetwork() {
  const snapshot = useSyncExternalStore(
    (listener) => networkMonitor.subscribe(listener),
    () => networkMonitor.getSnapshot(),
    () => networkMonitor.getSnapshot()
  );
  return snapshot;
}

export function useIsOnline(): boolean {
  return useNetwork().isOnline;
}
