
import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { sanitizeInput } from '@/utils/inputValidation';
import { cn } from '@/lib/utils';

interface SecureTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  sanitize?: boolean;
  maxLength?: number;
}

export const SecureTextarea = React.forwardRef<HTMLTextAreaElement, SecureTextareaProps>(
  ({ sanitize = true, maxLength = 1000, onChange, ...props }, ref) => {
    const [hasError, setHasError] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
      <Textarea
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

SecureTextarea.displayName = "SecureTextarea";
