# Error Handling and Validation Guide

This guide explains how to use the comprehensive error handling and validation utilities implemented for the Weather Insurance dApp frontend.

## Table of Contents

1. [Error Handling](#error-handling)
2. [Form Validation](#form-validation)
3. [Network Utilities](#network-utilities)
4. [Loading States](#loading-states)
5. [UI Components](#ui-components)
6. [Custom Hooks](#custom-hooks)

## Error Handling

### Parsing Web3 Errors

The `parseWeb3Error` function converts raw Web3/MetaMask errors into user-friendly messages:

```typescript
import { parseWeb3Error, getErrorMessage } from '../utils/errorHandling';

try {
  await contract.methods.createPolicy(...).send({ from: account });
} catch (error) {
  const parsedError = parseWeb3Error(error);
  console.log(parsedError.message); // User-friendly message
  console.log(parsedError.type); // Error type enum
  console.log(parsedError.retryable); // Whether error is retryable
}

// Or simply get the message:
const message = getErrorMessage(error);
```

### Retry Logic with Exponential Backoff

```typescript
import { retryWithBackoff } from '../utils/errorHandling';

const result = await retryWithBackoff(
  async () => {
    return await contract.methods.getPoolStats().call();
  },
  3, // max retries
  1000 // initial delay in ms
);
```

### Error Types

The system recognizes these error types:
- `TRANSACTION_REJECTED` - User rejected the transaction
- `INSUFFICIENT_FUNDS` - Not enough balance
- `NETWORK_ERROR` - Connection issues
- `CONTRACT_ERROR` - Smart contract reverted
- `VALIDATION_ERROR` - Form validation failed
- `WALLET_ERROR` - Wallet connection issues
- `UNKNOWN_ERROR` - Unrecognized error

## Form Validation

### Individual Field Validation

```typescript
import {
  validateLocation,
  validatePayoutAmount,
  validateCoveragePeriod,
} from '../utils/validation';

// Validate location
const locationResult = validateLocation(userInput);
if (!locationResult.isValid) {
  console.error(locationResult.error);
}

// Validate payout amount
const payoutResult = validatePayoutAmount('5.5');
if (payoutResult.isValid) {
  // Proceed with valid amount
}

// Validate coverage period
const periodResult = validateCoveragePeriod(startDate, endDate);
```

### Using the Form Validation Hook

```typescript
import { useFormValidation } from '../hooks/useFormValidation';
import { validateLocation, validatePayoutAmount } from '../utils/validation';

const MyForm = () => {
  const {
    values,
    errors,
    isValid,
    setValue,
    getFieldProps,
    getFieldError,
    validateAll,
    reset,
  } = useFormValidation({
    initialValues: {
      location: '',
      payoutAmount: '',
    },
    validators: {
      location: validateLocation,
      payoutAmount: validatePayoutAmount,
    },
    validateOnChange: true,
    validateOnBlur: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateAll()) {
      // Submit form
      console.log(values);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input {...getFieldProps('location')} />
      {getFieldError('location') && (
        <span className="error">{getFieldError('location')}</span>
      )}

      <input {...getFieldProps('payoutAmount')} type="number" />
      {getFieldError('payoutAmount') && (
        <span className="error">{getFieldError('payoutAmount')}</span>
      )}

      <button type="submit" disabled={!isValid}>
        Submit
      </button>
    </form>
  );
};
```

## Network Utilities

### Check Network Status

```typescript
import { getNetworkStatus, checkRPCConnection } from '../utils/networkUtils';

// Get comprehensive network status
const status = await getNetworkStatus(rpcUrl);
console.log(status.isOnline); // Browser online status
console.log(status.isConnectedToRPC); // RPC connection status
console.log(status.latency); // RPC latency in ms

// Quick RPC check
const isConnected = await checkRPCConnection(rpcUrl);
```

### Network Monitoring

```typescript
import { NetworkMonitor } from '../utils/networkUtils';

const monitor = new NetworkMonitor(rpcUrl);

// Add listener for status changes
monitor.addListener((status) => {
  if (!status.isConnectedToRPC) {
    showError('Lost connection to blockchain');
  }
});

// Start monitoring
monitor.start(10000); // Check every 10 seconds

// Stop monitoring when component unmounts
monitor.stop();
```

### Execute with Network Retry

```typescript
import { executeWithNetworkRetry } from '../utils/networkUtils';

const data = await executeWithNetworkRetry(
  async () => {
    return await contract.methods.getPolicy(policyId).call();
  },
  rpcUrl,
  {
    maxRetries: 3,
    initialDelay: 1000,
    waitForNetwork: true, // Wait for network to be available
  }
);
```

## Loading States

### Using Async State Manager

```typescript
import { AsyncStateManager } from '../utils/loadingStates';

const stateManager = new AsyncStateManager();

// Subscribe to state changes
stateManager.subscribe((state) => {
  console.log(state.state); // 'idle', 'loading', 'success', 'error'
  console.log(state.data);
  console.log(state.error);
});

// Execute async operation
try {
  const result = await stateManager.execute(async () => {
    return await fetchData();
  });
} catch (error) {
  // Error is automatically set in state
}
```

### Using the Async Operation Hook

```typescript
import { useAsyncOperation } from '../hooks/useAsyncOperation';

const MyComponent = () => {
  const {
    execute,
    isLoading,
    isSuccess,
    isError,
    data,
    error,
    reset,
  } = useAsyncOperation({
    onSuccess: (data) => {
      console.log('Operation succeeded:', data);
    },
    onError: (error) => {
      console.error('Operation failed:', error);
    },
    retryOnError: true,
    maxRetries: 3,
  });

  const handleFetch = async () => {
    await execute(async () => {
      return await contract.methods.getPoolStats().call();
    });
  };

  return (
    <div>
      <button onClick={handleFetch} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Fetch Data'}
      </button>

      {isError && <div className="error">{error}</div>}
      {isSuccess && <div>Data: {JSON.stringify(data)}</div>}
    </div>
  );
};
```

## UI Components

### ErrorDisplay Component

```typescript
import ErrorDisplay from '../components/ErrorDisplay';

const MyComponent = () => {
  const [error, setError] = useState(null);

  const handleRetry = () => {
    setError(null);
    // Retry operation
  };

  return (
    <div>
      <ErrorDisplay
        error={error}
        onRetry={handleRetry}
        onDismiss={() => setError(null)}
      />
    </div>
  );
};
```

### LoadingSpinner Component

```typescript
import LoadingSpinner from '../components/LoadingSpinner';

const MyComponent = () => {
  const [loading, setLoading] = useState(false);

  return (
    <div>
      {loading && (
        <LoadingSpinner
          size="medium"
          message="Loading policies..."
          fullScreen={false}
        />
      )}
    </div>
  );
};
```

### Toast Notifications

```typescript
import { ToastProvider, useToast } from '../components/ToastContainer';

// Wrap your app with ToastProvider
const App = () => (
  <ToastProvider>
    <YourApp />
  </ToastProvider>
);

// Use toast in components
const MyComponent = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  const handleSuccess = () => {
    showSuccess('Policy created successfully!');
  };

  const handleError = () => {
    showError('Transaction failed. Please try again.');
  };

  return (
    <div>
      <button onClick={handleSuccess}>Show Success</button>
      <button onClick={handleError}>Show Error</button>
    </div>
  );
};
```

## Custom Hooks

### useFormValidation

See [Form Validation](#using-the-form-validation-hook) section above.

### useAsyncOperation

See [Loading States](#using-the-async-operation-hook) section above.

## Best Practices

1. **Always parse Web3 errors** before displaying to users
2. **Use validation on both change and blur** for better UX
3. **Implement retry logic** for network-related operations
4. **Show loading states** for all async operations
5. **Provide clear error messages** with actionable steps
6. **Use toast notifications** for non-blocking feedback
7. **Monitor network status** for better error handling
8. **Clear errors** when user takes corrective action

## Example: Complete Form with Error Handling

```typescript
import React from 'react';
import { useFormValidation } from '../hooks/useFormValidation';
import { useAsyncOperation } from '../hooks/useAsyncOperation';
import { useToast } from '../components/ToastContainer';
import { validateLocation, validatePayoutAmount } from '../utils/validation';
import ErrorDisplay from '../components/ErrorDisplay';
import LoadingSpinner from '../components/LoadingSpinner';

const PolicyForm = () => {
  const { showSuccess, showError } = useToast();

  const {
    values,
    getFieldProps,
    getFieldError,
    validateAll,
    reset,
  } = useFormValidation({
    initialValues: {
      location: '',
      payoutAmount: '',
    },
    validators: {
      location: validateLocation,
      payoutAmount: validatePayoutAmount,
    },
  });

  const {
    execute,
    isLoading,
    error,
    clearError,
  } = useAsyncOperation({
    onSuccess: () => {
      showSuccess('Policy created successfully!');
      reset();
    },
    onError: () => {
      showError('Failed to create policy');
    },
    retryOnError: true,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateAll()) {
      return;
    }

    await execute(async () => {
      // Submit to blockchain
      return await contract.methods.createPolicy(...).send({ from: account });
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={handleSubmit}
          onDismiss={clearError}
        />
      )}

      <div>
        <input {...getFieldProps('location')} placeholder="Location" />
        {getFieldError('location') && (
          <span className="error">{getFieldError('location')}</span>
        )}
      </div>

      <div>
        <input
          {...getFieldProps('payoutAmount')}
          type="number"
          placeholder="Payout Amount"
        />
        {getFieldError('payoutAmount') && (
          <span className="error">{getFieldError('payoutAmount')}</span>
        )}
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? <LoadingSpinner size="small" /> : 'Create Policy'}
      </button>
    </form>
  );
};

export default PolicyForm;
```

## Testing

All utilities include comprehensive test coverage. Run tests with:

```bash
npm test -- errorHandling.test.ts validation.test.ts
```

## Summary

This error handling and validation system provides:

✅ User-friendly error messages
✅ Automatic retry logic for transient failures
✅ Real-time form validation
✅ Network status monitoring
✅ Loading state management
✅ Reusable UI components
✅ Custom hooks for common patterns
✅ Comprehensive test coverage

All components and utilities are designed to work together seamlessly while remaining modular and reusable.
