/**
 * Network error detection and retry logic utilities
 */

import { retryWithBackoff, isNetworkError } from './errorHandling';

export interface NetworkStatus {
  isOnline: boolean;
  isConnectedToRPC: boolean;
  latency: number | null;
}

/**
 * Check if browser is online
 */
export const checkBrowserOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Check RPC connection health
 */
export const checkRPCConnection = async (
  rpcUrl: string,
  timeout: number = 5000
): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Measure RPC latency
 */
export const measureRPCLatency = async (rpcUrl: string): Promise<number | null> => {
  try {
    const startTime = Date.now();

    await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
    });

    const endTime = Date.now();
    return endTime - startTime;
  } catch (error) {
    return null;
  }
};

/**
 * Get comprehensive network status
 */
export const getNetworkStatus = async (rpcUrl: string): Promise<NetworkStatus> => {
  const isOnline = checkBrowserOnline();
  const isConnectedToRPC = await checkRPCConnection(rpcUrl);
  const latency = isConnectedToRPC ? await measureRPCLatency(rpcUrl) : null;

  return {
    isOnline,
    isConnectedToRPC,
    latency,
  };
};

/**
 * Wait for network to be available
 */
export const waitForNetwork = async (
  rpcUrl: string,
  maxWaitTime: number = 30000,
  checkInterval: number = 2000
): Promise<boolean> => {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    if (checkBrowserOnline() && (await checkRPCConnection(rpcUrl))) {
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  return false;
};

/**
 * Execute function with network retry
 */
export const executeWithNetworkRetry = async <T>(
  fn: () => Promise<T>,
  rpcUrl: string,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    waitForNetwork?: boolean;
  } = {}
): Promise<T> => {
  const { maxRetries = 3, initialDelay = 1000, waitForNetwork: shouldWait = true } = options;

  try {
    return await retryWithBackoff(fn, maxRetries, initialDelay);
  } catch (error) {
    // If it's a network error and we should wait, try waiting for network
    if (isNetworkError(error) && shouldWait) {
      const networkAvailable = await waitForNetwork(rpcUrl);

      if (networkAvailable) {
        // Try one more time after network is back
        return await fn();
      }
    }

    throw error;
  }
};

/**
 * Monitor network status changes
 */
export class NetworkMonitor {
  private listeners: Array<(status: NetworkStatus) => void> = [];
  private currentStatus: NetworkStatus | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private rpcUrl: string;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
  }

  /**
   * Start monitoring network status
   */
  start(intervalMs: number = 10000): void {
    // Initial check
    this.checkStatus();

    // Set up periodic checks
    this.checkInterval = setInterval(() => {
      this.checkStatus();
    }, intervalMs);

    // Listen to browser online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  /**
   * Add status change listener
   */
  addListener(listener: (status: NetworkStatus) => void): void {
    this.listeners.push(listener);

    // Immediately notify with current status if available
    if (this.currentStatus) {
      listener(this.currentStatus);
    }
  }

  /**
   * Remove status change listener
   */
  removeListener(listener: (status: NetworkStatus) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Get current network status
   */
  getCurrentStatus(): NetworkStatus | null {
    return this.currentStatus;
  }

  /**
   * Check network status and notify listeners
   */
  private async checkStatus(): Promise<void> {
    const status = await getNetworkStatus(this.rpcUrl);

    // Only notify if status changed
    if (
      !this.currentStatus ||
      this.currentStatus.isOnline !== status.isOnline ||
      this.currentStatus.isConnectedToRPC !== status.isConnectedToRPC
    ) {
      this.currentStatus = status;
      this.notifyListeners(status);
    }
  }

  /**
   * Handle browser online event
   */
  private handleOnline = (): void => {
    this.checkStatus();
  };

  /**
   * Handle browser offline event
   */
  private handleOffline = (): void => {
    const status: NetworkStatus = {
      isOnline: false,
      isConnectedToRPC: false,
      latency: null,
    };

    this.currentStatus = status;
    this.notifyListeners(status);
  };

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(status: NetworkStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }
}
