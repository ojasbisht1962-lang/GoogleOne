import axios from 'axios';
import config from '../config';

const API_URL = config.API_BASE_URL;

const getAuthHeader = () => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const addressService = {
  // Get all addresses for current user
  getAddresses: async () => {
    const response = await axios.get(`${API_URL}/addresses/`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Create new address
  createAddress: async (addressData) => {
    const response = await axios.post(`${API_URL}/addresses/`, addressData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Get single address
  getAddress: async (addressId) => {
    const response = await axios.get(`${API_URL}/addresses/${addressId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Update address
  updateAddress: async (addressId, addressData) => {
    const response = await axios.put(`${API_URL}/addresses/${addressId}`, addressData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Delete address
  deleteAddress: async (addressId) => {
    const response = await axios.delete(`${API_URL}/addresses/${addressId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Set default address
  setDefaultAddress: async (addressId) => {
    const response = await axios.post(`${API_URL}/addresses/${addressId}/set-default`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  }
};
