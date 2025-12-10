/**
 * Form validation utilities with real-time feedback
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate location input
 */
export const validateLocation = (location: string): ValidationResult => {
  if (!location || !location.trim()) {
    return {
      isValid: false,
      error: 'Location is required',
    };
  }

  if (location.trim().length < 2) {
    return {
      isValid: false,
      error: 'Location must be at least 2 characters',
    };
  }

  if (location.length > 100) {
    return {
      isValid: false,
      error: 'Location must be less than 100 characters',
    };
  }

  return { isValid: true };
};

/**
 * Validate coverage period dates
 */
export const validateCoveragePeriod = (
  startDate: string,
  endDate: string
): ValidationResult => {
  if (!startDate || !endDate) {
    return {
      isValid: false,
      error: 'Both start and end dates are required',
    };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      isValid: false,
      error: 'Invalid date format',
    };
  }

  // Start date must be in the future
  if (start <= now) {
    return {
      isValid: false,
      error: 'Start date must be in the future',
    };
  }

  // End date must be after start date
  if (end <= start) {
    return {
      isValid: false,
      error: 'End date must be after start date',
    };
  }

  // Calculate duration in days
  const durationMs = end.getTime() - start.getTime();
  const durationDays = durationMs / (1000 * 60 * 60 * 24);

  // Minimum duration: 1 day
  if (durationDays < 1) {
    return {
      isValid: false,
      error: 'Coverage period must be at least 1 day',
    };
  }

  // Maximum duration: 365 days
  if (durationDays > 365) {
    return {
      isValid: false,
      error: 'Coverage period cannot exceed 365 days',
    };
  }

  return { isValid: true };
};

/**
 * Validate trigger value
 */
export const validateTriggerValue = (value: string): ValidationResult => {
  if (value === '' || value === null || value === undefined) {
    return {
      isValid: false,
      error: 'Trigger value is required',
    };
  }

  const numValue = parseFloat(value);

  if (isNaN(numValue)) {
    return {
      isValid: false,
      error: 'Trigger value must be a valid number',
    };
  }

  // Allow negative values for temperature
  // Range validation can be parameter-specific
  if (numValue < -100 || numValue > 10000) {
    return {
      isValid: false,
      error: 'Trigger value is out of acceptable range',
    };
  }

  return { isValid: true };
};

/**
 * Validate payout amount
 */
export const validatePayoutAmount = (amount: string): ValidationResult => {
  if (!amount || amount === '0') {
    return {
      isValid: false,
      error: 'Payout amount is required',
    };
  }

  const numAmount = parseFloat(amount);

  if (isNaN(numAmount)) {
    return {
      isValid: false,
      error: 'Payout amount must be a valid number',
    };
  }

  if (numAmount <= 0) {
    return {
      isValid: false,
      error: 'Payout amount must be greater than 0',
    };
  }

  if (numAmount < 0.01) {
    return {
      isValid: false,
      error: 'Payout amount must be at least 0.01 QIE',
    };
  }

  if (numAmount > 100) {
    return {
      isValid: false,
      error: 'Payout amount cannot exceed 100 QIE',
    };
  }

  return { isValid: true };
};

/**
 * Validate deposit amount
 */
export const validateDepositAmount = (
  amount: string,
  userBalance?: string
): ValidationResult => {
  if (!amount || amount === '0') {
    return {
      isValid: false,
      error: 'Deposit amount is required',
    };
  }

  const numAmount = parseFloat(amount);

  if (isNaN(numAmount)) {
    return {
      isValid: false,
      error: 'Deposit amount must be a valid number',
    };
  }

  if (numAmount <= 0) {
    return {
      isValid: false,
      error: 'Deposit amount must be greater than 0',
    };
  }

  if (numAmount < 0.01) {
    return {
      isValid: false,
      error: 'Deposit amount must be at least 0.01 QIE',
    };
  }

  // Check against user balance if provided
  if (userBalance) {
    const balance = parseFloat(userBalance);
    // Leave some for gas fees
    const maxDeposit = Math.max(0, balance - 0.01);

    if (numAmount > maxDeposit) {
      return {
        isValid: false,
        error: 'Insufficient balance (reserve some for gas fees)',
      };
    }
  }

  return { isValid: true };
};

/**
 * Validate withdrawal amount
 */
export const validateWithdrawalAmount = (
  amount: string,
  availableLPTokens?: string
): ValidationResult => {
  if (!amount || amount === '0') {
    return {
      isValid: false,
      error: 'Withdrawal amount is required',
    };
  }

  const numAmount = parseFloat(amount);

  if (isNaN(numAmount)) {
    return {
      isValid: false,
      error: 'Withdrawal amount must be a valid number',
    };
  }

  if (numAmount <= 0) {
    return {
      isValid: false,
      error: 'Withdrawal amount must be greater than 0',
    };
  }

  // Check against available LP tokens if provided
  if (availableLPTokens) {
    const available = parseFloat(availableLPTokens);

    if (numAmount > available) {
      return {
        isValid: false,
        error: 'Insufficient LP tokens',
      };
    }
  }

  return { isValid: true };
};

/**
 * Validate Ethereum address
 */
export const validateAddress = (address: string): ValidationResult => {
  if (!address) {
    return {
      isValid: false,
      error: 'Address is required',
    };
  }

  // Basic Ethereum address validation
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;

  if (!addressRegex.test(address)) {
    return {
      isValid: false,
      error: 'Invalid Ethereum address format',
    };
  }

  return { isValid: true };
};

/**
 * Validate numeric input with range
 */
export const validateNumericRange = (
  value: string,
  min: number,
  max: number,
  fieldName: string = 'Value'
): ValidationResult => {
  if (value === '' || value === null || value === undefined) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  const numValue = parseFloat(value);

  if (isNaN(numValue)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number`,
    };
  }

  if (numValue < min) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${min}`,
    };
  }

  if (numValue > max) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed ${max}`,
    };
  }

  return { isValid: true };
};

/**
 * Validate percentage value
 */
export const validatePercentage = (value: string): ValidationResult => {
  return validateNumericRange(value, 0, 100, 'Percentage');
};

/**
 * Batch validate multiple fields
 */
export const validateFields = (
  validations: Array<{ field: string; result: ValidationResult }>
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  let isValid = true;

  for (const { field, result } of validations) {
    if (!result.isValid && result.error) {
      errors[field] = result.error;
      isValid = false;
    }
  }

  return { isValid, errors };
};
