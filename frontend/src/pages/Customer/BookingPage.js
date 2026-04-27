import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serviceService, bookingService } from '../../services/apiService';
import { addressService } from '../../services/addressService';
import { toast } from 'react-toastify';
import LoadingScreen from '../../components/LoadingScreen';
import AddressManagement from '../../components/AddressManagement/AddressManagement';
import './BookingPage.css';

export default function BookingPage() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [bookingData, setBookingData] = useState({
    scheduled_date: '',
    scheduled_time: '',
    location: '',
    notes: '',
    gender_preference: null,
    household_type: null,
    address_id: null
  });

  const [genderRequired, setGenderRequired] = useState(false);
  const [mandatoryServices] = useState([]);
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    if (serviceId) {
      fetchService();
      fetchAddresses();
      // Temporarily disabled gender preference check to allow booking flow testing
      // checkMandatoryGenderRequirement();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  // Disabled function - gender preferences temporarily disabled
  // const checkMandatoryGenderRequirement = async () => {
  //   try {
  //     const token = localStorage.getItem('token');
  //     const response = await fetch('http://localhost:8000/api/gender-preference/matching-rules', {
  //       headers: {
  //         'Authorization': `Bearer ${token}`
  //       }
  //     });
  //     const data = await response.json();
  //     setMandatoryServices(data.mandatory_services || []);
  //   } catch (error) {
  //     console.error('Failed to fetch gender matching rules:', error);
  //   }
  // };

  const fetchAddresses = async () => {
    try {
      const data = await addressService.getAddresses();
      setAddresses(data);
      
      // Auto-select default address
      const defaultAddr = data.find(addr => addr.is_default);
      if (defaultAddr) {
        handleAddressSelect(defaultAddr);
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    }
  };

  const handleAddressSelect = (address) => {
    setSelectedAddress(address);
    setShowAddressSelector(false);
    
    // Format location string
    const locationString = `${address.address_line1}, ${address.address_line2 ? address.address_line2 + ', ' : ''}${address.city}, ${address.state} - ${address.pincode}`;
    
    setBookingData(prev => ({
      ...prev,
      location: locationString,
      address_id: address._id
    }));
    
    toast.success(`Address selected: ${address.label}`);
  };

  const fetchService = async () => {
    try {
      setLoading(true);
      const data = await serviceService.getService(serviceId);
      setService(data);
      // Pre-fill location if available
      if (data.location) {
        setBookingData(prev => ({ ...prev, location: data.location }));
      }
      
      // Check if gender preference is mandatory for this service
      if (data.category) {
        const isMandatory = mandatoryServices.includes(data.category.toLowerCase());
        setGenderRequired(isMandatory);
      }
    } catch (error) {
      toast.error('Failed to load service details');
      navigate('/customer/services');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    
    // Validation
    if (!bookingData.scheduled_date) {
      toast.error('Please select a date');
      return;
    }
    if (!bookingData.scheduled_time) {
      toast.error('Please select a time');
      return;
    }
    if (!bookingData.location) {
      toast.error('Please enter a location');
      return;
    }

    // Gender preference validation
    if (genderRequired && !bookingData.gender_preference) {
      toast.error('Gender preference is required for this service category');
      return;
    }


    try {
      setSubmitting(true);
      
      const booking = {
        service_id: serviceId,
        tasker_id: service.tasker_id || service.tasker?._id,
        scheduled_date: bookingData.scheduled_date,
        scheduled_time: bookingData.scheduled_time,
        location: bookingData.location,
        notes: bookingData.notes || '',
        total_price: parseFloat(service.price),
        gender_preference: bookingData.gender_preference,
        household_type: bookingData.household_type
      };

      const createdBooking = await bookingService.createBooking(booking);
      
      toast.success('Booking created! Redirecting to payment...', { autoClose: 2000 });
      
      // Navigate directly to payment page
      navigate('/customer/payment', {
        state: {
          booking: {
            _id: createdBooking._id || createdBooking.id,
            ...createdBooking,
            service: service,
            tasker: service.tasker,
            total_price: parseFloat(service.price),
            scheduled_date: bookingData.scheduled_date,
            scheduled_time: bookingData.scheduled_time
          }
        },
        replace: true
      });
    } catch (error) {
      console.error('❌ Booking error:', error);
      console.error('Error details:', error.response?.data);
      console.error('Full error object:', error);
      toast.error(error.response?.data?.detail || 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get maximum date (3 months from now)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    return maxDate.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <>        <LoadingScreen />      </>
    );
  }

  if (!service) {
    return (
      <>        <div className="booking-page-container">
          <div className="error-state">Service not found</div>
        </div>      </>
    );
  }

  return (
    <>      <div className="booking-page-container">
        <div className="booking-content">
          {/* Service Info Card */}
          <div className="service-info-card">
          <div className="service-icon-large">
            {service.service_type === 'technical' ? '🔧' : '🏠'}
          </div>
          
          <h2>{service.title}</h2>
          <p className="service-description">{service.description}</p>

          <div className="service-meta">
            <div className="meta-item">
              <span className="label">Category:</span>
              <span className="value">{service.category}</span>
            </div>
            <div className="meta-item">
              <span className="label">Price:</span>
              <span className="value price">₹{service.price}</span>
            </div>
            <div className="meta-item">
              <span className="label">Price Unit:</span>
              <span className="value">{service.price_unit}</span>
            </div>
            {service.location && (
              <div className="meta-item">
                <span className="label">Service Area:</span>
                <span className="value">📍 {service.location}</span>
              </div>
            )}
          </div>

          {/* Tasker Info */}
          {service.tasker && (
            <div className="tasker-info-card">
              <div className="tasker-avatar">
                {service.tasker.profile_picture ? (
                  <img src={service.tasker.profile_picture} alt={service.tasker.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {service.tasker.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="tasker-details">
                <h4>{service.tasker.name}</h4>
                <div className="tasker-stats">
                  <span>⭐ {service.tasker.rating?.toFixed(1) || '0.0'}</span>
                  <span>• {service.tasker.total_jobs || 0} jobs</span>
                </div>
                {service.tasker.professional_badge && (
                  <span className="verified-badge">✓ Verified Professional</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Booking Form */}
        <div className="booking-form-card">
          <h2>📅 Book This Service</h2>
          <p className="form-subtitle">Fill in the details to request a booking</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Scheduled Date *</label>
              <input
                type="date"
                name="scheduled_date"
                value={bookingData.scheduled_date}
                onChange={handleInputChange}
                min={getMinDate()}
                max={getMaxDate()}
                required
              />
              <small>Select a date for the service</small>
            </div>

            <div className="form-group">
              <label>Preferred Time *</label>
              <select
                name="scheduled_time"
                value={bookingData.scheduled_time}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a time slot</option>
                <option value="08:00 AM - 10:00 AM">08:00 AM - 10:00 AM</option>
                <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                <option value="12:00 PM - 02:00 PM">12:00 PM - 02:00 PM</option>
                <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
                <option value="06:00 PM - 08:00 PM">06:00 PM - 08:00 PM</option>
              </select>
              <small>Choose your preferred time slot</small>
            </div>

            <div className="form-group address-selector-section">
              <label>Service Address *</label>
              
              {selectedAddress ? (
                <div className="selected-address-card">
                  <div className="address-icon">
                    {selectedAddress.label === 'Home' && '🏠'}
                    {selectedAddress.label === 'Work' && '💼'}
                    {selectedAddress.label === 'Other' && '📍'}
                  </div>
                  <div className="address-content">
                    <h4>{selectedAddress.label}</h4>
                    <p>{selectedAddress.full_name} • {selectedAddress.phone}</p>
                    <p className="address-text">{bookingData.location}</p>
                  </div>
                  <button 
                    type="button"
                    className="btn-change-address"
                    onClick={() => setShowAddressSelector(true)}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button 
                  type="button"
                  className="btn-select-address"
                  onClick={() => setShowAddressSelector(true)}
                >
                  + Select or Add Address
                </button>
              )}
              
              <small>Choose where the service should be performed</small>
            </div>

            {/* Temporarily hidden - Gender preference backend has database issues */}
            {/* <div className="form-group">
              <HouseholdTypeSelector
                value={bookingData.household_type}
                onChange={(householdType) => {
                  setBookingData(prev => ({ ...prev, household_type: householdType }));
                }}
                serviceCategory={service.category}
                mandatoryServices={mandatoryServices}
              />
            </div> */}

            {/* Temporarily hidden - Gender preference backend has database issues */}
            {/* <div className="form-group">
              <GenderPreferenceSelector
                value={bookingData.gender_preference}
                onChange={(preference) => {
                  sefrotBookingData(prev => ({ ...prev, gender_preference: preference }));
                }}
                required={genderRequired}
                householdType={bookingData.household_type}
              />
            </div> */}

            <div className="form-group">
              <label>Additional Notes (Optional)</label>
              <textarea
                name="notes"
                value={bookingData.notes}
                onChange={handleInputChange}
                rows="4"
                placeholder="Any specific requirements or instructions..."
              />
              <small>Provide any additional details for the tasker</small>
            </div>

            <div className="price-summary">
              <div className="summary-row">
                <span>Service Price:</span>
                <span className="amount">₹{service.price}</span>
              </div>
              <div className="summary-row total">
                <span>Total Amount:</span>
                <span className="amount">₹{service.price}</span>
              </div>
              <p className="payment-note">� You will be redirected to payment page after booking</p>
              <p className="payment-note">🔒 Payment held securely in escrow until service completion</p>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn-cancel"
                onClick={() => navigate('/customer/services')}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-confirm-booking"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : '✓ Confirm Booking'}
              </button>
            </div>

            <div className="booking-info">
              <p>📌 Your booking request will be sent to the tasker for confirmation</p>
              <p>📧 You will be notified once the tasker responds</p>
            </div>
          </form>
        </div>
      </div>

      {/* Address Selector Modal */}
      {showAddressSelector && (
        <div className="address-modal-overlay">
          <div className="address-modal">
            <div className="modal-header">
              <h3>Select Service Address</h3>
              <button 
                className="btn-close-modal"
                onClick={() => setShowAddressSelector(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <AddressManagement 
                onSelect={handleAddressSelect}
                selectionMode={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>    </>
  );
}
