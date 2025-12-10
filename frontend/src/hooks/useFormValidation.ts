import { useState, useCallback, useMemo } from 'react';
import { ValidationResult } from '../utils/validation';

interface FormField<T> {
  value: T;
  error: string | null;
  touched: boolean;
}

interface UseFormValidationOptions<T> {
  initialValues: T;
  validators: Partial<Record<keyof T, (value: any) => ValidationResult>>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

/**
 * Custom hook for form validation with real-time feedback
 */
export const useFormValidation = <T extends Record<string, any>>({
  initialValues,
  validators,
  validateOnChange = true,
  validateOnBlur = true,
}: UseFormValidationOptions<T>) => {
  // Initialize form state
  const [fields, setFields] = useState<Record<keyof T, FormField<any>>>(() => {
    const initial: any = {};
    for (const key in initialValues) {
      initial[key] = {
        value: initialValues[key],
        error: null,
        touched: false,
      };
    }
    return initial;
  });

  /**
   * Get current form values
   */
  const values = useMemo(() => {
    const vals: any = {};
    for (const key in fields) {
      vals[key] = fields[key].value;
    }
    return vals as T;
  }, [fields]);

  /**
   * Get current form errors
   */
  const errors = useMemo(() => {
    const errs: any = {};
    for (const key in fields) {
      if (fields[key].error) {
        errs[key] = fields[key].error;
      }
    }
    return errs as Partial<Record<keyof T, string>>;
  }, [fields]);

  /**
   * Check if form is valid
   */
  const isValid = useMemo(() => {
    return Object.values(fields).every(field => !field.error);
  }, [fields]);

  /**
   * Check if form has been touched
   */
  const isTouched = useMemo(() => {
    return Object.values(fields).some(field => field.touched);
  }, [fields]);

  /**
   * Validate a single field
   */
  const validateField = useCallback(
    (name: keyof T, value: any): string | null => {
      const validator = validators[name];
      if (!validator) return null;

      const result = validator(value);
      return result.isValid ? null : result.error || null;
    },
    [validators]
  );

  /**
   * Validate all fields
   */
  const validateAll = useCallback((): boolean => {
    let hasErrors = false;
    const newFields = { ...fields };

    for (const key in fields) {
      const error = validateField(key, fields[key].value);
      newFields[key] = {
        ...fields[key],
        error,
        touched: true,
      };
      if (error) hasErrors = true;
    }

    setFields(newFields);
    return !hasErrors;
  }, [fields, validateField]);

  /**
   * Set field value
   */
  const setValue = useCallback(
    (name: keyof T, value: any) => {
      setFields(prev => {
        const error = validateOnChange ? validateField(name, value) : prev[name].error;

        return {
          ...prev,
          [name]: {
            value,
            error,
            touched: prev[name].touched,
          },
        };
      });
    },
    [validateField, validateOnChange]
  );

  /**
   * Set multiple values at once
   */
  const setValues = useCallback(
    (newValues: Partial<T>) => {
      setFields(prev => {
        const updated = { ...prev };

        for (const key in newValues) {
          const value = newValues[key];
          const error = validateOnChange ? validateField(key, value) : prev[key].error;

          updated[key] = {
            value,
            error,
            touched: prev[key].touched,
          };
        }

        return updated;
      });
    },
    [validateField, validateOnChange]
  );

  /**
   * Mark field as touched
   */
  const setTouched = useCallback(
    (name: keyof T, touched: boolean = true) => {
      setFields(prev => {
        const error = validateOnBlur && touched ? validateField(name, prev[name].value) : prev[name].error;

        return {
          ...prev,
          [name]: {
            ...prev[name],
            error,
            touched,
          },
        };
      });
    },
    [validateField, validateOnBlur]
  );

  /**
   * Set field error manually
   */
  const setError = useCallback((name: keyof T, error: string | null) => {
    setFields(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        error,
      },
    }));
  }, []);

  /**
   * Set multiple errors at once
   */
  const setErrors = useCallback((newErrors: Partial<Record<keyof T, string | null>>) => {
    setFields(prev => {
      const updated = { ...prev };

      for (const key in newErrors) {
        updated[key] = {
          ...prev[key],
          error: newErrors[key] || null,
        };
      }

      return updated;
    });
  }, []);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setFields(prev => {
      const cleared: any = {};
      for (const key in prev) {
        cleared[key] = {
          ...prev[key],
          error: null,
        };
      }
      return cleared;
    });
  }, []);

  /**
   * Reset form to initial values
   */
  const reset = useCallback(() => {
    const initial: any = {};
    for (const key in initialValues) {
      initial[key] = {
        value: initialValues[key],
        error: null,
        touched: false,
      };
    }
    setFields(initial);
  }, [initialValues]);

  /**
   * Get field props for input binding
   */
  const getFieldProps = useCallback(
    (name: keyof T) => ({
      value: fields[name].value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setValue(name, e.target.value);
      },
      onBlur: () => {
        setTouched(name, true);
      },
    }),
    [fields, setValue, setTouched]
  );

  /**
   * Get field error (only if touched)
   */
  const getFieldError = useCallback(
    (name: keyof T): string | null => {
      return fields[name].touched ? fields[name].error : null;
    },
    [fields]
  );

  /**
   * Check if field has error
   */
  const hasFieldError = useCallback(
    (name: keyof T): boolean => {
      return fields[name].touched && !!fields[name].error;
    },
    [fields]
  );

  return {
    values,
    errors,
    fields,
    isValid,
    isTouched,
    setValue,
    setValues,
    setTouched,
    setError,
    setErrors,
    clearErrors,
    validateField,
    validateAll,
    reset,
    getFieldProps,
    getFieldError,
    hasFieldError,
  };
};
