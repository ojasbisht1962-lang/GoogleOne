import api from './api';

/**
 * Provider Selection Service
 * Handles all provider selection, filtering, sorting, and favorites functionality
 */

class ProviderSelectionService {
  /**
   * Search and filter providers with advanced options
   * @param {Object} searchParams - Search parameters
   * @param {Object} searchParams.current_location - {latitude, longitude}
   * @param {Object} searchParams.filters - Filter options
   * @param {string} searchParams.sort_by - Sort option (rating_high, distance_near, etc.)
   * @param {number} searchParams.page - Page number
   * @param {number} searchParams.limit - Items per page
   * @returns {Promise} Provider search results
   */
  async searchProviders(searchParams) {
    try {
      const response = await api.post('/provider-selection/search', searchParams);
      return response.data;
    } catch (error) {
      console.error('Error searching providers:', error);
      throw error;
    }
  }

  /**
   * Add a provider to favorites
   * @param {string} providerId - Provider's ID
   * @returns {Promise}
   */
  async addFavoriteProvider(providerId) {
    try {
      const response = await api.post('/provider-selection/favorites/add', {
        provider_id: providerId
      });
      return response.data;
    } catch (error) {
      console.error('Error adding favorite provider:', error);
      throw error;
    }
  }

  /**
   * Remove a provider from favorites
   * @param {string} providerId - Provider's ID
   * @returns {Promise}
   */
  async removeFavoriteProvider(providerId) {
    try {
      const response = await api.post('/provider-selection/favorites/remove', {
        provider_id: providerId
      });
      return response.data;
    } catch (error) {
      console.error('Error removing favorite provider:', error);
      throw error;
    }
  }

  /**
   * Get all favorite providers
   * @returns {Promise} List of favorite providers with details
   */
  async getFavoriteProviders() {
    try {
      const response = await api.get('/provider-selection/favorites');
      return response.data;
    } catch (error) {
      console.error('Error fetching favorite providers:', error);
      throw error;
    }
  }

  /**
   * Check if a provider is favorited
   * @param {string} providerId - Provider's ID
   * @returns {Promise} {is_favorite: boolean}
   */
  async checkFavoriteStatus(providerId) {
    try {
      const response = await api.get(`/provider-selection/favorites/check/${providerId}`);
      return response.data;
    } catch (error) {
      console.error('Error checking favorite status:', error);
      throw error;
    }
  }

  /**
   * Quick rebook with a previously hired provider
   * @param {Object} rebookData - Rebooking data
   * @param {string} rebookData.provider_id - Provider's ID
   * @param {string} rebookData.service_id - Service ID
   * @param {string} rebookData.scheduled_date - Date in YYYY-MM-DD format
   * @param {string} rebookData.scheduled_time - Time in HH:MM format
   * @param {string} rebookData.address - Service address
   * @param {string} rebookData.notes - Optional notes
   * @returns {Promise} Created booking
   */
  async quickRebook(rebookData) {
    try {
      const response = await api.post('/provider-selection/quick-rebook', rebookData);
      return response.data;
    } catch (error) {
      console.error('Error creating quick rebook:', error);
      throw error;
    }
  }

  /**
   * Get available sorting options
   * @returns {Promise} List of available sorting options
   */
  async getSortingOptions() {
    try {
      const response = await api.get('/provider-selection/sorting-options');
      return response.data;
    } catch (error) {
      console.error('Error fetching sorting options:', error);
      throw error;
    }
  }

  /**
   * Get available filter options with metadata
   * @returns {Promise} Filter options metadata
   */
  async getFilterOptions() {
    try {
      const response = await api.get('/provider-selection/filter-options');
      return response.data;
    } catch (error) {
      console.error('Error fetching filter options:', error);
      throw error;
    }
  }

  /**
   * Get providers by service type
   * @param {string} serviceId - Service ID
   * @param {Object} location - {latitude, longitude}
   * @param {Object} filters - Optional filters
   * @returns {Promise} Filtered providers for the service
   */
  async getProvidersByService(serviceId, location, filters = {}) {
    try {
      const searchParams = {
        current_location: location,
        filters: {
          ...filters,
          service_id: serviceId
        },
        sort_by: 'rating_high',
        page: 1,
        limit: 50
      };
      return await this.searchProviders(searchParams);
    } catch (error) {
      console.error('Error fetching providers by service:', error);
      throw error;
    }
  }

  /**
   * Get nearest providers
   * @param {Object} location - {latitude, longitude}
   * @param {number} maxDistance - Maximum distance in km
   * @param {number} limit - Number of providers to return
   * @returns {Promise} Nearest providers
   */
  async getNearestProviders(location, maxDistance = 10, limit = 10) {
    try {
      const searchParams = {
        current_location: location,
        filters: {
          max_distance: maxDistance,
          rating_min: 3.0 // Only show providers with decent ratings
        },
        sort_by: 'distance_near',
        page: 1,
        limit: limit
      };
      return await this.searchProviders(searchParams);
    } catch (error) {
      console.error('Error fetching nearest providers:', error);
      throw error;
    }
  }

  /**
   * Get top rated providers
   * @param {Object} location - {latitude, longitude}
   * @param {number} limit - Number of providers to return
   * @returns {Promise} Top rated providers
   */
  async getTopRatedProviders(location, limit = 10) {
    try {
      const searchParams = {
        current_location: location,
        filters: {
          rating_min: 4.0, // Only highly rated providers
          verified_only: true
        },
        sort_by: 'rating_high',
        page: 1,
        limit: limit
      };
      return await this.searchProviders(searchParams);
    } catch (error) {
      console.error('Error fetching top rated providers:', error);
      throw error;
    }
  }

  /**
   * Get previously hired providers
   * @param {Object} location - {latitude, longitude}
   * @returns {Promise} Previously hired providers
   */
  async getPreviouslyHiredProviders(location) {
    try {
      const searchParams = {
        current_location: location,
        filters: {
          previously_hired_only: true
        },
        sort_by: 'recently_hired',
        page: 1,
        limit: 50
      };
      return await this.searchProviders(searchParams);
    } catch (error) {
      console.error('Error fetching previously hired providers:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates (client-side)
   * @param {Object} coord1 - {latitude, longitude}
   * @param {Object} coord2 - {latitude, longitude}
   * @returns {number} Distance in kilometers
   */
  calculateDistance(coord1, coord2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) * 
      Math.cos(this.toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format distance for display
   * @param {number} distance - Distance in km
   * @returns {string} Formatted distance
   */
  formatDistance(distance) {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m away`;
    }
    return `${distance.toFixed(1)}km away`;
  }

  /**
   * Format availability text
   * @param {number} days - Number of days until available
   * @returns {string} Formatted availability text
   */
  formatAvailability(days) {
    if (days === 0) return 'Available today';
    if (days === 1) return 'Available tomorrow';
    return `Available in ${days} days`;
  }
}

// Export a singleton instance
const providerSelectionService = new ProviderSelectionService();
export default providerSelectionService;
