/**
 * Tests for validation utilities
 */

import {
  validateLocation,
  validateCoveragePeriod,
  validateTriggerValue,
  validatePayoutAmount,
  validateDepositAmount,
  validateWithdrawalAmount,
  validateAddress,
  validateNumericRange,
  validatePercentage,
} from './validation';

describe('Validation Utilities', () => {
  describe('validateLocation', () => {
    it('should validate valid location', () => {
      const result = validateLocation('New York, USA');
      expect(result.isValid).toBe(true);
    });

    it('should reject empty location', () => {
      const result = validateLocation('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject too short location', () => {
      const result = validateLocation('A');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 2 characters');
    });
  });

  describe('validateCoveragePeriod', () => {
    it('should validate valid coverage period', () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const result = validateCoveragePeriod(
        tomorrow.toISOString(),
        nextWeek.toISOString()
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject start date in the past', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const result = validateCoveragePeriod(
        yesterday.toISOString(),
        tomorrow.toISOString()
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('future');
    });

    it('should reject end date before start date', () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const today = new Date();

      const result = validateCoveragePeriod(
        tomorrow.toISOString(),
        today.toISOString()
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('after start date');
    });

    it('should reject coverage period exceeding 365 days', () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const nextYear = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000);

      const result = validateCoveragePeriod(
        tomorrow.toISOString(),
        nextYear.toISOString()
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('365 days');
    });
  });

  describe('validateTriggerValue', () => {
    it('should validate valid trigger value', () => {
      const result = validateTriggerValue('50');
      expect(result.isValid).toBe(true);
    });

    it('should reject empty trigger value', () => {
      const result = validateTriggerValue('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject non-numeric trigger value', () => {
      const result = validateTriggerValue('abc');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('number');
    });
  });

  describe('validatePayoutAmount', () => {
    it('should validate valid payout amount', () => {
      const result = validatePayoutAmount('5');
      expect(result.isValid).toBe(true);
    });

    it('should reject zero payout amount', () => {
      const result = validatePayoutAmount('0');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject payout amount below minimum', () => {
      const result = validatePayoutAmount('0.005');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('0.01');
    });

    it('should reject payout amount above maximum', () => {
      const result = validatePayoutAmount('150');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('100');
    });
  });

  describe('validateDepositAmount', () => {
    it('should validate valid deposit amount', () => {
      const result = validateDepositAmount('1', '10');
      expect(result.isValid).toBe(true);
    });

    it('should reject deposit exceeding balance', () => {
      const result = validateDepositAmount('10', '5');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Insufficient balance');
    });
  });

  describe('validateAddress', () => {
    it('should validate valid Ethereum address', () => {
      const result = validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid address format', () => {
      const result = validateAddress('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });

  describe('validateNumericRange', () => {
    it('should validate value within range', () => {
      const result = validateNumericRange('50', 0, 100, 'Test');
      expect(result.isValid).toBe(true);
    });

    it('should reject value below minimum', () => {
      const result = validateNumericRange('5', 10, 100, 'Test');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 10');
    });

    it('should reject value above maximum', () => {
      const result = validateNumericRange('150', 0, 100, 'Test');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot exceed 100');
    });
  });

  describe('validatePercentage', () => {
    it('should validate valid percentage', () => {
      const result = validatePercentage('50');
      expect(result.isValid).toBe(true);
    });

    it('should reject percentage above 100', () => {
      const result = validatePercentage('150');
      expect(result.isValid).toBe(false);
    });

    it('should reject negative percentage', () => {
      const result = validatePercentage('-10');
      expect(result.isValid).toBe(false);
    });
  });
});
