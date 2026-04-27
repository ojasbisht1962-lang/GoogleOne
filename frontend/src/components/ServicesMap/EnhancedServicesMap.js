import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ServicesMap.css';

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

export default function EnhancedServicesMap({ services, user }) {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedRadius, setSelectedRadius] = useState(5);
  const [filteredServices, setFilteredServices] = useState(services);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState(5);

  // Calculate zoom level to fit the circular area tightly in viewport
  const getZoomFromRadius = (radius) => {
    // Tighter formula: smaller radius = much higher zoom
    // This ensures the circle fills most of the viewport
    const zoom = 16 - Math.log2(radius);
    return Math.max(12, Math.min(17, Math.round(zoom)));
  };

  const CATEGORY_ICONS = {
    electrician: '⚡',
    plumber: '🚿',
    carpenter: '🪛',
    ac_servicing: '❄️',
    ro_servicing: '💧',
    appliance_repair: '🔧',
    painting: '🎨',
    pest_control: '🐛',
    car_washing: '🚗',
    bathroom_cleaning: '🚽',
    home_cleaning: '🧹',
    assignment_writing: '📝',
    project_making: '📊',
    tutoring: '📚',
    pet_care: '🐾',
    gardening: '🌱',
    delivery: '📦',
    other: '🏠'
  };

  // Calculate distance
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
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

  // Filter services by radius
  useEffect(() => {
    if (!userLocation || !services) {
      setFilteredServices(services);
      return;
    }

    const filtered = services.filter(service => {
      if (!service.tasker?.service_location?.coordinates) return true;
      
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        service.tasker.service_location.coordinates.lat,
        service.tasker.service_location.coordinates.lng
      );
      
      return distance <= selectedRadius;
    });

    setFilteredServices(filtered);
  }, [services, userLocation, selectedRadius]);

  const handleCenterOnUser = () => {
    if (userLocation && mapRef.current) {
      const appropriateZoom = getZoomFromRadius(selectedRadius);
      mapRef.current.setView([userLocation.lat, userLocation.lng], appropriateZoom);
    }
  };

  const handleDirections = (serviceLocation) => {
    if (!userLocation) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${serviceLocation.lat},${serviceLocation.lng}`;
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
            <span className="legend-icon provider">🏠</span>
            <span>Services ({filteredServices?.length || 0})</span>
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

        {/* Service markers */}
        {filteredServices?.map((service) => {
          if (!service.tasker?.service_location?.coordinates) return null;
          
          const { lat, lng } = service.tasker.service_location.coordinates;
          const distance = userLocation 
            ? calculateDistance(userLocation.lat, userLocation.lng, lat, lng).toFixed(1)
            : null;
          
          const categoryIcon = CATEGORY_ICONS[service.category] || '🏠';
          const serviceIcon = new L.DivIcon({
            className: 'service-marker-custom',
            html: `<div class="service-marker-icon">${categoryIcon}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
          });

          return (
            <Marker
              key={service._id}
              position={[lat, lng]}
              icon={serviceIcon}
            >
              <Popup maxWidth={320} className="service-popup">
                <div className="service-info-window">
                  <div className="service-header">
                    <div className="category-icon-large">{categoryIcon}</div>
                    <div>
                      <h3>{service.title}</h3>
                      {distance && (
                        <div className="distance-info">📍 {distance} km away</div>
                      )}
                    </div>
                  </div>
                  
                  {service.description && (
                    <p className="service-description">
                      {service.description.substring(0, 120)}
                      {service.description.length > 120 ? '...' : ''}
                    </p>
                  )}
                  
                  <div className="service-price-info">
                    <span className="price-label">Price:</span>
                    <span className="price-value">₹{service.price.toLocaleString()}</span>
                    <span className="price-unit">/ {service.price_unit}</span>
                  </div>
                  
                  {service.tasker && (
                    <div className="tasker-info-compact">
                      <img 
                        src={service.tasker.profile_picture || '/default-avatar.png'} 
                        alt={service.tasker.name}
                        onError={(e) => { e.target.src = '/default-avatar.png'; }}
                      />
                      <div>
                        <div className="tasker-name">{service.tasker.name}</div>
                        <div className="tasker-rating">
                          ⭐ {service.tasker.rating?.toFixed(1) || '0.0'} • {service.tasker.total_jobs || 0} jobs
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="service-location-info">
                    📍 {service.location || service.tasker?.service_location?.city || 'Location not specified'}
                  </div>
                  
                  <div className="info-actions">
                    <button
                      className="btn-view-service"
                      onClick={() => navigate(`/customer/services/${service._id}`)}
                    >
                      View Details
                    </button>
                    {userLocation && (
                      <button
                        className="btn-directions-service"
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
