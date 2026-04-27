import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { serviceService } from '../services/apiService';
import './PublicNavbar.css';

export default function PublicNavbar() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);

  const getDashboardLink = () => {
    if (!isAuthenticated) return '/login';
    if (user?.role === 'customer') return '/customer/dashboard';
    if (user?.role === 'tasker') return '/tasker/dashboard';
    if (user?.role === 'superadmin') return '/admin/dashboard';
    return '/login';
  };

  // Handle search
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      try {
        const services = await serviceService.getServices();
        
        // Handle both array and object response
        const servicesList = Array.isArray(services) ? services : (services.data || []);
        
        const filtered = servicesList.filter(service => 
          service.name?.toLowerCase().includes(query.toLowerCase()) ||
          service.category?.toLowerCase().includes(query.toLowerCase()) ||
          service.description?.toLowerCase().includes(query.toLowerCase())
        );
        
        setSearchResults(filtered);
        setShowSearchResults(filtered.length > 0);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  // Navigate to service details
  const handleServiceClick = (serviceId) => {
    navigate(`/service/${serviceId}`);
    setShowSearchResults(false);
    setSearchQuery('');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="public-navbar">
      <div className="public-nav-container">
        {/* Logo */}
        <div className="public-brand" onClick={() => navigate('/')}> 
          <img src="/logo.png" alt="TrustedHands" className="public-logo-icon" />
          <span className="public-logo-text">TrustedHands</span>
        </div>

        {/* Right Side Controls */}
        <div className="public-nav-controls">
          {/* Search Bar */}
          <div className="search-container" ref={searchRef}>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search for services..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
            />
            {showSearchResults && searchResults.length > 0 && (
              <div className="search-results-dropdown">
                {searchResults.slice(0, 5).map((service) => (
                  <button
                    key={service._id}
                    className="search-result-item"
                    onClick={() => handleServiceClick(service._id)}
                  >
                    <span className="service-icon">{service.icon || '🔧'}</span>
                    <div className="service-info">
                      <div className="service-name">{service.name}</div>
                      <div className="service-category">{service.category}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart Icon */}
          <button className="cart-btn" onClick={() => navigate('/cart')}>
            <svg className="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </button>

          {/* Account - Login/Signup Button or User Icon */}
          {isAuthenticated ? (
            <button className="account-btn" onClick={() => navigate(getDashboardLink())}>
              <svg className="account-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          ) : (
            <Link to="/login" className="btn-public-nav">Login / Sign Up</Link>
          )}
        </div>
      </div>
    </nav>
  );
}

