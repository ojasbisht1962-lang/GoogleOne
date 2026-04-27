import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ServiceAreaLocationSelector.css';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Major Indian cities with coordinates
const INDIAN_CITIES = [
  { name: 'Mumbai', coordinates: { lat: 19.0760, lng: 72.8777 } },
  { name: 'Delhi', coordinates: { lat: 28.6139, lng: 77.2090 } },
  { name: 'Bangalore', coordinates: { lat: 12.9716, lng: 77.5946 } },
  { name: 'Chandigarh', coordinates: { lat: 30.7333, lng: 76.7794 } },
  { name: 'Hyderabad', coordinates: { lat: 17.3850, lng: 78.4867 } },
  { name: 'Ahmedabad', coordinates: { lat: 23.0225, lng: 72.5714 } },
  { name: 'Chennai', coordinates: { lat: 13.0827, lng: 80.2707 } },
  { name: 'Kolkata', coordinates: { lat: 22.5726, lng: 88.3639 } },
  { name: 'Pune', coordinates: { lat: 18.5204, lng: 73.8567 } },
  { name: 'Jaipur', coordinates: { lat: 26.9124, lng: 75.7873 } },
  { name: 'Surat', coordinates: { lat: 21.1702, lng: 72.8311 } },
  { name: 'Lucknow', coordinates: { lat: 26.8467, lng: 80.9462 } },
  { name: 'Kanpur', coordinates: { lat: 26.4499, lng: 80.3319 } },
  { name: 'Nagpur', coordinates: { lat: 21.1458, lng: 79.0882 } },
  { name: 'Indore', coordinates: { lat: 22.7196, lng: 75.8577 } },
  { name: 'Thane', coordinates: { lat: 19.2183, lng: 72.9781 } },
  { name: 'Bhopal', coordinates: { lat: 23.2599, lng: 77.4126 } },
  { name: 'Visakhapatnam', coordinates: { lat: 17.6868, lng: 83.2185 } },
  { name: 'Pimpri-Chinchwad', coordinates: { lat: 18.6298, lng: 73.7997 } },
  { name: 'Patna', coordinates: { lat: 25.5941, lng: 85.1376 } },
  { name: 'Vadodara', coordinates: { lat: 22.3072, lng: 73.1812 } },
];

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Find nearest city from coordinates
const findNearestCity = (coordinates) => {
  let nearestCity = INDIAN_CITIES[0];
  let minDistance = calculateDistance(
    coordinates.lat,
    coordinates.lng,
    nearestCity.coordinates.lat,
    nearestCity.coordinates.lng
  );

  INDIAN_CITIES.forEach(city => {
    const distance = calculateDistance(
      coordinates.lat,
      coordinates.lng,
      city.coordinates.lat,
      city.coordinates.lng
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city;
    }
  });

  return nearestCity;
};

export default function ServiceAreaLocationSelector({ value, onChange, required = false, label = "Service Area" }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(value || null);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationSelected, setLocationSelected] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    if (value) {
      setCurrentLocation(value);
      if (value.coordinates) {
        setMarkerPosition([value.coordinates.lat, value.coordinates.lng]);
      }
    }
  }, [value]);

  // Component to handle map clicks
  function MapClickHandler() {
    useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        setMarkerPosition([lat, lng]);
        setLocationSelected(true);
        getAddressFromCoordinates(lat, lng);
      },
    });
    return null;
  }

  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'TrustedHands/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        const coordinates = { lat, lng };
        const nearestCity = findNearestCity(coordinates);
        const location = {
          address: data.display_name,
          coordinates: coordinates,
          city: nearestCity.name
        };
        
        setCurrentLocation(location);
        toast.success(`📍 Service area set to ${nearestCity.name}`);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Failed to get address for this location');
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a location to search');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'TrustedHands/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lon);
        setMarkerPosition([latNum, lngNum]);
        setLocationSelected(true);
        getAddressFromCoordinates(latNum, lngNum);
        
        if (mapRef.current) {
          mapRef.current.setView([latNum, lngNum], 15);
        }
      } else {
        toast.error('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search location');
    } finally {
      setLoading(false);
    }
  };

  const confirmLocation = () => {
    if (currentLocation) {
      onChange(currentLocation);
      setShowModal(false);
      toast.success('✅ Service area updated!');
    } else {
      toast.error('Please select a location on the map');
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    toast.info('📍 Detecting your location...');
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        const nearestCity = findNearestCity(coordinates);
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.lat}&lon=${coordinates.lng}&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en',
                'User-Agent': 'TrustedHands/1.0'
              }
            }
          );
          const data = await response.json();
          
          if (data && data.display_name) {
            const location = {
              address: data.display_name,
              coordinates: coordinates,
              city: nearestCity.name
            };
            
            setCurrentLocation(location);
            setMarkerPosition([coordinates.lat, coordinates.lng]);
            setLocationSelected(true);
            toast.success(`📍 Found you near ${nearestCity.name}!`);
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          toast.error('Failed to get location details');
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setGettingLocation(false);
        toast.error('Failed to get your location. Please select on the map.');
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="service-area-selector">
      <div className="selector-display">
        {currentLocation ? (
          <div className="location-display-card">
            <div className="location-info">
              <span className="location-icon">📍</span>
              <div>
                <div className="location-city">{currentLocation.city}</div>
                <div className="location-address">{currentLocation.address}</div>
              </div>
            </div>
            <button 
              type="button"
              className="btn-change-area"
              onClick={() => setShowModal(true)}
            >
              Change Area
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-set-area"
            onClick={() => setShowModal(true)}
          >
            <span className="icon">📍</span>
            Set Service Area {required && <span className="required">*</span>}
          </button>
        )}
      </div>

      {showModal && (
        <div className="service-area-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="service-area-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗺️ Set Your Service Area</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="location-options">
                <button
                  className="btn-detect"
                  onClick={getCurrentLocation}
                  disabled={gettingLocation}
                >
                  {gettingLocation ? (
                    <>
                      <span className="spinner-small"></span>
                      Detecting...
                    </>
                  ) : (
                    <>
                      <span className="icon">📍</span>
                      Use Current Location
                    </>
                  )}
                </button>

                <div className="search-wrapper">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search for a city or area in India..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
                  />
                  <button 
                    className="btn-search-area" 
                    onClick={searchLocation}
                    disabled={loading}
                  >
                    {loading ? '...' : '🔍'}
                  </button>
                </div>
              </div>

              {!locationSelected && (
                <div className="map-hint">
                  <span className="hint-icon">💡</span>
                  <span>Click on the map to select your service area</span>
                </div>
              )}

              <MapContainer
                center={markerPosition || [20.5937, 78.9629]}
                zoom={markerPosition ? 13 : 5}
                className="service-area-map"
                ref={mapRef}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler />
                {markerPosition && (
                  <Marker 
                    position={markerPosition} 
                    draggable={true} 
                    eventHandlers={{
                      dragend: (e) => {
                        const { lat, lng } = e.target.getLatLng();
                        setMarkerPosition([lat, lng]);
                        getAddressFromCoordinates(lat, lng);
                      }
                    }} 
                  />
                )}
              </MapContainer>

              {currentLocation && locationSelected && (
                <div className="selected-info">
                  <div className="info-row">
                    <span className="label">City:</span>
                    <span className="value">{currentLocation.city}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Address:</span>
                    <span className="value">{currentLocation.address}</span>
                  </div>
                </div>
              )}

              <button
                className="btn-confirm-area"
                onClick={confirmLocation}
                disabled={!currentLocation || !locationSelected}
              >
                {locationSelected ? '✓ Confirm Service Area' : '⚠️ Select location on map'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
