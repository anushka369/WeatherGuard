/**
 * Loading state management utilities for async operations
 */

export enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface AsyncState<T = any> {
  state: LoadingState;
  data: T | null;
  error: string | null;
}

/**
 * Create initial async state
 */
export const createAsyncState = <T = any>(initialData: T | null = null): AsyncState<T> => {
  return {
    state: LoadingState.IDLE,
    data: initialData,
    error: null,
  };
};

/**
 * Set loading state
 */
export const setLoading = <T = any>(prevState: AsyncState<T>): AsyncState<T> => {
  return {
    ...prevState,
    state: LoadingState.LOADING,
    error: null,
  };
};

/**
 * Set success state
 */
export const setSuccess = <T = any>(data: T, prevState?: AsyncState<T>): AsyncState<T> => {
  return {
    state: LoadingState.SUCCESS,
    data,
    error: null,
  };
};

/**
 * Set error state
 */
export const setError = <T = any>(error: string, prevState?: AsyncState<T>): AsyncState<T> => {
  return {
    state: LoadingState.ERROR,
    data: prevState?.data || null,
    error,
  };
};

/**
 * Reset to idle state
 */
export const resetState = <T = any>(initialData: T | null = null): AsyncState<T> => {
  return createAsyncState(initialData);
};

/**
 * Check if state is loading
 */
export const isLoading = (state: AsyncState): boolean => {
  return state.state === LoadingState.LOADING;
};

/**
 * Check if state has error
 */
export const hasError = (state: AsyncState): boolean => {
  return state.state === LoadingState.ERROR;
};

/**
 * Check if state is successful
 */
export const isSuccess = (state: AsyncState): boolean => {
  return state.state === LoadingState.SUCCESS;
};

/**
 * Check if state is idle
 */
export const isIdle = (state: AsyncState): boolean => {
  return state.state === LoadingState.IDLE;
};

/**
 * Hook-like async state manager for class components or utilities
 */
export class AsyncStateManager<T = any> {
  private state: AsyncState<T>;
  private listeners: Array<(state: AsyncState<T>) => void> = [];

  constructor(initialData: T | null = null) {
    this.state = createAsyncState(initialData);
  }

  /**
   * Get current state
   */
  getState(): AsyncState<T> {
    return this.state;
  }

  /**
   * Set loading state
   */
  setLoading(): void {
    this.updateState(setLoading(this.state));
  }

  /**
   * Set success state
   */
  setSuccess(data: T): void {
    this.updateState(setSuccess(data, this.state));
  }

  /**
   * Set error state
   */
  setError(error: string): void {
    this.updateState(setError(error, this.state));
  }

  /**
   * Reset state
   */
  reset(initialData: T | null = null): void {
    this.updateState(resetState(initialData));
  }

  /**
   * Execute async function with state management
   */
  async execute(fn: () => Promise<T>): Promise<T> {
    this.setLoading();

    try {
      const result = await fn();
      this.setSuccess(result);
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred';
      this.setError(errorMessage);
      throw error;
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: AsyncState<T>) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Update state and notify listeners
   */
  private updateState(newState: AsyncState<T>): void {
    this.state = newState;
    this.notifyListeners();
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }
}

/**
 * Debounce function for loading states
 */
export const debounceLoading = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

/**
 * Throttle function for loading states
 */
export const throttleLoading = <T extends (...args: any[]) => any>(
  fn: T,
  limit: number = 1000
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};
