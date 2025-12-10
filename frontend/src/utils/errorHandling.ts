/**
 * Error handling utilities for transaction failures and network errors
 */

export enum ErrorType {
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  WALLET_ERROR = 'WALLET_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: any;
  retryable: boolean;
}

/**
 * Parse Web3/MetaMask errors into user-friendly messages
 */
export const parseWeb3Error = (error: any): AppError => {
  // User rejected transaction
  if (error.code === 4001 || error.message?.includes('User denied')) {
    return {
      type: ErrorType.TRANSACTION_REJECTED,
      message: 'Transaction was rejected. Please approve the transaction in your wallet.',
      originalError: error,
      retryable: true,
    };
  }

  // Insufficient funds
  if (
    error.code === -32000 ||
    error.message?.includes('insufficient funds') ||
    error.message?.includes('InsufficientBalance')
  ) {
    return {
      type: ErrorType.INSUFFICIENT_FUNDS,
      message: 'Insufficient funds to complete this transaction. Please add more QIE to your wallet.',
      originalError: error,
      retryable: false,
    };
  }

  // Network errors
  if (
    error.message?.includes('network') ||
    error.message?.includes('timeout') ||
    error.message?.includes('connection')
  ) {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: 'Network connection error. Please check your internet connection and try again.',
      originalError: error,
      retryable: true,
    };
  }

  // Contract revert errors
  if (error.message?.includes('revert') || error.message?.includes('execution reverted')) {
    const revertReason = extractRevertReason(error.message);
    return {
      type: ErrorType.CONTRACT_ERROR,
      message: revertReason || 'Transaction failed. The smart contract rejected this operation.',
      originalError: error,
      retryable: false,
    };
  }

  // Wallet connection errors
  if (
    error.message?.includes('wallet') ||
    error.message?.includes('MetaMask') ||
    error.code === -32002
  ) {
    return {
      type: ErrorType.WALLET_ERROR,
      message: error.code === -32002
        ? 'A wallet connection request is already pending. Please check MetaMask.'
        : 'Wallet connection error. Please ensure MetaMask is unlocked and try again.',
      originalError: error,
      retryable: true,
    };
  }

  // Default unknown error
  return {
    type: ErrorType.UNKNOWN_ERROR,
    message: error.message || 'An unexpected error occurred. Please try again.',
    originalError: error,
    retryable: true,
  };
};

/**
 * Extract revert reason from error message
 */
const extractRevertReason = (errorMessage: string): string | null => {
  // Try to extract custom error messages
  const patterns = [
    /revert\s+(.+?)(?:\n|$)/i,
    /execution reverted:\s*(.+?)(?:\n|$)/i,
    /"message":\s*"(.+?)"/i,
  ];

  for (const pattern of patterns) {
    const match = errorMessage.match(pattern);
    if (match && match[1]) {
      return formatRevertReason(match[1].trim());
    }
  }

  return null;
};

/**
 * Format revert reason into user-friendly message
 */
const formatRevertReason = (reason: string): string => {
  // Map common contract errors to user-friendly messages
  const errorMap: Record<string, string> = {
    'InvalidCoveragePeriod': 'Invalid coverage period. Please ensure the start date is in the future and end date is after start date.',
    'InvalidTriggerValue': 'Invalid trigger value. Please enter a value within acceptable ranges.',
    'InsufficientPremium': 'Insufficient premium payment. Please ensure you have enough funds.',
    'SystemPaused': 'The system is currently paused. Please try again later.',
    'PolicyNotActive': 'This policy is not active and cannot be processed.',
    'InvalidOracleSignature': 'Invalid oracle data signature. Please contact support.',
    'InsufficientPoolFunds': 'Insufficient liquidity in the pool. Please try again later.',
    'UnauthorizedOracle': 'Unauthorized oracle data source.',
    'ZeroDeposit': 'Deposit amount must be greater than zero.',
    'InsufficientLPTokens': 'Insufficient LP tokens for withdrawal.',
    'InsufficientLiquidity': 'Insufficient liquidity available for withdrawal. Please try a smaller amount.',
    'OnlyAdmin': 'This operation requires administrator privileges.',
    'OnlyPolicyManager': 'Unauthorized contract access.',
    'OnlyOracle': 'Unauthorized oracle access.',
  };

  // Check if we have a mapping for this error
  for (const [key, message] of Object.entries(errorMap)) {
    if (reason.includes(key)) {
      return message;
    }
  }

  // Return the original reason if no mapping found
  return reason;
};

/**
 * Retry logic with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const appError = parseWeb3Error(error);

      // Don't retry if error is not retryable
      if (!appError.retryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: any): boolean => {
  const appError = parseWeb3Error(error);
  return appError.type === ErrorType.NETWORK_ERROR;
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error: any): boolean => {
  const appError = parseWeb3Error(error);
  return appError.retryable;
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error: any): string => {
  const appError = parseWeb3Error(error);
  return appError.message;
};
