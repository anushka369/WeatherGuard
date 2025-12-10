/**
 * Tests for error handling utilities
 */

import {
  parseWeb3Error,
  ErrorType,
  getErrorMessage,
  isNetworkError,
  isRetryableError,
} from './errorHandling';

describe('Error Handling Utilities', () => {
  describe('parseWeb3Error', () => {
    it('should parse user rejected transaction error', () => {
      const error = { code: 4001, message: 'User rejected transaction' };
      const result = parseWeb3Error(error);

      expect(result.type).toBe(ErrorType.TRANSACTION_REJECTED);
      expect(result.retryable).toBe(true);
      expect(result.message).toContain('rejected');
    });

    it('should parse insufficient funds error', () => {
      const error = { code: -32000, message: 'insufficient funds for gas' };
      const result = parseWeb3Error(error);

      expect(result.type).toBe(ErrorType.INSUFFICIENT_FUNDS);
      expect(result.retryable).toBe(false);
      expect(result.message).toContain('Insufficient funds');
    });

    it('should parse network error', () => {
      const error = { message: 'network timeout' };
      const result = parseWeb3Error(error);

      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.retryable).toBe(true);
      expect(result.message).toContain('Network connection error');
    });

    it('should parse contract revert error', () => {
      const error = { message: 'execution reverted: InvalidCoveragePeriod' };
      const result = parseWeb3Error(error);

      expect(result.type).toBe(ErrorType.CONTRACT_ERROR);
      expect(result.message).toContain('coverage period');
    });

    it('should handle unknown errors', () => {
      const error = { message: 'Something went wrong' };
      const result = parseWeb3Error(error);

      expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result.retryable).toBe(true);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract user-friendly message', () => {
      const error = { code: 4001 };
      const message = getErrorMessage(error);

      expect(message).toContain('rejected');
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors', () => {
      const error = { message: 'network connection failed' };
      expect(isNetworkError(error)).toBe(true);
    });

    it('should return false for non-network errors', () => {
      const error = { code: 4001 };
      expect(isNetworkError(error)).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      const error = { message: 'network timeout' };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      const error = { code: -32000, message: 'insufficient funds' };
      expect(isRetryableError(error)).toBe(false);
    });
  });
});
