import api from './api';

export const adminAnalyticsService = {
  getDashboardStats: async () => (await api.get('/admin/analytics/dashboard')).data,
  getRevenueTrends: async (period = 'month') => (await api.get(`/admin/analytics/revenue-trends?period=${period}`)).data,
  getBookingDistribution: async () => (await api.get('/admin/analytics/booking-status-distribution')).data,
  getTopTaskers: async (limit = 10) => (await api.get(`/admin/analytics/top-performing-taskers?limit=${limit}`)).data,
  getCategoryPerformance: async () => (await api.get('/admin/analytics/category-performance')).data,
  getUserGrowth: async (days = 30) => (await api.get(`/admin/analytics/user-growth?days=${days}`)).data,
  getPaymentAnalytics: async () => (await api.get('/admin/analytics/payment-analytics')).data,
  getComplaintsSummary: async () => (await api.get('/admin/analytics/complaints-summary')).data,
};

export const adminUsersService = {
  getCustomers: async (params) => (await api.get('/admin/users/customers', { params })).data,
  getTaskers: async (params) => (await api.get('/admin/users/taskers', { params })).data,
  getCustomerDetails: async (userId) => (await api.get(`/admin/users/customers/${userId}/details`)).data,
  getTaskerDetails: async (userId) => (await api.get(`/admin/users/taskers/${userId}/details`)).data,
  customerAction: async (userId, action, reason) => (await api.post(`/admin/users/customers/${userId}/action`, { action, reason })).data,
  taskerAction: async (userId, action, reason) => (await api.post(`/admin/users/taskers/${userId}/action`, { action, reason })).data,
};

export const adminBookingsService = {
  getActiveBookings: async (params) => (await api.get('/admin/bookings/active', { params })).data,
  getAllBookings: async (params) => (await api.get('/admin/bookings/all', { params })).data,
  getBookingDetails: async (bookingId) => (await api.get(`/admin/bookings/${bookingId}`)).data,
  managePayment: async (bookingId, action, amount, reason) => (await api.post(`/admin/bookings/${bookingId}/payment`, { action, amount, reason })).data,
  getBookingTimeline: async (days = 30) => (await api.get(`/admin/bookings/analytics/timeline?days=${days}`)).data,
  cancelBooking: async (bookingId, reason) => (await api.post(`/admin/bookings/${bookingId}/cancel`, { reason })).data,
};
