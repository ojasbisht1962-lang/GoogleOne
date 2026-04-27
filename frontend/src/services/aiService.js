import api from './api';

class AIService {
  /**
   * Analyze an image to get service category suggestion
   * @param {File} imageFile - The image file to analyze
   * @returns {Promise<Object>} Analysis result with suggested category
   */
  async analyzeImage(imageFile) {
    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await api.post('/ai/analyze-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw error;
    }
  }

  /**
   * Get all available service categories
   * @returns {Promise<Array>} List of service categories
   */
  async getCategories() {
    try {
      const response = await api.get('/ai/categories');
      return response.data.categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }
}

export default new AIService();
