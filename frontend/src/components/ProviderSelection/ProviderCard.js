import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ProviderCard.css';
import FavoriteButton from './FavoriteButton';

const ProviderCard = ({ provider, onQuickRebook, onToggleFavorite }) => {
  const navigate = useNavigate();
  if (!provider) {
    console.error('ProviderCard: provider is null or undefined');
    return null;
  }

  const {
    id,
    _id,
    name,
    phone,
    rating,
    average_rating,
    total_jobs,
    total_bookings,
    services,
    profile_picture,
    bio,
    distance,
    is_favorite,
    previously_hired,
    verified,
    professional_badge,
    availability,
    gender
  } = provider;

  // Backend returns 'id' not '_id'
  const providerId = id || _id;

  if (!providerId) {
    console.error('ProviderCard: No id or _id found in provider data:', provider);
  }

  // Use rating or average_rating
  const providerRating = rating || average_rating || 0;
  const providerBookings = total_jobs || total_bookings || 0;
  const isVerified = verified || professional_badge || false;

  const handleQuickRebook = () => {
    if (onQuickRebook) {
      onQuickRebook(provider);
    }
  };

  const handleFavoriteToggle = () => {
    if (onToggleFavorite) {
      onToggleFavorite(providerId);
    }
  };

  const handleViewProfile = () => {
    navigate(`/customer/tasker/${providerId}`);
  };

  const formatDistance = (dist) => {
    if (!dist) return 'Distance not available';
    return `${dist.toFixed(1)} km away`;
  };

  const getAvailabilityText = (avail) => {
    if (!avail) return 'Availability unknown';
    if (avail === 0) return 'Available today';
    if (avail === 1) return 'Available tomorrow';
    return `Available in ${avail} days`;
  };

  return (
    <div className="provider-card">
      <div className="provider-card-header">
        <div className="provider-image-container">
          {profile_picture ? (
            <img src={profile_picture} alt={name} className="provider-image" />
          ) : (
            <div className="provider-image-placeholder">
              {name?.charAt(0).toUpperCase() || 'P'}
            </div>
          )}
          {isVerified && (
            <div className="verified-badge" title="Verified Provider">
              ✓
            </div>
          )}
        </div>
        
        <div className="provider-basic-info">
          <h3 className="provider-name">
            {name}
            {previously_hired && (
              <span className="previously-hired-badge" title="You hired this provider before">
                ★ Previously Hired
              </span>
            )}
          </h3>
          
          <div className="provider-rating">
            <span className="rating-stars">{'⭐'.repeat(Math.round(providerRating || 0))}</span>
            <span className="rating-value">{(providerRating || 0).toFixed(1)}</span>
            <span className="rating-count">({providerBookings || 0} bookings)</span>
          </div>
          
          {gender && (
            <div className="provider-gender">
              <span className="gender-icon">{gender === 'male' ? '👨' : gender === 'female' ? '👩' : '👤'}</span>
              <span className="gender-text">{gender}</span>
            </div>
          )}
        </div>
      </div>

      <div className="provider-card-body">
        {bio && (
          <p className="provider-bio">{bio}</p>
        )}
        
        <div className="provider-services">
          <h4>Services Offered:</h4>
          <div className="services-list">
            {services && services.length > 0 ? (
              services.map((service, index) => (
                <span key={service.id || index} className="service-tag">
                  {typeof service === 'string' ? service : (service.title || service.category || 'Service')}
                </span>
              ))
            ) : (
              <span className="no-services">No services listed</span>
            )}
          </div>
        </div>

        <div className="provider-details">
          <div className="detail-item">
            <span className="detail-icon">📍</span>
            <span className="detail-text">{formatDistance(distance)}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-icon">📅</span>
            <span className="detail-text">{getAvailabilityText(availability)}</span>
          </div>
          
          {phone && (
            <div className="detail-item">
              <span className="detail-icon">📞</span>
              <span className="detail-text">{phone}</span>
            </div>
          )}
        </div>
      </div>

      <div className="provider-card-footer">
        <FavoriteButton
          providerId={providerId}
          isFavorite={is_favorite || false}
          onToggle={handleFavoriteToggle}
        />
        
        {previously_hired && (
          <button className="quick-rebook-btn" onClick={handleQuickRebook}>
            🔄 Quick Rebook
          </button>
        )}
        
        <button className="view-profile-btn" onClick={handleViewProfile}>
          View Profile
        </button>
      </div>
    </div>
  );
};

export default ProviderCard;
