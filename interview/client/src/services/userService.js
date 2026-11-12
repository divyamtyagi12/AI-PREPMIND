import api from './api';

export const userService = {
  getProfile: () => api.get('/users/profile').then((r) => r.data.data.user),
  updateProfile: (payload) => api.patch('/users/profile', payload).then((r) => r.data.data.user),
  changePassword: (payload) => api.patch('/users/password', payload).then((r) => r.data),
};

