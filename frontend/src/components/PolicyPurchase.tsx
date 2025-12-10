import React, { useState, useEffect, useMemo } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { CONTRACT_ADDRESSES, WEATHER_PARAMETER_LABELS, COMPARISON_OPERATOR_LABELS } from '../utils/constants';
import { WeatherParameter, ComparisonOperator } from '../types';
import './PolicyPurchase.css';

// Import contract ABI (will be generated from compiled contracts)
import PolicyManagerABI from '../contracts/PolicyManager.json';

interface PolicyTemplate {
  id: number;
  name: string;
  description: string;
  defaultParameterType: WeatherParameter;
  defaultOperator: ComparisonOperator;
  defaultTriggerValue: number;
  defaultCoverageDuration: number; // in days
  defaultPayoutAmount: string; // in ETH
}

interface FormData {
  template: number | null;
  location: string;
  coveragePeriodStart: string;
  coveragePeriodEnd: string;
  parameterType: WeatherParameter;
  triggerValue: string;
  operator: ComparisonOperator;
  payoutAmount: string;
}

interface FormErrors {
  location?: string;
  coveragePeriodStart?: string;
  coveragePeriodEnd?: string;
  triggerValue?: string;
  payoutAmount?: string;
  general?: string;
}

enum TransactionStatus {
  IDLE = 'idle',
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error',
}

const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: 0,
    name: 'Crop Insurance',
    description: 'Protection against adverse weather conditions affecting crops',
    defaultParameterType: WeatherParameter.RAINFALL,
    defaultOperator: ComparisonOperator.LESS_THAN,
    defaultTriggerValue: 50,
    defaultCoverageDuration: 90,
    defaultPayoutAmount: '5',
  },
  {
    id: 1,
    name: 'Event Insurance',
    description: 'Coverage for outdoor events against rain or extreme weather',
    defaultParameterType: WeatherParameter.RAINFALL,
    defaultOperator: ComparisonOperator.GREATER_THAN,
    defaultTriggerValue: 10,
    defaultCoverageDuration: 7,
    defaultPayoutAmount: '2',
  },
  {
    id: 2,
    name: 'Travel Insurance',
    description: 'Protection for travel plans against extreme weather conditions',
    defaultParameterType: WeatherParameter.TEMPERATURE,
    defaultOperator: ComparisonOperator.LESS_THAN,
    defaultTriggerValue: 0,
    defaultCoverageDuration: 14,
    defaultPayoutAmount: '1',
  },
];

/**
 * PolicyPurchase Component
 * Form for purchasing weather insurance policies
 */
