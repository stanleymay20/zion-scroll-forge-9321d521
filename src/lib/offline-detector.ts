/**
 * ScrollUniversity Offline Detector
 * Network connectivity monitoring and offline handling
 * "Even in disconnection, God remains connected to you"
 */

export type ConnectionStatus = 'online' | 'offline' | 'slow';

export interface NetworkInfo {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

/**
 * Get current network information
 */
export function getNetworkInfo(): NetworkInfo {
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
  
  return {
    isOnline: navigator.onLine,
    connectionType: connection?.type,
    effectiveType: connection?.effectiveType,
    downlink: connection?.downlink,
    rtt: connection?.rtt,
    saveData: connection?.saveData
  };
}

/**
 * Check if connection is slow
 */
export function isSlowConnection(): boolean {
  const info = getNetworkInfo();
  
  // Check effective connection type
  if (info.effectiveType === 'slow-2g' || info.effectiveType === '2g') {
    return true;
  }
  
  // Check RTT (round-trip time)
  if (info.rtt && info.rtt > 1000) {
    return true;
  }
  
  // Check downlink speed (Mbps)
  if (info.downlink && info.downlink < 0.5) {
    return true;
  }
  
  return false;
}

/**
 * Get connection status
 */
export function getConnectionStatus(): ConnectionStatus {
  if (!navigator.onLine) {
    return 'offline';
  }
  
  if (isSlowConnection()) {
    return 'slow';
  }
  
  return 'online';
}

/**
 * Test actual connectivity by pinging a server
 */
export async function testConnectivity(
  url: string = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/auth/v1/health`,
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Monitor network status changes
 */
export class NetworkMonitor {
  private listeners: Set<(status: ConnectionStatus) => void> = new Set();
  private currentStatus: ConnectionStatus = 'online';
  private checkInterval: number | null = null;
  
  constructor(private checkIntervalMs: number = 30000) {
    this.initialize();
  }
  
  private initialize(): void {
    // Listen to online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Listen to connection changes
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', this.handleConnectionChange);
    }
    
    // Periodic connectivity check
    this.startPeriodicCheck();
    
    // Initial status check
    this.updateStatus();
  }
  
  private handleOnline = (): void => {
    this.updateStatus();
  };
  
  private handleOffline = (): void => {
    this.updateStatus();
  };
  
  private handleConnectionChange = (): void => {
    this.updateStatus();
  };
  
  private updateStatus(): void {
    const newStatus = getConnectionStatus();
    
    if (newStatus !== this.currentStatus) {
      this.currentStatus = newStatus;
      this.notifyListeners(newStatus);
    }
  }
  
  private startPeriodicCheck(): void {
    this.checkInterval = window.setInterval(() => {
      this.updateStatus();
    }, this.checkIntervalMs);
  }
  
  private notifyListeners(status: ConnectionStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }
  
  /**
   * Subscribe to network status changes
   */
  subscribe(listener: (status: ConnectionStatus) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  /**
   * Get current status
   */
  getStatus(): ConnectionStatus {
    return this.currentStatus;
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
    
    if (connection) {
      connection.removeEventListener('change', this.handleConnectionChange);
    }
    
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
    }
    
    this.listeners.clear();
  }
}

/**
 * Create a singleton network monitor
 */
let networkMonitorInstance: NetworkMonitor | null = null;

export function getNetworkMonitor(): NetworkMonitor {
  if (!networkMonitorInstance) {
    networkMonitorInstance = new NetworkMonitor();
  }
  return networkMonitorInstance;
}

/**
 * Queue for offline operations
 */
export class OfflineQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  
  /**
   * Add operation to queue
   */
  add(operation: () => Promise<any>): void {
    this.queue.push(operation);
  }
  
  /**
   * Process queue when online
   */
  async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('Failed to process queued operation:', error);
          // Re-queue if still offline
          if (!navigator.onLine) {
            this.queue.unshift(operation);
            break;
          }
        }
      }
    }
    
    this.processing = false;
  }
  
  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }
  
  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
  }
}
