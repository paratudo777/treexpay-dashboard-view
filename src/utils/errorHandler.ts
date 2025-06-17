
// Secure error handling utilities
interface ErrorLogEntry {
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  userId?: string;
  action?: string;
}

class SecureErrorHandler {
  private logs: ErrorLogEntry[] = [];
  private readonly maxLogs = 100;

  logError(error: Error | string, userId?: string, action?: string): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: typeof error === 'string' ? error : 'An error occurred',
      userId,
      action
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Only log non-sensitive information to console
    console.error('Application error:', {
      timestamp: entry.timestamp,
      action: entry.action,
      message: 'Error occurred'
    });
  }

  logWarning(message: string, userId?: string, action?: string): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warning',
      message,
      userId,
      action
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
  }

  getFilteredError(error: any): string {
    // Filter out sensitive information from error messages
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /key/i,
      /secret/i,
      /api[_-]?key/i,
      /authorization/i,
      /bearer/i
    ];

    let message = typeof error === 'string' ? error : error?.message || 'Erro interno';

    sensitivePatterns.forEach(pattern => {
      if (pattern.test(message)) {
        message = 'Erro de autenticação';
      }
    });

    return message;
  }

  getUserFriendlyMessage(error: any): string {
    const errorMessage = this.getFilteredError(error);

    // Map technical errors to user-friendly messages
    const errorMappings: Record<string, string> = {
      'network error': 'Problema de conexão. Verifique sua internet.',
      'timeout': 'Operação demorou muito. Tente novamente.',
      'unauthorized': 'Sessão expirada. Faça login novamente.',
      'forbidden': 'Acesso negado.',
      'not found': 'Recurso não encontrado.',
      'validation error': 'Dados inválidos. Verifique os campos.',
      'rate limit': 'Muitas tentativas. Aguarde um momento.',
      'server error': 'Erro interno. Tente novamente em alguns minutos.'
    };

    const lowerMessage = errorMessage.toLowerCase();
    for (const [key, friendlyMessage] of Object.entries(errorMappings)) {
      if (lowerMessage.includes(key)) {
        return friendlyMessage;
      }
    }

    return 'Ocorreu um erro inesperado. Tente novamente.';
  }

  getRecentLogs(count: number = 10): ErrorLogEntry[] {
    return this.logs.slice(0, count);
  }
}

export const errorHandler = new SecureErrorHandler();

export const handleSecureError = (
  error: any,
  userId?: string,
  action?: string
): string => {
  errorHandler.logError(error, userId, action);
  return errorHandler.getUserFriendlyMessage(error);
};
