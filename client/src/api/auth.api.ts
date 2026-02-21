import api from './axios';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data.data),

  getMe: () => api.get('/auth/me').then((r) => r.data.data),

  updateMe: (data: { name?: string; password?: string }) =>
    api.put('/auth/me', data).then((r) => r.data.data),
};
