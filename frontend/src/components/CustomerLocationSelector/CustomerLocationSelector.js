import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './CustomerLocationSelector.css';

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
  { name: 'Chandigarh', coordinates: { lat: 30.7333, lng: 76.7794 } },
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

export default function CustomerLocationSelector({ onLocationUpdate, compact = false }) {
  const { user, updateUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(user?.customer_location || null);
  const [selectedCity, setSelectedCity] = useState(user?.customer_location?.city || '');
  const [showMapView, setShowMapView] = useState(false);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [locationSelected, setLocationSelected] = useState(false);
  const [addressDetails, setAddressDetails] = useState({
    houseNo: '',
    street: '',
    landmark: '',
    area: '',
    pincode: ''
  });
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const mapRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (user?.customer_location) {
      setCurrentLocation(user.customer_location);
      setSelectedCity(user.customer_location.city || '');
      if (user.customer_location.coordinates) {
        setMarkerPosition([user.customer_location.coordinates.lat, user.customer_location.coordinates.lng]);
      }
    }
  }, [user]);

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
      // Using Nominatim for reverse geocoding (free)
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
        setSelectedCity(nearestCity.name);
        toast.success(`📍 Location set near ${nearestCity.name}`);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Failed to get address for this location');
    }
  };

  const fetchSuggestions = async (query) => {
    if (!query || query.trim().length < 3) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'TrustedHands/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        setSearchSuggestions(data);
        setShowSuggestions(true);
      } else {
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Suggestion fetch error:', error);
    }
  };

  const handleSearchInput = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debouncing
    searchTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const selectSuggestion = (suggestion) => {
    const latNum = parseFloat(suggestion.lat);
    const lngNum = parseFloat(suggestion.lon);
    
    setSearchQuery(suggestion.display_name);
    setShowSuggestions(false);
    setSearchSuggestions([]);
    setMarkerPosition([latNum, lngNum]);
    setLocationSelected(true);
    getAddressFromCoordinates(latNum, lngNum);
    
    // Center map on the location
    if (mapRef.current) {
      mapRef.current.setView([latNum, lngNum], 15);
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a location to search');
      return;
    }

    setShowSuggestions(false);
    try {
      setLoading(true);
      // Using Nominatim for geocoding (free)
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
        
        // Center map on the location
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

  const confirmMapLocation = () => {
    if (currentLocation) {
      setShowMapView(false);
      setShowAddressForm(true);
    } else {
      toast.error('Please select a location on the map');
    }
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddressDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!addressDetails.houseNo.trim() || !addressDetails.street.trim()) {
      toast.error('Please fill in House Number and Street Name');
      return;
    }

    // Combine all address details
    const fullAddress = `${addressDetails.houseNo}, ${addressDetails.street}${addressDetails.landmark ? ', ' + addressDetails.landmark : ''}${addressDetails.area ? ', ' + addressDetails.area : ''}, ${currentLocation.city}${addressDetails.pincode ? ' - ' + addressDetails.pincode : ''}`;
    
    const locationWithDetails = {
      ...currentLocation,
      fullAddress: fullAddress,
      addressDetails: addressDetails
    };

    await saveLocation(locationWithDetails);
    setShowAddressForm(false);
    setAddressDetails({
      houseNo: '',
      street: '',
      landmark: '',
      area: '',
      pincode: ''
    });
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

        // Find nearest city
        const nearestCity = findNearestCity(coordinates);
        toast.success(`📍 Found you near ${nearestCity.name}!`);
        
        // Get address from Nominatim
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
            setSelectedCity(nearestCity.name);
            setMarkerPosition([coordinates.lat, coordinates.lng]);
            setLocationSelected(true);
            setShowMapView(true);
            toast.info('📍 Location detected! You can adjust it on the map if needed.');
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
        
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Location permission denied. Please enable location access in your browser.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          toast.error('Location information unavailable. Please try again.');
        } else if (error.code === error.TIMEOUT) {
          toast.error('Location request timed out. Please try again.');
        } else {
          toast.error('Failed to get your location. Please select a city manually.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      }
    );
  };

  const saveLocation = async (location) => {
    try {
      setLoading(true);
      const response = await api.put('/users/update-customer-location', location);
      
      // Update user in context
      if (response.data.user) {
        updateUser(response.data.user);
      } else if (response.data) {
        updateUser(response.data);
      }
      
      // Callback to parent
      if (onLocationUpdate) {
        onLocationUpdate(location);
      }
      
      toast.success(`✅ Location set to ${location.city}!`);
      setShowModal(false);
    } catch (error) {
      console.error('Location update error:', error);
      toast.error('Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  // Don't render for non-logged-in users
  if (!user) {
    return null;
  }

  if (compact) {
    return (
      <div className="customer-location-compact">
        <button 
          className="location-badge"
          onClick={() => setShowModal(true)}
        >
          <span className="icon">📍</span>
          <span className="city-name">{selectedCity || 'Set Location'}</span>
          <span className="change-icon">▼</span>
        </button>

        {showModal && !showMapView && (
          <div className="location-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="location-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="header-title">
                  <div className="header-icon">📍</div>
                  <div>
                    <h3>Set Your Location</h3>
                    <p className="header-subtitle">Choose how you want to set your location</p>
                  </div>
                </div>
                <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
              </div>

              <div className="modal-body">
                <button
                  className="btn-detect-location"
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
                      Detect Location Automatically
                    </>
                  )}
                </button>

                <div className="divider">OR</div>

                <button
                  className="btn-map-location"
                  onClick={() => { setShowMapView(true); setLocationSelected(false); }}
                  disabled={loading}
                >
                  <span className="icon">🗺️</span>
                  Set Location Manually on Map
                </button>

                {currentLocation && (
                  <div className="current-location-info">
                    <div className="info-label">Current Location:</div>
                    <div className="info-city">{currentLocation.city}</div>
                    <div className="info-address">{currentLocation.address}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showModal && showMapView && (
          <div className="location-modal-overlay" onClick={() => { setShowModal(false); setShowMapView(false); }}>
            <div className="location-modal-content location-map-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <button className="btn-back" onClick={() => setShowMapView(false)}>← Back</button>
                <h3>Select Location on Map</h3>
                <button className="modal-close" onClick={() => { setShowModal(false); setShowMapView(false); }}>×</button>
              </div>

              <div className="modal-body map-modal-body">
                <div className="map-content-wrapper">
                  <div className="search-input-wrapper">
                    <input
                      type="text"
                      className="map-search-input"
                      placeholder="Search for a location or address in India..."
                      value={searchQuery}
                      onChange={handleSearchInput}
                      onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
                      onFocus={() => searchQuery.length >= 3 && searchSuggestions.length > 0 && setShowSuggestions(true)}
                    />
                    <button 
                      className="btn-search" 
                      onClick={searchLocation}
                      disabled={loading}
                    >
                      {loading ? '...' : '🔍'}
                    </button>
                    {showSuggestions && searchSuggestions.length > 0 && (
                      <div className="search-suggestions">
                        {searchSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="suggestion-item"
                            onClick={() => selectSuggestion(suggestion)}
                          >
                            <span className="suggestion-icon">📍</span>
                            <span className="suggestion-text">{suggestion.display_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="search-hint">💡 Click on the map to pinpoint your exact location or search above</span>

                  {!locationSelected && (
                    <div className="location-prompt-banner">
                      <span className="prompt-icon">👆</span>
                      <div className="prompt-text">
                        <strong>Click anywhere on the map to select your location</strong>
                        <small>You can also drag the marker after placing it</small>
                      </div>
                    </div>
                  )}

                  <MapContainer
                    center={markerPosition || [20.5937, 78.9629]}
                    zoom={markerPosition ? 15 : 5}
                    className="location-map"
                    ref={mapRef}
                    scrollWheelZoom={true}
                    doubleClickZoom={true}
                    touchZoom={true}
                    zoomControl={true}
                    dragging={true}
                    tap={true}
                    boxZoom={true}
                    keyboard={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler />
                    {markerPosition && (
                      <Marker position={markerPosition} draggable={true} eventHandlers={{
                        dragend: (e) => {
                          const { lat, lng } = e.target.getLatLng();
                          setMarkerPosition([lat, lng]);
                          getAddressFromCoordinates(lat, lng);
                        }
                      }} />
                    )}
                  </MapContainer>

                  {currentLocation && locationSelected && (
                    <div className="selected-location-info">
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
                </div>

                <div className="map-actions-footer">
                  <button
                    className="btn-confirm-location"
                    onClick={confirmMapLocation}
                    disabled={!currentLocation || !locationSelected || loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-small"></span>
                        Saving...
                      </>
                    ) : locationSelected ? (
                      <>
                        ✓ Confirm & Enter Address Details
                      </>
                    ) : (
                      <>
                        ⚠️ Click on the map to select your location
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showModal && showAddressForm && (
          <div className="location-modal-overlay" onClick={() => { setShowModal(false); setShowAddressForm(false); }}>
            <div className="location-modal-content address-form-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <button className="btn-back" onClick={() => { setShowAddressForm(false); setShowMapView(true); }}>← Adjust Location</button>
                <h3>Enter Address Details</h3>
                <button className="modal-close" onClick={() => { setShowModal(false); setShowAddressForm(false); setShowMapView(false); }}>×</button>
              </div>

              <div className="modal-body address-form-body">
                <form onSubmit={handleAddressSubmit}>
                  <div className="selected-location-summary">
                    <div className="info-row">
                      <span className="label">📍 Selected Location:</span>
                      <span className="value">{currentLocation?.city}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Area:</span>
                      <span className="value small-text">{currentLocation?.address}</span>
                    </div>
                    <div className="info-row" style={{marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed rgba(251, 191, 36, 0.3)'}}>
                      <span className="small-text" style={{fontSize: '12px', color: '#92400e', fontStyle: 'italic'}}>
                        💡 Location not accurate? Click "← Adjust Location" above to change it on the map
                      </span>
                    </div>
                  </div>

                  <div className="address-form-grid">
                    <div className="form-group full-width">
                      <label htmlFor="houseNo">
                        House/Flat Number <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="houseNo"
                        name="houseNo"
                        value={addressDetails.houseNo}
                        onChange={handleAddressChange}
                        placeholder="e.g., 123, Flat 4B"
                        required
                      />
                    </div>

                    <div className="form-group full-width">
                      <label htmlFor="street">
                        Street/Road Name <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="street"
                        name="street"
                        value={addressDetails.street}
                        onChange={handleAddressChange}
                        placeholder="e.g., MG Road, Main Street"
                        required
                      />
                    </div>

                    <div className="form-group full-width">
                      <label htmlFor="landmark">Landmark (Optional)</label>
                      <input
                        type="text"
                        id="landmark"
                        name="landmark"
                        value={addressDetails.landmark}
                        onChange={handleAddressChange}
                        placeholder="e.g., Near City Mall"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="area">Area/Locality</label>
                      <input
                        type="text"
                        id="area"
                        name="area"
                        value={addressDetails.area}
                        onChange={handleAddressChange}
                        placeholder="e.g., Koramangala"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="pincode">PIN Code</label>
                      <input
                        type="text"
                        id="pincode"
                        name="pincode"
                        value={addressDetails.pincode}
                        onChange={handleAddressChange}
                        placeholder="e.g., 560001"
                        maxLength="6"
                        pattern="[0-9]{6}"
                      />
                    </div>
                  </div>

                  <div className="address-preview">
                    <div className="preview-label">📋 Address Preview:</div>
                    <div className="preview-text">
                      {addressDetails.houseNo && `${addressDetails.houseNo}, `}
                      {addressDetails.street && `${addressDetails.street}, `}
                      {addressDetails.landmark && `${addressDetails.landmark}, `}
                      {addressDetails.area && `${addressDetails.area}, `}
                      {currentLocation?.city}
                      {addressDetails.pincode && ` - ${addressDetails.pincode}`}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-save-address"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-small"></span>
                        Saving Address...
                      </>
                    ) : (
                      <>
                        ✓ Save Complete Address
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}