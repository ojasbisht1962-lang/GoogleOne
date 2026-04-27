import React, { useState, useEffect } from 'react';
import './ProviderSelectionPage.css';
import ProviderFilters from './ProviderFilters';
import ProviderCard from './ProviderCard';
import QuickRebookModal from './QuickRebookModal';
import Footer from '../Footer';
import EnhancedProvidersMap from '../ProvidersMap/EnhancedProvidersMap';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ProviderSelectionPage = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [filters, setFilters] = useState({
    min_rating: 0,
    max_distance: 50,
    availability_within_days: 30,
    previously_hired: false,
    favorites_only: false,
    verified_only: false
  });
  const [sortBy, setSortBy] = useState('rating_high');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  });
  const [showQuickRebook, setShowQuickRebook] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.warning('Location access denied. Using default location.');
          // Set default location (e.g., Chandigarh)
          setCurrentLocation({
            latitude: 30.7333,
            longitude: 76.7794
          });
        },
        { timeout: 5000 }
      );
    } else {
      // Set default location if geolocation not available
      setCurrentLocation({
        latitude: 30.7333,
        longitude: 76.7794
      });
    }
  }, []);

  // Fetch providers when filters, sorting, or pagination changes
  useEffect(() => {
    if (currentLocation) {
      fetchProviders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortBy, pagination.page, currentLocation]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const requestData = {
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
        filters: filters,
        sort_by: sortBy,
        page: pagination.page,
        limit: pagination.limit
      };

      const response = await api.post('/provider-selection/search', requestData);
      
      setProviders(response.data.providers || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.total || 0,
        pages: response.data.total_pages || response.data.pages || 0
      }));
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to load providers. Please try again.');
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on filter change
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on sort change
  };

  const handleToggleFavorite = async (providerId) => {
    try {
      const provider = providers.find(p => (p.id || p._id) === providerId);
      const isFavorite = provider?.is_favorite;

      if (isFavorite) {
        await api.post('/provider-selection/favorites/remove', { provider_id: providerId });
        toast.success('Removed from favorites');
      } else {
        await api.post('/provider-selection/favorites/add', { provider_id: providerId });
        toast.success('Added to favorites');
      }

      // Update local state
      setProviders(prev => 
        prev.map(p => 
          (p.id || p._id) === providerId 
            ? { ...p, is_favorite: !isFavorite }
            : p
        )
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite status');
    }
  };

  const handleQuickRebook = (provider) => {
    setSelectedProvider(provider);
    setShowQuickRebook(true);
  };

  const handleQuickRebookComplete = () => {
    setShowQuickRebook(false);
    setSelectedProvider(null);
    toast.success('Booking created successfully!');
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className="provider-selection-page">
        <div className="page-header">
          <div className="header-content">
            <div>
              <h1>Find Your Perfect Service Provider</h1>
              <p className="subtitle">
                Browse from {pagination.total} providers • Sort by rating, distance, availability & more
              </p>
            </div>
          </div>
        </div>

        <div className="page-content">
          <aside className="filters-sidebar">
            <ProviderFilters
              filters={filters}
              sortBy={sortBy}
              onFilterChange={handleFilterChange}
              onSortChange={handleSortChange}
            />
          </aside>

          <main className="providers-main split-view">
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner">⏳</div>
                <p>Finding the best providers for you...</p>
              </div>
            ) : providers.length === 0 ? (
              <div className="no-providers">
                <div className="no-providers-icon">🔍</div>
                <h2>No Providers Found</h2>
                <p>Try adjusting your filters or search criteria</p>
                <button 
                  className="reset-filters-btn"
                  onClick={() => handleFilterChange({
                    min_rating: 0,
                    max_distance: 50,
                    availability_within_days: 30,
                    previously_hired: false,
                    favorites_only: false,
                    verified_only: false
                  })}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid-section">
                  <div className="section-header">
                    <h3>📋 Providers List</h3>
                  </div>
                  <div className="providers-grid">
                    {providers.map(provider => (
                      <ProviderCard
                        key={provider.id || provider._id}
                        provider={provider}
                        onQuickRebook={handleQuickRebook}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>

                  {pagination.pages > 1 && (
                    <div className="pagination">
                      <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        ← Previous
                      </button>
                      
                      <div className="pagination-info">
                        Page {pagination.page} of {pagination.pages}
                      </div>
                      
                      <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>

                <div className="map-section">
                  <div className="section-header">
                    <h3>🗺️ Map View</h3>
                  </div>
                  <div className="map-container">
                    <EnhancedProvidersMap providers={providers} user={user} />
                  </div>
                </div>
              </>
            )}
          </main>
        </div>

        {showQuickRebook && selectedProvider && (
          <QuickRebookModal
            provider={selectedProvider}
            onClose={() => setShowQuickRebook(false)}
            onComplete={handleQuickRebookComplete}
          />
        )}
      </div>
      <Footer />
    </>
  );
};

export default ProviderSelectionPage;
