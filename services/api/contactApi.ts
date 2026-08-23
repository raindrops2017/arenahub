import { apiRequest } from './apiClient';

export interface CreateContactPayload {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  campaignType?: string;
  message?: string;
}

export interface ContactResponse {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  campaignType?: string;
  message?: string;
  status: string;
  createdAt: string;
}

export const contactApi = {
  /**
   * Submits a customer contact / advertising message to the backend database.
   * Hits `POST /api/v1/contacts`.
   */
  async submitInquiry(payload: CreateContactPayload): Promise<{ message: string; data: ContactResponse }> {
    return apiRequest<{ message: string; data: ContactResponse }>('contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },
};

export default contactApi;
