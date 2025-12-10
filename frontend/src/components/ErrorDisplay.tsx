import React from 'react';
import { ErrorType, parseWeb3Error } from '../utils/errorHandling';
import './ErrorDisplay.css';

interface ErrorDisplayProps {
  error: string | Error | any;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * ErrorDisplay Component
 * Displays user-friendly error messages with retry and dismiss options
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  className = '',
}) => {
  if (!error) return null;

  // Parse error to get structured information
  const errorString = typeof error === 'string' ? error : error.message || 'An error occurred';
  const parsedError = typeof error === 'object' && error !== null
    ? parseWeb3Error(error)
    : { type: ErrorType.UNKNOWN_ERROR, message: errorString, retryable: false };

  /**
   * Get icon based on error type
   */
  const getErrorIcon = (): string => {
    switch (parsedError.type) {
      case ErrorType.TRANSACTION_REJECTED:
        return '🚫';
      case ErrorType.INSUFFICIENT_FUNDS:
        return '💰';
      case ErrorType.NETWORK_ERROR:
        return '🌐';
      case ErrorType.CONTRACT_ERROR:
        return '📜';
      case ErrorType.VALIDATION_ERROR:
        return '⚠️';
      case ErrorType.WALLET_ERROR:
        return '🦊';
      default:
        return '❌';
    }
  };

  /**
   * Get CSS class based on error type
   */
  const getErrorClass = (): string => {
    const baseClass = 'error-display';
    const typeClass = parsedError.type.toLowerCase().replace('_', '-');
    return `${baseClass} ${typeClass} ${className}`.trim();
  };

  return (
    <div className={getErrorClass()} role="alert">
      <div className="error-content">
        <span className="error-icon">{getErrorIcon()}</span>
        <div className="error-message-container">
          <p className="error-message">{parsedError.message}</p>
          {parsedError.type === ErrorType.NETWORK_ERROR && (
            <p className="error-hint">
              Check your internet connection and ensure you're connected to the QIE network.
            </p>
          )}
          {parsedError.type === ErrorType.INSUFFICIENT_FUNDS && (
            <p className="error-hint">
              You need more QIE tokens to complete this transaction.
            </p>
          )}
        </div>
      </div>

      <div className="error-actions">
        {parsedError.retryable && onRetry && (
          <button className="error-retry-btn" onClick={onRetry}>
            Retry
          </button>
        )}
        {onDismiss && (
          <button className="error-dismiss-btn" onClick={onDismiss} aria-label="Dismiss error">
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;
