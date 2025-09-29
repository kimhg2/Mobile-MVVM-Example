import { Platform } from "react-native";

export type NetworkSnapshot = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  isOnline: boolean;
  lastUpdated: number;
};

type Listener = (snapshot: NetworkSnapshot) => void;

const DEFAULT_SNAPSHOT: NetworkSnapshot = {
  isConnected: true,
  isInternetReachable: true,
  type: "unknown",
  isOnline: true,
  lastUpdated: Date.now(),
};

const PING_URL = "https://www.gstatic.com/generate_204"; // lightweight connectivity check
const POLL_INTERVAL_MS = 20_000;
const PING_TIMEOUT_MS = 5_000;

class NetworkMonitorImpl {
  private snapshot: NetworkSnapshot = DEFAULT_SNAPSHOT;
  private listeners = new Set<Listener>();
  private initPromise: Promise<void> | null = null;
  private cleanup: (() => void) | null = null;

  subscribe(listener: Listener): () => void {
    this.ensureInitialized();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): NetworkSnapshot {
    this.ensureInitialized();
    return this.snapshot;
  }

  isOnline(): boolean {
    return this.snapshot.isOnline;
  }

  private ensureInitialized() {
    if (this.initPromise) return;
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (Platform.OS === "web") {
      this.initializeForWeb();
      return;
    }
    this.initializeWithPolling();
  }

  private initializeForWeb() {
    const update = () => {
      const online = typeof navigator !== "undefined" ? navigator.onLine : true;
      this.applySnapshot({
        isConnected: online,
        isInternetReachable: online,
        type: "web",
        isOnline: online,
      });
    };
    if (typeof window !== "undefined") {
      window.addEventListener("online", update);
      window.addEventListener("offline", update);
      this.cleanup = () => {
        window.removeEventListener("online", update);
        window.removeEventListener("offline", update);
      };
    }
    update();
  }

  private initializeWithPolling() {
    let timer: ReturnType<typeof setInterval> | null = null;
    const poll = async () => {
      const online = await ping();
      this.applySnapshot({
        isConnected: online,
        isInternetReachable: online,
        type: Platform.OS,
        isOnline: online,
      });
    };
    poll().catch(() => {});
    timer = setInterval(() => {
      poll().catch(() => {});
    }, POLL_INTERVAL_MS);
    this.cleanup = () => {
      if (timer) clearInterval(timer);
    };
  }

  private applySnapshot(partial: Omit<NetworkSnapshot, "lastUpdated">) {
    const next: NetworkSnapshot = {
      ...partial,
      lastUpdated: Date.now(),
    };
    if (hasMeaningfulChange(this.snapshot, next)) {
      this.snapshot = next;
      this.emit();
    }
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }
}

async function ping(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const response = await fetch(PING_URL, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

function hasMeaningfulChange(prev: NetworkSnapshot, next: NetworkSnapshot): boolean {
  return (
    prev.isConnected !== next.isConnected ||
    prev.isInternetReachable !== next.isInternetReachable ||
    prev.type !== next.type ||
    prev.isOnline !== next.isOnline
  );
}

export const networkMonitor = new NetworkMonitorImpl();
