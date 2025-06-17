
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { sanitizeInput } from '@/utils/inputValidation';
import { cn } from '@/lib/utils';

interface SecureInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  sanitize?: boolean;
  maxLength?: number;
}

export const SecureInput = React.forwardRef<HTMLInputElement, SecureInputProps>(
  ({ sanitize = true, maxLength = 255, onChange, ...props }, ref) => {
    const [hasError, setHasError] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;

      // Length validation
      if (maxLength && value.length > maxLength) {
        setHasError(true);
        return;
      }

      // Sanitization
      if (sanitize) {
        const sanitized = sanitizeInput(value);
        if (sanitized !== value) {
          value = sanitized;
          e.target.value = sanitized;
        }
      }

      setHasError(false);
      
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <Input
        ref={ref}
        {...props}
        onChange={handleChange}
        className={cn(
          props.className,
          hasError && "border-destructive focus-visible:ring-destructive"
        )}
        maxLength={maxLength}
      />
    );
  }
);

SecureInput.displayName = "SecureInput";
