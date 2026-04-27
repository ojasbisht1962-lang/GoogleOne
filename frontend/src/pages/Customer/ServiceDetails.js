import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serviceService } from '../../services/apiService';
import { toast } from 'react-toastify';
import LoadingScreen from '../../components/LoadingScreen';
import './ServiceDetails.css';

export default function ServiceDetails() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServiceDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  const fetchServiceDetails = async () => {
    try {
      setLoading(true);
      const data = await serviceService.getService(serviceId);
      setService(data);
    } catch (error) {
      console.error('Error fetching service:', error);
      toast.error('Failed to load service details');
      navigate('/customer/services');
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = () => {
    navigate(`/customer/book/${serviceId}`);
  };

  const getCategoryIcon = (categoryValue) => {
    const icons = {
      electrician: '⚡',
      plumber: '🔧',
      carpenter: '🪛',
      ac_servicing: '❄️',
      ro_servicing: '💧',
      appliance_repair: '🔨',
      painting: '🎨',
      pest_control: '🐛',
      car_washing: '🚗',
      bathroom_cleaning: '🚿',
      home_cleaning: '🧹',
      assignment_writing: '📝',
      project_making: '📊',
      tutoring: '📚',
      pet_care: '🐾',
      gardening: '🌱',
      delivery: '📦',
      other: '🔧'
    };
    return icons[categoryValue] || '🏠';
  };

  if (loading) {
    return (
      <>  <LoadingScreen message="Firing Up The Engines" />      </>
    );
  }

  if (!service) {
    return (
      <>        <div className="service-details-container">
          <div className="empty-state">
            <h2>Service Not Found</h2>
            <button className="btn-primary" onClick={() => navigate('/customer/services')}>
              Back to Services
            </button>
          </div>
        </div>      </>
    );
  }

  return (
    <>      <div className="service-details-container">
        <button className="btn-back" onClick={() => navigate('/customer/services')}>
          ← Back to Services
        </button>

        <div className="service-details-card">
          <div className="service-header-section">
            <div className="service-icon-large">
              {getCategoryIcon(service.category)}
            </div>
            <div className="service-header-content">
              <h1>{service.title}</h1>
              <div className="service-badges">
                <span className="category-badge">{service.category.replace(/_/g, ' ')}</span>
                {service.tasker?.professional_badge && (
                  <span className="professional-badge">✓ Verified Pro</span>
                )}
              </div>
            </div>
          </div>

          <div className="service-details-grid">
            <div className="service-main-info">
              <section className="info-section">
                <h2>📝 Description</h2>
                <p>{service.description}</p>
              </section>

              <section className="info-section">
                <h2>💰 Pricing</h2>
                <div className="price-display">
                  <span className="price-amount">₹{service.price.toLocaleString()}</span>
                  <span className="price-unit">{service.price_unit}</span>
                </div>
              </section>

              {/* Commission Rate Display */}
              <section className="info-section">
                <h2>🏦 Facilitation Commission</h2>
                <div className="commission-display">
                  {(() => {
                    const isTechnical = [
                      'electrician','plumber','carpenter','ac_servicing','ro_servicing','appliance_repair','painting','pest_control'
                    ].includes(service.category);
                    const commissionRate = isTechnical ? 15 : 10;
                    const split = commissionRate === 15 ? 7.5 : 5;
                    return (
                      <>
                        <span className="commission-rate">{split}% (from you, Customer)</span>
                        <span className="commission-rate">{split}% (from Tasker)</span>
                        <span className="commission-note">Total: {commissionRate}% facilitation commission</span>
                      </>
                    );
                  })()}
                </div>
              </section>

              {service.location && (
                <section className="info-section">
                  <h2>📍 Location</h2>
                  <p>{service.location}</p>
                </section>
              )}

              {service.availability && service.availability.length > 0 && (
                <section className="info-section">
                  <h2>📅 Availability</h2>
                  <div className="availability-tags">
                    {service.availability.map((day, index) => (
                      <span key={index} className="availability-tag">{day}</span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="service-sidebar">
              <div className="tasker-card">
                <h2>👤 Service Provider</h2>
                <div className="tasker-profile">
                  <div className="tasker-avatar-large">
                    {service.tasker?.profile_picture ? (
                      <img src={service.tasker.profile_picture} alt={service.tasker?.name || 'Tasker'} />
                    ) : (
                      <div className="avatar-placeholder-large">
                        {service.tasker?.name ? service.tasker.name.charAt(0).toUpperCase() : 'T'}
                      </div>
                    )}
                  </div>
                  <h3>{service.tasker?.name || 'Service Provider'}</h3>
                  <div className="tasker-stats-large">
                    <div className="stat-item">
                      <span className="stat-icon">⭐</span>
                      <span className="stat-value">{service.tasker?.rating?.toFixed(1) || '0.0'}</span>
                      <span className="stat-label">Rating</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-icon">💼</span>
                      <span className="stat-value">{service.tasker?.total_jobs || 0}</span>
                      <span className="stat-label">Jobs Completed</span>
                    </div>
                  </div>
                </div>

                <button className="btn-book-now-large" onClick={handleBookNow}>
                  Book This Service
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>    </>
  );
}
