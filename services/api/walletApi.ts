import { apiRequest } from './apiClient';
import { GetTransactionsPayload, Wallet, WalletTransaction } from '@/types';

export const walletApi = {
  /**
   * Retrieves current customer wallet balance by User ID.
   * Hits `GET /api/v1/wallet/:id`.
   */
  async getMyWallet(userId: string): Promise<Wallet> {
    return await apiRequest<Wallet>(`wallet/${userId}`, {
      method: 'GET',
    });
  },

  /**
   * Retrieves the customer's wallet transactions ledger.
   * Hits `GET /api/v1/wallet/transactions`.
   */
  async getTransactions(
    query?: GetTransactionsPayload
  ): Promise<WalletTransaction[]> {
    return await apiRequest<WalletTransaction[]>('wallet/transactions', {
      method: 'GET',
      params: query,
    });
  },

  /**
   * Deducts funds from own wallet for self-service or settlement.
   * Hits `POST /api/v1/wallet/deduct`.
   */
  async deductSelf(
    amount: number,
    description?: string
  ): Promise<WalletTransaction> {
    return await apiRequest<WalletTransaction>('wallet/deduct', {
      method: 'POST',
      body: JSON.stringify({ amount, description }),
    });
  },
};
