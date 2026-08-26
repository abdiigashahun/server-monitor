import { apiRequest } from './apiClient';
import { BackendUser } from './authApi';

export interface CreateUserDto {
  name: string;
  email: string;
  password?: string;
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: 'ADMIN' | 'OPERATOR' | 'VIEWER';
}

export const usersApi = {
  async getUsers(params?: { role?: string; page?: number; limit?: number }): Promise<{ users: BackendUser[]; pagination?: any }> {
    const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    return await apiRequest<{ users: BackendUser[]; pagination?: any }>(`/users${qs}`);
  },

  async getUserById(id: string): Promise<{ user: BackendUser }> {
    return await apiRequest<{ user: BackendUser }>(`/users/${id}`);
  },

  async createUser(data: CreateUserDto): Promise<{ user: BackendUser }> {
    return await apiRequest<{ user: BackendUser }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(id: string, data: UpdateUserDto): Promise<{ user: BackendUser }> {
    return await apiRequest<{ user: BackendUser }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteUser(id: string): Promise<{ success: boolean; message?: string }> {
    return await apiRequest<{ success: boolean; message?: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};
