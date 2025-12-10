import { useState, useCallback } from 'react';
import { parseWeb3Error, retryWithBackoff } from '../utils/errorHandling';
import { LoadingState } from '../utils/loadingStates';

interface UseAsyncOperationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  retryOnError?: boolean;
  maxRetries?: number;
}

/**
 * Custom hook for handling async operations with loading states
 */
export const useAsyncOperation = <T = any>(options: UseAsyncOperationOptions = {}) => {
  const {
    onSuccess,
    onError,
    retryOnError = false,
    maxRetries = 3,
  } = options;

  const [state, setState] = useState<LoadingState>(LoadingState.IDLE);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Execute async operation
   */
  const execute = useCallback(
    async (operation: () => Promise<T>): Promise<T | null> => {
      setState(LoadingState.LOADING);
      setError(null);

      try {
        let result: T;

        if (retryOnError) {
          result = await retryWithBackoff(operation, maxRetries);
        } else {
          result = await operation();
        }

        setData(result);
        setState(LoadingState.SUCCESS);

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err: any) {
        const parsedError = parseWeb3Error(err);
        setError(parsedError.message);
        setState(LoadingState.ERROR);

        if (onError) {
          onError(err);
        }

        return null;
      }
    },
    [retryOnError, maxRetries, onSuccess, onError]
  );

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState(LoadingState.IDLE);
    setData(null);
    setError(null);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
    if (state === LoadingState.ERROR) {
      setState(LoadingState.IDLE);
    }
  }, [state]);

  return {
    execute,
    reset,
    clearError,
    state,
    data,
    error,
    isLoading: state === LoadingState.LOADING,
    isSuccess: state === LoadingState.SUCCESS,
    isError: state === LoadingState.ERROR,
    isIdle: state === LoadingState.IDLE,
  };
};
