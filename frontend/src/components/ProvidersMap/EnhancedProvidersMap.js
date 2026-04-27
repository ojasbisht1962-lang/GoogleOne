import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ProvidersMap.css';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom user location marker icon
const userLocationIcon = new L.DivIcon({
  className: 'user-location-marker',
  html: `
    <div class="pulse-ring"></div>
    <div class="user-marker-icon">📍</div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// Custom provider marker icon
const providerMarkerIcon = new L.DivIcon({
  className: 'provider-marker-custom',
  html: `<div class="provider-marker-icon">👤</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// Component to handle map centering
function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  
  return null;
}

export default function EnhancedProvidersMap({ providers, user }) {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedRadius, setSelectedRadius] = useState(5); // km
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState(5);

  // Calculate zoom level to fit the circular area tightly in viewport
  const getZoomFromRadius = (radius) => {
    // Tighter formula: smaller radius = much higher zoom
    // This ensures the circle fills most of the viewport
    const zoom = 16 - Math.log2(radius);
    return Math.max(12, Math.min(17, Math.round(zoom)));
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };


  // Adjust zoom when radius changes
  useEffect(() => {
    if (userLocation && mapRef.current) {
      const newZoom = getZoomFromRadius(selectedRadius);
      setMapZoom(newZoom);
      mapRef.current.setView([userLocation.lat, userLocation.lng], newZoom);
    }
  }, [selectedRadius, userLocation]);

  // Get user location
  useEffect(() => {
    if (user?.customer_location?.coordinates) {
      const location = {
        lat: user.customer_location.coordinates.lat,
        lng: user.customer_location.coordinates.lng,
        city: user.customer_location.city
      };
      setUserLocation(location);
      setMapCenter([location.lat, location.lng]);
      const initialZoom = getZoomFromRadius(selectedRadius);
      setMapZoom(initialZoom);
    }
  }, [user, selectedRadius]);

  // Filter providers within radius
  const providersInRadius = providers.filter(provider => {
    if (!userLocation || !provider.service_location?.coordinates) return false;
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      provider.service_location.coordinates.lat,
      provider.service_location.coordinates.lng
    );
    return distance <= selectedRadius;
  });

  const handleCenterOnUser = () => {
    if (userLocation && mapRef.current) {
      const appropriateZoom = getZoomFromRadius(selectedRadius);
      mapRef.current.setView([userLocation.lat, userLocation.lng], appropriateZoom);
    }
  };

  const handleDirections = (providerLocation) => {
    if (!userLocation) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${providerLocation.lat},${providerLocation.lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="enhanced-map-container">
      <div className="map-controls">
        <div className="control-group">
          <label>Search Radius: {selectedRadius} km</label>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={selectedRadius}
            onChange={(e) => setSelectedRadius(Number(e.target.value))}
            className="radius-slider"
          />
        </div>
        
        <button 
          className="center-btn"
          onClick={handleCenterOnUser}
          disabled={!userLocation}
        >
          📍 Center on Me
        </button>

        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-icon user">📍</span>
            <span>Your Location</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon provider">👤</span>
            <span>Service Provider ({providersInRadius.length})</span>
          </div>
        </div>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="map-view"
        ref={mapRef}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController center={mapCenter} zoom={mapZoom} />

        {/* User location marker */}
        {userLocation && (
          <>
            <Marker 
              position={[userLocation.lat, userLocation.lng]} 
              icon={userLocationIcon}
            >
              <Popup>
                <div className="popup-content">
                  <strong>📍 Your Location</strong>
                  <p>{userLocation.city}</p>
                </div>
              </Popup>
            </Marker>

            {/* Radius circle */}
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={selectedRadius * 1000} // Convert km to meters
              pathOptions={{
                color: '#f97316',
                fillColor: '#f97316',
                fillOpacity: 0.1,
                weight: 2
              }}
            />
          </>
        )}

        {/* Provider markers */}
        {providersInRadius.map((provider) => {
          if (!provider.service_location?.coordinates) return null;
          
          const { lat, lng } = provider.service_location.coordinates;
          const distance = userLocation 
            ? calculateDistance(userLocation.lat, userLocation.lng, lat, lng).toFixed(1)
            : null;

          return (
            <Marker
              key={provider.id || provider._id}
              position={[lat, lng]}
              icon={providerMarkerIcon}
            >
              <Popup maxWidth={300} className="provider-popup">
                <div className="provider-info-window">
                  <div className="provider-header">
                    <img 
                      src={provider.profile_picture || '/default-avatar.png'} 
                      alt={provider.name}
                      className="provider-avatar"
                      onError={(e) => { e.target.src = '/default-avatar.png'; }}
                    />
                    <div className="provider-details">
                      <h4>{provider.name}</h4>
                      {provider.skills && provider.skills.length > 0 && (
                        <p className="provider-skills">{provider.skills.slice(0, 3).join(', ')}</p>
                      )}
                      {distance && (
                        <p className="provider-distance">📍 {distance} km away</p>
                      )}
                    </div>
                  </div>

                  <div className="provider-stats">
                    <div className="stat">
                      <span className="stat-icon">⭐</span>
                      <span>{provider.rating?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-icon">💼</span>
                      <span>{provider.total_jobs || provider.completedJobs || 0} jobs</span>
                    </div>
                  </div>

                  <div className="provider-actions">
                    <button
                      className="btn-view-profile"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/customer/tasker-profile/${provider.id || provider._id}`);
                      }}
                    >
                      View Profile
                    </button>
                    {userLocation && (
                      <button
                        className="btn-directions"
                        onClick={() => handleDirections({ lat, lng })}
                      >
                        🧭 Directions
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
