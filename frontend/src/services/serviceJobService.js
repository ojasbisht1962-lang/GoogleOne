import api from './api';

export const serviceJobService = {
  createServiceJob: async (category, jobData) => (await api.post('/users/service-jobs', { category, ...jobData })).data,
  getMyServices: async () => {
    const response = await api.get('/users/service-jobs');
    return response.data.services || [];
  },
  updateService: async (serviceId, updateData) => (await api.put(`/users/service-jobs/${serviceId}`, updateData)).data,
  deleteService: async (serviceId) => (await api.delete(`/users/service-jobs/${serviceId}`)).data,
};
