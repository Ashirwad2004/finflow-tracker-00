/**
 * ConnectivityService
 *
 * Monitors real-time network connectivity, window events, and ping reachability.
 * Exposes a reactive state subscription for UI badges and background sync handlers.
 */

export type ConnectionStatus = 'online' | 'offline' | 'syncing';

export interface ConnectivityState {
  status: ConnectionStatus;
  lastSyncTime: number | null;
  pendingCount: number;
}

type Listener = (state: ConnectivityState) => void;

class ConnectivityService {
  private state: ConnectivityState = {
    status: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
    lastSyncTime: typeof navigator !== 'undefined' && navigator.onLine ? Date.now() : null,
    pendingCount: 0,
  };

  private listeners: Set<Listener> = new Set();
  private pingIntervalId: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      
      // Start periodic lightweight connectivity verification
      this.startPingCheck();
    }
  }

  public getState(): ConnectivityState {
    return { ...this.state };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // Emit initial state immediately to new subscriber
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public setStatus(status: ConnectionStatus) {
    if (this.state.status !== status) {
      this.state.status = status;
      if (status === 'online') {
        this.state.lastSyncTime = Date.now();
      }
      this.notify();
    }
  }

  public setPendingCount(count: number) {
    if (this.state.pendingCount !== count) {
      this.state.pendingCount = Math.max(0, count);
      this.notify();
    }
  }

  public updateLastSyncTime() {
    this.state.lastSyncTime = Date.now();
    this.notify();
  }

  private handleNetworkChange(isOnline: boolean) {
    if (isOnline) {
      this.setStatus('online');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('app-online-reconnect'));
      }
      this.verifyReachability();
    } else {
      this.setStatus('offline');
    }
  }

  private startPingCheck() {
    if (this.pingIntervalId) clearInterval(this.pingIntervalId);
    this.pingIntervalId = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        this.verifyReachability();
      } else {
        this.setStatus('offline');
      }
    }, 30000); // Check reachability every 30s
  }

  private async verifyReachability() {
    if (typeof navigator === 'undefined') return;
    if (!navigator.onLine) {
      this.setStatus('offline');
      return;
    }

    try {
      const response = await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store' });
      if (response.ok || response.status === 304 || response.status === 200 || response.status === 404) {
        this.setStatus('online');
      } else {
        if (!navigator.onLine) this.setStatus('offline');
      }
    } catch {
      // In SPA dev mode, fetch may fail due to CORS or local router, fallback to navigator.onLine status
      if (navigator.onLine) {
        this.setStatus('online');
      } else {
        this.setStatus('offline');
      }
    }
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('[ConnectivityService] Listener notify error:', err);
      }
    });
  }
}

export const connectivityService = new ConnectivityService();
