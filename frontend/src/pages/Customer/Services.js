import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { serviceService } from '../../services/apiService';
import { toast } from 'react-toastify';
import BadgeDisplay from '../../components/BadgeDisplay';
import AIPhotoSearch from '../../components/AIPhotoSearch';
import CustomerLocationSelector from '../../components/CustomerLocationSelector/CustomerLocationSelector';
import EnhancedServicesMap from '../../components/ServicesMap/EnhancedServicesMap';
import { useAuth } from '../../context/AuthContext';
import './Services.css';

export default function Services() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    location: '',
    searchTerm: ''
  });
  const navigate = useNavigate();

  const CATEGORIES = [
    { label: 'All Categories', value: '' },
    { label: 'Electrician', value: 'electrician' },
    { label: 'Plumber', value: 'plumber' },
    { label: 'Carpenter', value: 'carpenter' },
    { label: 'AC Servicing', value: 'ac_servicing' },
    { label: 'RO Servicing', value: 'ro_servicing' },
    { label: 'Appliance Repair', value: 'appliance_repair' },
    { label: 'Painting', value: 'painting' },
    { label: 'Pest Control', value: 'pest_control' },
    { label: 'Car Washing', value: 'car_washing' },
    { label: 'Bathroom Cleaning', value: 'bathroom_cleaning' },
    { label: 'Home Cleaning', value: 'home_cleaning' },
    { label: 'Assignment Writing', value: 'assignment_writing' },
    { label: 'Project Making', value: 'project_making' },
    { label: 'Tutoring', value: 'tutoring' },
    { label: 'Pet Care', value: 'pet_care' },
    { label: 'Gardening', value: 'gardening' },
    { label: 'Delivery', value: 'delivery' },
    { label: 'Other', value: 'other' }
  ];

  // Auto-set user's location on component mount
  useEffect(() => {
    if (user?.customer_location?.city && !filters.location) {
      setFilters(prev => ({
        ...prev,
        location: user.customer_location.city
      }));
    }
  }, [user]);

  // Read category from URL and fetch services
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl && categoryFromUrl !== filters.category) {
      setFilters(prev => ({
        ...prev,
        category: categoryFromUrl
      }));
    } else {
      // Fetch services when filters change or on initial load
      fetchServices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, filters.category, filters.minPrice, filters.maxPrice, filters.location]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (filters.category) params.category = filters.category;
      if (filters.minPrice) params.min_price = parseFloat(filters.minPrice);
      if (filters.maxPrice) params.max_price = parseFloat(filters.maxPrice);
      if (filters.location) params.location = filters.location;
      
      const data = await serviceService.getServices(params);
      setServices(data);
    } catch (error) {
      toast.error('Failed to load services');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    
    // If category is changed, update the URL
    if (name === 'category') {
      if (value) {
        navigate(`/customer/services?category=${value}`, { replace: true });
      } else {
        navigate('/customer/services', { replace: true });
      }
    }
  };

  const handleClearFilters = () => {
    // Keep user's city when clearing filters
    const userCity = user?.customer_location?.city || '';
    setFilters({
      category: '',
      minPrice: '',
      maxPrice: '',
      location: userCity,
      searchTerm: ''
    });
    // Clear URL parameters and navigate to base services page
    navigate('/customer/services', { replace: true });
  };

  const handleViewService = (serviceId) => {
    navigate(`/customer/services/${serviceId}`);
  };

  const handleBookNow = (serviceId) => {
    navigate(`/customer/book/${serviceId}`);
  };

  const getCategoryLabel = (categoryValue) => {
    const category = CATEGORIES.find(cat => cat.value === categoryValue);
    return category ? category.label : categoryValue;
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

  const handleAICategoryDetected = (category) => {
    setFilters(prev => ({
      ...prev,
      category: category
    }));
    navigate(`/customer/services?category=${category}`, { replace: true });
  };

  const filteredServices = services.filter(service => {
    if (!filters.searchTerm) return true;
    const searchLower = filters.searchTerm.toLowerCase();
    return (
      service.title.toLowerCase().includes(searchLower) ||
      service.description.toLowerCase().includes(searchLower) ||
      service.category.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>      <div className="services-browse-container">
        <div className="services-header">
          <div className="header-content-services">
            <div>
              <h1>🔍 Browse Services</h1>
              <p>Find the perfect service for your needs</p>
            </div>
            <div className="header-actions-services">
              <CustomerLocationSelector compact={true} />
            </div>
          </div>
          <div style={{ marginTop: '20px' }}>
            <AIPhotoSearch onCategoryDetected={handleAICategoryDetected} />
          </div>
        </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>🔖 Category</label>
            <select 
              name="category" 
              value={filters.category} 
              onChange={handleFilterChange}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>📍 Location</label>
            <input
              type="text"
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              placeholder="Enter city or area"
            />
          </div>

          <div className="filter-group">
            <label>💰 Min Price</label>
            <input
              type="number"
              name="minPrice"
              value={filters.minPrice}
              onChange={handleFilterChange}
              placeholder="₹0"
              min="0"
            />
          </div>

          <div className="filter-group">
            <label>💰 Max Price</label>
            <input
              type="number"
              name="maxPrice"
              value={filters.maxPrice}
              onChange={handleFilterChange}
              placeholder="₹10000"
              min="0"
            />
          </div>

          <div className="filter-group">
            <label>🔍 Search</label>
            <input
              type="text"
              name="searchTerm"
              value={filters.searchTerm}
              onChange={handleFilterChange}
              placeholder="Search services..."
            />
          </div>
        </div>

        <div className="filter-actions">
          <button className="btn-clear-filters" onClick={handleClearFilters}>
            Clear Filters
          </button>
          <span className="results-count">
            {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      {/* Services Content */}
      <div className="services-content-stacked">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading services...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h2>No Services Found</h2>
            <p>Try adjusting your filters to see more results</p>
            <button className="btn-primary" onClick={handleClearFilters}>
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            {/* Services Grid - Shows at top */}
            <div className="services-grid-section">
              <div className="section-header">
                <h3>📋 Available Services</h3>
                <span className="service-count">{filteredServices.length} services</span>
              </div>
              <div className="services-grid">
                {filteredServices.map(service => (
                  <div key={service._id} className="service-browse-card">
                    <div className="service-image-placeholder">
                      <div className="category-icon">
                        {getCategoryIcon(service.category)}
                      </div>
                    </div>

                    <div className="service-content">
                      <div className="service-badges">
                        <span className="category-badge">{getCategoryLabel(service.category)}</span>
                        {service.tasker?.professional_badge && (
                          <BadgeDisplay badgeType={service.tasker.professional_badge} size="small" showName={false} />
                        )}
                      </div>

                      <h3>{service.title}</h3>
                      <p className="service-desc">{service.description}</p>

                      {/* Tasker Info */}
                      <div className="tasker-info">
                        <div className="tasker-avatar">
                          {service.tasker?.profile_picture ? (
                            <img src={service.tasker.profile_picture} alt={service.tasker?.name || 'Tasker'} />
                          ) : (
                            <div className="avatar-placeholder">
                              {service.tasker?.name ? service.tasker.name.charAt(0).toUpperCase() : 'T'}
                            </div>
                          )}
                        </div>
                        <div className="tasker-details">
                          <p className="tasker-name">{service.tasker?.name || 'Service Provider'}</p>
                          <div className="tasker-stats">
                            <span className="rating">⭐ {service.tasker?.rating?.toFixed(1) || '0.0'}</span>
                            <span className="jobs">• {service.tasker?.total_jobs || 0} jobs</span>
                          </div>
                        </div>
                      </div>

                      <div className="service-meta">
                        <div className="price-info">
                          <span className="price">₹{service.price.toLocaleString()}</span>
                          <span className="price-unit">{service.price_unit}</span>
                        </div>
                        {service.location && (
                          <div className="location-info">
                            📍 {service.location}
                          </div>
                        )}
                      </div>

                      <div className="service-actions">
                        <button 
                          className="btn-view-details"
                          onClick={() => handleViewService(service._id)}
                        >
                          View Details
                        </button>
                        <button 
                          className="btn-book-now"
                          onClick={() => handleBookNow(service._id)}
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Map View - Shows at bottom */}
            <div className="services-map-section">
              <div className="section-header">
                <h3>🗺️ Map View</h3>
                <p className="section-subtitle">View service locations on the map</p>
              </div>
              <div className="map-container-services">
                <EnhancedServicesMap services={filteredServices} user={user} />
              </div>
            </div>
          </>
        )}
      </div>
      </div>    </>
  );
}
