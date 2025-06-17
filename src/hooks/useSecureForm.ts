
import { useState, useCallback } from 'react';
import { sanitizeInput, validateEmail, validateAmount } from '@/utils/inputValidation';
import { rateLimiter } from '@/utils/rateLimiter';
import { useToast } from '@/hooks/use-toast';

interface UseSecureFormOptions {
  rateLimitKey: string;
  maxRequests?: number;
  windowMs?: number;
}

export const useSecureForm = (options: UseSecureFormOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const secureSubmit = useCallback(async (
    submitFn: () => Promise<void>,
    data: Record<string, any>
  ) => {
    // Rate limiting check
    const isAllowed = rateLimiter.isAllowed(options.rateLimitKey, {
      maxRequests: options.maxRequests || 5,
      windowMs: options.windowMs || 60000
    });

    if (!isAllowed) {
      toast({
        variant: "destructive",
        title: "Muitas tentativas",
        description: "Aguarde antes de tentar novamente.",
      });
      return;
    }

    // Input sanitization
    const sanitizedData = Object.entries(data).reduce((acc, [key, value]) => {
      if (typeof value === 'string') {
        acc[key] = sanitizeInput(value);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    // Validation checks
    if (sanitizedData.email && !validateEmail(sanitizedData.email)) {
      toast({
        variant: "destructive",
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
      });
      return;
    }

    if (sanitizedData.amount && !validateAmount(Number(sanitizedData.amount))) {
      toast({
        variant: "destructive",
        title: "Valor inválido",
        description: "Valor deve estar entre R$ 0,01 e R$ 50.000,00.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await submitFn();
    } catch (error) {
      console.error('Secure form submission error:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [options, toast]);

  return {
    secureSubmit,
    isSubmitting
  };
};
