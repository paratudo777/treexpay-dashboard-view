
export interface WithdrawalRequest {
  id: string;
  user: string;
  userName: string;
  userEmail: string;
  amount: number;
  pixKeyType: string;
  pixKey: string;
  status: 'pending' | 'approved' | 'denied' | 'paid';
  requestedAt: string;
  processedAt?: string;
}

export type WithdrawalStatus = WithdrawalRequest['status'];
