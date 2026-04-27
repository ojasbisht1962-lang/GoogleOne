import api from './api';

export const authService = {
  googleLogin: async (token, role) => (await api.post('/auth/google-login', { token, role })).data,
  // Email/password authentication has been removed - only Google OAuth and Guest login are supported
  logout: () => { localStorage.removeItem('access_token'); localStorage.removeItem('user'); },
  getCurrentUser: () => { const user = localStorage.getItem('user'); return user ? JSON.parse(user) : null; },
  getToken: () => localStorage.getItem('access_token'),
  setAuth: (token, user) => { localStorage.setItem('access_token', token); localStorage.setItem('user', JSON.stringify(user)); },
};

export const userService = {
  getProfile: async () => (await api.get('/users/me')).data,
  updateProfile: async (data) => (await api.put('/users/me', data)).data,
  completeTaskerProfile: async (data) => (await api.post('/users/tasker/complete-profile', data)).data,
  getTaskers: async (params) => (await api.get('/users/taskers', { params })).data,
  getTaskerDetails: async (taskerId) => (await api.get(`/users/taskers/${taskerId}`)).data,
};

export const serviceService = {
  createService: async (data) => (await api.post('/services/', data)).data,
  getServices: async (params) => (await api.get('/services/', { params })).data,
  getMyServices: async () => (await api.get('/services/my-services')).data,
  getService: async (serviceId) => (await api.get(`/services/${serviceId}`)).data,
  updateService: async (serviceId, data) => (await api.put(`/services/${serviceId}`, data)).data,
  deleteService: async (serviceId) => (await api.delete(`/services/${serviceId}`)).data,
};

export const bookingService = {
  createBooking: async (data) => (await api.post('/bookings/', data)).data,
  getMyBookings: async (status, viewAs) => {
    const params = {};
    if (status) params.status = status;
    if (viewAs) params.view_as = viewAs;
    return (await api.get('/bookings/my-bookings', { params })).data;
  },
  getBooking: async (bookingId) => (await api.get(`/bookings/${bookingId}`)).data,
  updateBookingStatus: async (bookingId, status) => (await api.put(`/bookings/${bookingId}/status`, { status })).data,
  rateBooking: async (bookingId, rating, review) => (await api.post(`/bookings/${bookingId}/rate`, { rating, review })).data,
};

export const chatService = {
  sendMessage: async (recipientId, content) => (await api.post('/chat/send', { recipient_id: recipientId, content })).data,
  getConversations: async () => (await api.get('/chat/conversations')).data,
  getChat: async (chatId) => (await api.get(`/chat/${chatId}`)).data,
  deleteChat: async (chatId) => (await api.delete(`/chat/${chatId}`)).data,
};

export const notificationService = {
  getNotifications: async (unreadOnly = false, limit = 50) => (await api.get('/notifications/', { params: { unread_only: unreadOnly, limit } })).data,
  getUnreadCount: async () => (await api.get('/notifications/unread-count')).data,
  markAsRead: async (notificationId) => (await api.put(`/notifications/${notificationId}/read`)).data,
  markAllAsRead: async () => (await api.put('/notifications/mark-all-read')).data,
  deleteNotification: async (notificationId) => (await api.delete(`/notifications/${notificationId}`)).data,
};

export const amcService = {
  createAMC: async (data) => (await api.post('/amc/', data)).data,
  getMyAMCRequests: async () => (await api.get('/amc/my-requests')).data,
  getAllAMCRequests: async (status) => (await api.get('/amc/all', { params: status ? { status } : {} })).data,
  getAMCRequest: async (amcId) => (await api.get(`/amc/${amcId}`)).data,
  updateAMCStatus: async (amcId, data) => (await api.put(`/amc/${amcId}/status`, data)).data,
};

export const adminService = {
  getStats: async () => (await api.get('/admin/stats')).data,
  getAllUsers: async (params) => (await api.get('/admin/users', { params })).data,
  getPendingVerifications: async () => (await api.get('/admin/taskers/pending-verification')).data,
  updateVerificationStatus: async (taskerId, status, notes) => (await api.put(`/admin/taskers/${taskerId}/verification`, { status, notes })).data,
  blockUser: async (userId, reason) => (await api.put(`/admin/users/${userId}/block`, { reason })).data,
  unblockUser: async (userId) => (await api.put(`/admin/users/${userId}/unblock`)).data,
  getPriceRanges: async () => (await api.get('/admin/price-ranges')).data,
  createPriceRange: async (data) => (await api.post('/admin/price-ranges', data)).data,
  deletePriceRange: async (category) => (await api.delete(`/admin/price-ranges/${category}`)).data,
  getAllBookings: async (params) => (await api.get('/admin/bookings', { params })).data,
  getAllServices: async () => (await api.get('/admin/services')).data,
};

export const badgeService = {
  getBadgeInfo: async () => (await api.get('/badges/badge-info')).data,
  checkEligibility: async (badgeType) => (await api.get(`/badges/check-eligibility/${badgeType}`)).data,
  applyForBadge: async (badgeType) => (await api.post(`/badges/apply/${badgeType}`)).data,
  getMyApplications: async () => (await api.get('/badges/my-applications')).data,
  // Admin endpoints
  getAllApplications: async (status) => (await api.get('/badges/admin/applications', { params: status ? { status } : {} })).data,
  reviewApplication: async (applicationId, action, adminNotes) => (await api.put(`/badges/admin/applications/${applicationId}`, null, { params: { action, admin_notes: adminNotes } })).data,
};

export const walletService = {
  getMyWallet: async () => (await api.get('/api/wallet/my-wallet')).data,
  addFunds: async (amount, paymentMethod) => (await api.post('/api/wallet/add-funds', { amount, payment_method: paymentMethod })).data,
  getTransactions: async (limit = 50) => (await api.get('/api/wallet/transactions', { params: { limit } })).data,
  getBalance: async () => (await api.get('/api/wallet/balance')).data,
  lockFunds: async (amount, bookingId) => (await api.post('/api/wallet/lock-funds', { amount, booking_id: bookingId })).data,
};