const PolicyPurchase: React.FC = () => {
  const { account, web3, isConnected, isCorrectNetwork } = useWeb3();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    template: null,
    location: '',
    coveragePeriodStart: '',
    coveragePeriodEnd: '',
    parameterType: WeatherParameter.TEMPERATURE,
    triggerValue: '',
    operator: ComparisonOperator.GREATER_THAN,
    payoutAmount: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [calculatedPremium, setCalculatedPremium] = useState<string>('0');
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>(TransactionStatus.IDLE);
  const [transactionHash, setTransactionHash] = useState<string>('');
  const [transactionError, setTransactionError] = useState<string>('');

  // Initialize default dates
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    setFormData((prev) => ({
      ...prev,
      coveragePeriodStart: tomorrow.toISOString().slice(0, 16),
      coveragePeriodEnd: nextWeek.toISOString().slice(0, 16),
    }));
  }, []);

  /**
   * Handle template selection
   */
  const handleTemplateSelect = (templateId: number) => {
    const template = POLICY_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + template.defaultCoverageDuration * 24 * 60 * 60 * 1000);

    setFormData({
      template: templateId,
      location: formData.location,
      coveragePeriodStart: startDate.toISOString().slice(0, 16),
      coveragePeriodEnd: endDate.toISOString().slice(0, 16),
      parameterType: template.defaultParameterType,
      triggerValue: template.defaultTriggerValue.toString(),
      operator: template.defaultOperator,
      payoutAmount: template.defaultPayoutAmount,
    });

    setErrors({});
  };

  /**
   * Handle form field changes
   */
  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate location
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    // Validate coverage period
    const startDate = new Date(formData.coveragePeriodStart);
    const endDate = new Date(formData.coveragePeriodEnd);
    const now = new Date();

    if (startDate <= now) {
      newErrors.coveragePeriodStart = 'Start date must be in the future';
    }

    if (endDate <= startDate) {
      newErrors.coveragePeriodEnd = 'End date must be after start date';
    }

    const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (durationDays < 1) {
      newErrors.coveragePeriodEnd = 'Coverage period must be at least 1 day';
    }
    if (durationDays > 365) {
      newErrors.coveragePeriodEnd = 'Coverage period cannot exceed 365 days';
    }

    // Validate trigger value
    if (formData.triggerValue === '') {
      newErrors.triggerValue = 'Trigger value is required';
    } else {
      const triggerNum = parseFloat(formData.triggerValue);
      if (isNaN(triggerNum)) {
        newErrors.triggerValue = 'Trigger value must be a number';
      }
    }

    // Validate payout amount
    if (!formData.payoutAmount || formData.payoutAmount === '0') {
      newErrors.payoutAmount = 'Payout amount is required';
    } else {
      const payoutNum = parseFloat(formData.payoutAmount);
      if (isNaN(payoutNum) || payoutNum <= 0) {
        newErrors.payoutAmount = 'Payout amount must be greater than 0';
      }
      if (payoutNum < 0.01) {
        newErrors.payoutAmount = 'Payout amount must be at least 0.01 QIE';
      }
      if (payoutNum > 100) {
        newErrors.payoutAmount = 'Payout amount cannot exceed 100 QIE';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Calculate premium based on form data
   */
  useEffect(() => {
    const calculatePremium = async () => {
      if (!web3 || !formData.payoutAmount || !formData.coveragePeriodStart || !formData.coveragePeriodEnd) {
        setCalculatedPremium('0');
        return;
      }

      try {
        const payoutNum = parseFloat(formData.payoutAmount);
        if (isNaN(payoutNum) || payoutNum <= 0) {
          setCalculatedPremium('0');
          return;
        }

        const startDate = new Date(formData.coveragePeriodStart);
        const endDate = new Date(formData.coveragePeriodEnd);
        const durationSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);

        if (durationSeconds <= 0) {
          setCalculatedPremium('0');
          return;
        }

        const payoutWei = web3.utils.toWei(formData.payoutAmount, 'ether');

        // Call contract to calculate premium
        const contract = new web3.eth.Contract(
          PolicyManagerABI.abi as any,
          CONTRACT_ADDRESSES.policyManager
        );

        const premium = await contract.methods
          .calculatePremium(
            payoutWei,
            durationSeconds,
            formData.parameterType,
            formData.operator
          )
          .call();

        const premiumEth = web3.utils.fromWei(String(premium), 'ether');
        setCalculatedPremium(premiumEth);
      } catch (error) {
        console.error('Error calculating premium:', error);
        setCalculatedPremium('0');
      }
    };

    calculatePremium();
  }, [web3, formData.payoutAmount, formData.coveragePeriodStart, formData.coveragePeriodEnd, formData.parameterType, formData.operator]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      setErrors({ general: 'Please connect your wallet first' });
      return;
    }

    if (!isCorrectNetwork) {
      setErrors({ general: 'Please switch to the QIE network' });
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (!web3 || !account) {
      setErrors({ general: 'Web3 not initialized' });
      return;
    }

    try {
      setTransactionStatus(TransactionStatus.PENDING);
      setTransactionError('');
      setTransactionHash('');

      const contract = new web3.eth.Contract(
        PolicyManagerABI.abi as any,
        CONTRACT_ADDRESSES.policyManager
      );

      const startTimestamp = Math.floor(new Date(formData.coveragePeriodStart).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(formData.coveragePeriodEnd).getTime() / 1000);
      const payoutWei = web3.utils.toWei(formData.payoutAmount, 'ether');
      const premiumWei = web3.utils.toWei(calculatedPremium, 'ether');

      // Add 10% buffer to premium to account for any calculation differences
      const premiumWithBuffer = (BigInt(premiumWei) * BigInt(110)) / BigInt(100);

      const tx = await contract.methods
        .createPolicy(
          startTimestamp,
          endTimestamp,
          formData.location,
          formData.parameterType,
          Math.floor(parseFloat(formData.triggerValue)),
          formData.operator,
          payoutWei
        )
        .send({
          from: account,
          value: premiumWithBuffer.toString(),
        });

      setTransactionHash(tx.transactionHash);
      setTransactionStatus(TransactionStatus.SUCCESS);

      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          template: null,
          location: '',
          coveragePeriodStart: '',
          coveragePeriodEnd: '',
          parameterType: WeatherParameter.TEMPERATURE,
          triggerValue: '',
          operator: ComparisonOperator.GREATER_THAN,
          payoutAmount: '',
        });
        setTransactionStatus(TransactionStatus.IDLE);
        setTransactionHash('');
      }, 5000);
    } catch (error: any) {
      console.error('Transaction error:', error);
      setTransactionStatus(TransactionStatus.ERROR);

      if (error.code === 4001) {
        setTransactionError('Transaction rejected by user');
      } else if (error.message) {
        setTransactionError(error.message);
      } else {
        setTransactionError('Transaction failed. Please try again.');
      }
    }
  };

  const isFormValid = useMemo(() => {
    return (
      formData.location.trim() !== '' &&
      formData.coveragePeriodStart !== '' &&
      formData.coveragePeriodEnd !== '' &&
      formData.triggerValue !== '' &&
      formData.payoutAmount !== '' &&
      parseFloat(calculatedPremium) > 0
    );
  }, [formData, calculatedPremium]);

  return (
    <div className="policy-purchase">
      <div className="policy-purchase-header">
        <h2>Purchase Weather Insurance Policy</h2>
        <p>Protect yourself against weather risks with parametric insurance</p>
      </div>

      {/* Policy Templates */}
      <div className="policy-templates">
        <h3>Choose a Template (Optional)</h3>
        <div className="template-grid">
          {POLICY_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className={`template-card ${formData.template === template.id ? 'selected' : ''}`}
              onClick={() => handleTemplateSelect(template.id)}
            >
              <h4>{template.name}</h4>
              <p>{template.description}</p>
              <div className="template-details">
                <span>Coverage: {template.defaultCoverageDuration} days</span>
                <span>Payout: {template.defaultPayoutAmount} QIE</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Policy Form */}
      <form onSubmit={handleSubmit} className="policy-form">
        {/* Location */}
        <div className="form-group">
          <label htmlFor="location">
            Location <span className="required">*</span>
          </label>
          <input
            type="text"
            id="location"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            placeholder="e.g., New York, USA"
            className={errors.location ? 'error' : ''}
          />
          {errors.location && <span className="error-message">{errors.location}</span>}
        </div>

        {/* Coverage Period */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="coveragePeriodStart">
              Coverage Start <span className="required">*</span>
            </label>
            <input
              type="datetime-local"
              id="coveragePeriodStart"
              value={formData.coveragePeriodStart}
              onChange={(e) => handleInputChange('coveragePeriodStart', e.target.value)}
              className={errors.coveragePeriodStart ? 'error' : ''}
            />
            {errors.coveragePeriodStart && (
              <span className="error-message">{errors.coveragePeriodStart}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="coveragePeriodEnd">
              Coverage End <span className="required">*</span>
            </label>
            <input
              type="datetime-local"
              id="coveragePeriodEnd"
              value={formData.coveragePeriodEnd}
              onChange={(e) => handleInputChange('coveragePeriodEnd', e.target.value)}
              className={errors.coveragePeriodEnd ? 'error' : ''}
            />
            {errors.coveragePeriodEnd && (
              <span className="error-message">{errors.coveragePeriodEnd}</span>
            )}
          </div>
        </div>

        {/* Weather Parameter */}
        <div className="form-group">
          <label htmlFor="parameterType">
            Weather Parameter <span className="required">*</span>
          </label>
          <select
            id="parameterType"
            value={formData.parameterType}
            onChange={(e) => handleInputChange('parameterType', parseInt(e.target.value))}
          >
            {Object.entries(WEATHER_PARAMETER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Trigger Condition */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="operator">
              Condition <span className="required">*</span>
            </label>
            <select
              id="operator"
              value={formData.operator}
              onChange={(e) => handleInputChange('operator', parseInt(e.target.value))}
            >
              {Object.entries(COMPARISON_OPERATOR_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="triggerValue">
              Trigger Value <span className="required">*</span>
            </label>
            <input
              type="number"
              id="triggerValue"
              value={formData.triggerValue}
              onChange={(e) => handleInputChange('triggerValue', e.target.value)}
              placeholder="e.g., 50"
              step="0.1"
              className={errors.triggerValue ? 'error' : ''}
            />
            {errors.triggerValue && <span className="error-message">{errors.triggerValue}</span>}
          </div>
        </div>

        {/* Payout Amount */}
        <div className="form-group">
          <label htmlFor="payoutAmount">
            Payout Amount (QIE) <span className="required">*</span>
          </label>
          <input
            type="number"
            id="payoutAmount"
            value={formData.payoutAmount}
            onChange={(e) => handleInputChange('payoutAmount', e.target.value)}
            placeholder="e.g., 5"
            step="0.01"
            min="0.01"
            max="100"
            className={errors.payoutAmount ? 'error' : ''}
          />
          {errors.payoutAmount && <span className="error-message">{errors.payoutAmount}</span>}
          <span className="help-text">Min: 0.01 QIE, Max: 100 QIE</span>
        </div>

        {/* Premium Display */}
        <div className="premium-display">
          <div className="premium-label">Estimated Premium:</div>
          <div className="premium-value">{calculatedPremium} QIE</div>
        </div>

        {/* Error Messages */}
        {errors.general && <div className="error-banner">{errors.general}</div>}

        {/* Transaction Status */}
        {transactionStatus === TransactionStatus.PENDING && (
          <div className="transaction-status pending">
            <div className="spinner"></div>
            <span>Transaction pending... Please confirm in your wallet</span>
          </div>
        )}

        {transactionStatus === TransactionStatus.SUCCESS && (
          <div className="transaction-status success">
            <span>✓ Policy created successfully!</span>
            {transactionHash && (
              <a
                href={`${process.env.REACT_APP_NETWORK === 'mainnet' ? 'https://explorer.qie.network' : 'https://explorer-testnet.qie.network'}/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View transaction
              </a>
            )}
          </div>
        )}

        {transactionStatus === TransactionStatus.ERROR && (
          <div className="transaction-status error">
            <span>✗ Transaction failed</span>
            {transactionError && <p>{transactionError}</p>}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="submit-button"
          disabled={
            !isConnected ||
            !isCorrectNetwork ||
            !isFormValid ||
            transactionStatus === TransactionStatus.PENDING
          }
        >
          {transactionStatus === TransactionStatus.PENDING
            ? 'Processing...'
            : `Purchase Policy (${calculatedPremium} QIE)`}
        </button>

        {!isConnected && (
          <p className="connect-prompt">Please connect your wallet to purchase a policy</p>
        )}
        {isConnected && !isCorrectNetwork && (
          <p className="connect-prompt">Please switch to the QIE network</p>
        )}
      </form>
    </div>
  );
};

export default PolicyPurchase;
