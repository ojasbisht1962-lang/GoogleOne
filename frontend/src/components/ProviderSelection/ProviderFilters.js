import React, { useState, useEffect } from 'react';
import './ProviderFilters.css';
import { serviceService } from '../../services/apiService';

export default function ProviderFilters({ onFilterChange, onSortChange }) {
  const [filters, setFilters] = useState({
    service_id: '',
    min_rating: 0,
    max_distance: 50,
    availability_within_days: 30,
    previously_hired: false,
    favorites_only: false,
    verified_only: false
  });

  const [sortBy, setSortBy] = useState('rating_high');
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Fetch services on component mount
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoadingServices(true);
      const servicesData = await serviceService.getServices({ limit: 100 });
      setServices(servicesData);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  const sortingOptions = [
    { value: 'rating_high', label: '⭐ Highest Rating', icon: '📊' },
    { value: 'distance_near', label: '📍 Nearest Location', icon: '🗺️' },
    { value: 'availability_fast', label: '⚡ Fastest Availability', icon: '🚀' },
    { value: 'recently_hired', label: '🕐 Recently Hired', icon: '📅' },
    { value: 'most_booked', label: '🔥 Most Booked', icon: '💼' },
    { value: 'price_low', label: '💰 Lowest Price', icon: '💵' },
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    onSortChange(value);
  };

  const resetFilters = () => {
    const defaultFilters = {
      service_id: '',
      min_rating: 0,
      max_distance: 50,
      availability_within_days: 30,
      previously_hired: false,
      favorites_only: false,
      verified_only: false
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
    setSortBy('rating_high');
    onSortChange('rating_high');
  };

  return (
    <div className="provider-filters">
      <div className="filters-header">
        <h3>🔍 Filters & Sorting</h3>
        <button className="btn-reset-filters" onClick={resetFilters}>
          🔄 Reset
        </button>
      </div>

      {/* Service Selection */}
      <div className="filter-section service-selection-section">
        <label className="filter-label">🔧 What Service Do You Need?</label>
        {loadingServices ? (
          <div className="loading-services">Loading services...</div>
        ) : (
          <select
            className="service-select"
            value={filters.service_id}
            onChange={(e) => handleFilterChange('service_id', e.target.value)}
          >
            <option value="">All Services / All Professionals</option>
            {services.map((service) => (
              <option key={service._id} value={service._id}>
                {service.title}
              </option>
            ))}
          </select>
        )}
        {filters.service_id && (
          <div className="selected-service-indicator">
            ✓ Showing professionals for: {services.find(s => s._id === filters.service_id)?.title}
          </div>
        )}
      </div>

      {/* Sorting Section */}
      <div className="filter-section">
        <label className="filter-label">📊 Sort By</label>
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value)}
        >
          {sortingOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Rating Filter */}
      <div className="filter-section">
        <label className="filter-label">
          ⭐ Minimum Rating: {filters.min_rating.toFixed(1)}
        </label>
        <input
          type="range"
          min="0"
          max="5"
          step="0.5"
          value={filters.min_rating}
          onChange={(e) => handleFilterChange('min_rating', parseFloat(e.target.value))}
          className="filter-range"
        />
        <div className="range-labels">
          <span>0</span>
          <span>5</span>
        </div>
      </div>

      {/* Distance Filter */}
      <div className="filter-section">
        <label className="filter-label">
          📍 Maximum Distance: {filters.max_distance} km
        </label>
        <input
          type="range"
          min="1"
          max="50"
          step="1"
          value={filters.max_distance}
          onChange={(e) => handleFilterChange('max_distance', parseInt(e.target.value))}
          className="filter-range"
        />
        <div className="range-labels">
          <span>1 km</span>
          <span>50 km</span>
        </div>
      </div>

      {/* Availability Filter */}
      <div className="filter-section">
        <label className="filter-label">
          ⚡ Available Within: {filters.availability_within_days} days
        </label>
        <input
          type="range"
          min="1"
          max="30"
          step="1"
          value={filters.availability_within_days}
          onChange={(e) => handleFilterChange('availability_within_days', parseInt(e.target.value))}
          className="filter-range"
        />
        <div className="range-labels">
          <span>1 day</span>
          <span>30 days</span>
        </div>
      </div>

      {/* Boolean Filters */}
      <div className="filter-section">
        <label className="filter-label">🎯 Quick Filters</label>
        
        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filters.previously_hired}
              onChange={(e) => handleFilterChange('previously_hired', e.target.checked)}
            />
            <span className="checkbox-text">
              <span className="checkbox-icon">🕐</span>
              Previously Hired
            </span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filters.favorites_only}
              onChange={(e) => handleFilterChange('favorites_only', e.target.checked)}
            />
            <span className="checkbox-text">
              <span className="checkbox-icon">⭐</span>
              Favorites Only
            </span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filters.verified_only}
              onChange={(e) => handleFilterChange('verified_only', e.target.checked)}
            />
            <span className="checkbox-text">
              <span className="checkbox-icon">✓</span>
              Verified Professionals
            </span>
          </label>
        </div>
      </div>

      {/* Active Filters Summary */}
      <div className="active-filters-summary">
        <p className="summary-title">Active Filters:</p>
        <div className="active-filters-list">
          {filters.service_id && (
            <span className="filter-tag">🔧 {services.find(s => s._id === filters.service_id)?.title}</span>
          )}
          {filters.min_rating > 0 && (
            <span className="filter-tag">⭐ {filters.min_rating}+ Rating</span>
          )}
          {filters.max_distance < 50 && (
            <span className="filter-tag">📍 Within {filters.max_distance}km</span>
          )}
          {filters.previously_hired && (
            <span className="filter-tag">🕐 Previously Hired</span>
          )}
          {filters.favorites_only && (
            <span className="filter-tag">⭐ Favorites</span>
          )}
          {filters.verified_only && (
            <span className="filter-tag">✓ Verified</span>
          )}
        </div>
      </div>
    </div>
  );
}
