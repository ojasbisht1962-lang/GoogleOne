import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import './FavoriteButton.css';

export default function FavoriteButton({ providerId, isFavorite: initialFavorite, onToggle }) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleFavorite = async () => {
    try {
      setIsLoading(true);
      
      if (!providerId) {
        toast.error('Provider ID is missing');
        return;
      }

      const endpoint = isFavorite 
        ? '/provider-selection/favorites/remove'
        : '/provider-selection/favorites/add';

      const response = await api.post(endpoint, { provider_id: providerId });

      if (response.data.success || response.status === 200) {
        setIsFavorite(!isFavorite);
        toast.success(isFavorite ? '💔 Removed from favorites' : '⭐ Added to favorites!');
        if (onToggle) onToggle(!isFavorite);
      } else {
        toast.error(response.data.message || 'Failed to update favorite');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      console.error('Error details:', error.response?.data);
      const errorMsg = error.response?.data?.detail?.[0]?.msg || error.response?.data?.detail || 'Failed to update favorite';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className={`favorite-button ${isFavorite ? 'is-favorite' : ''} ${isLoading ? 'loading' : ''}`}
      onClick={handleToggleFavorite}
      disabled={isLoading}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isLoading ? (
        <span className="favorite-spinner">⏳</span>
      ) : (
        <span className="favorite-icon">
          {isFavorite ? '⭐' : '☆'}
        </span>
      )}
      <span className="favorite-text">
        {isFavorite ? 'Favorited' : 'Add to Favorites'}
      </span>
    </button>
  );
}
