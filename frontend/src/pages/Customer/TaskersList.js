import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../services/apiService';
import { toast } from 'react-toastify';
import LoadingScreen from '../../components/LoadingScreen';
import './TaskersList.css';

export default function TaskersList() {
  const [taskers, setTaskers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    taskerType: '',
    searchTerm: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchTaskers();
    // eslint-disable-next-line
  }, [filters.taskerType]);

  const fetchTaskers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.taskerType) params.tasker_type = filters.taskerType;
      
      const data = await userService.getTaskers(params);
      setTaskers(data);
    } catch (error) {
      toast.error('Failed to load taskers');
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
  };

  const handleViewTasker = (taskerId) => {
    navigate(`/customer/taskers/${taskerId}`);
  };

  const filteredTaskers = taskers.filter(tasker => {
    if (!filters.searchTerm) return true;
    const searchLower = filters.searchTerm.toLowerCase();
    return (
      tasker.name.toLowerCase().includes(searchLower) ||
      tasker.skills?.some(skill => skill.toLowerCase().includes(searchLower)) ||
      tasker.bio?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <>  <LoadingScreen message="Firing Up The Engines" />      </>
    );
  }

  return (
    <>      <div className="taskers-list-container">
        <div className="taskers-header">
          <h1>👥 Find Taskers</h1>
          <p>Browse verified professionals and helpers</p>
        </div>

        {/* Filters */}
        <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>👤 Tasker Type</label>
            <select 
              name="taskerType" 
              value={filters.taskerType} 
              onChange={handleFilterChange}
            >
              <option value="">All Taskers</option>
              <option value="professional">Professionals</option>
              <option value="helper">Helpers</option>
            </select>
          </div>

          <div className="filter-group">
            <label>🔍 Search</label>
            <input
              type="text"
              name="searchTerm"
              value={filters.searchTerm}
              onChange={handleFilterChange}
              placeholder="Search by name or skills..."
            />
          </div>
        </div>

        <div className="results-count">
          {filteredTaskers.length} tasker{filteredTaskers.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Taskers Grid */}
      {filteredTaskers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h2>No Taskers Found</h2>
          <p>Try adjusting your filters to see more results</p>
        </div>
      ) : (
        <div className="taskers-grid">
          {filteredTaskers.map(tasker => (
            <div key={tasker._id} className="tasker-card">
              <div className="tasker-avatar-large">
                {tasker.profile_picture ? (
                  <img src={tasker.profile_picture} alt={tasker.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {tasker.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="tasker-content">
                <div className="tasker-badges">
                  <span className={`type-badge ${tasker.tasker_type}`}>
                    {tasker.tasker_type === 'professional' ? '⭐ Professional' : '🙋 Helper'}
                  </span>
                  {tasker.professional_badge && (
                    <span className="verified-badge">✓ Verified</span>
                  )}
                </div>

                <h3>{tasker.name}</h3>
                
                <div className="tasker-stats">
                  <div className="stat">
                    <span className="stat-icon">⭐</span>
                    <span className="stat-value">{tasker.rating?.toFixed(1) || '0.0'}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-icon">💼</span>
                    <span className="stat-value">{tasker.total_jobs || 0} jobs</span>
                  </div>
                </div>

                {tasker.bio && (
                  <p className="tasker-bio">{tasker.bio}</p>
                )}

                {tasker.skills && tasker.skills.length > 0 && (
                  <div className="skills-container">
                    {tasker.skills.slice(0, 3).map((skill, index) => (
                      <span key={index} className="skill-tag">{skill}</span>
                    ))}
                    {tasker.skills.length > 3 && (
                      <span className="skill-tag more">+{tasker.skills.length - 3}</span>
                    )}
                  </div>
                )}

                {tasker.languages_spoken && tasker.languages_spoken.length > 0 && (
                  <div className="languages">
                    <span className="label">🗣️ Languages:</span>
                    <span className="value">{tasker.languages_spoken.join(', ')}</span>
                  </div>
                )}

                <button 
                  className="btn-view-profile"
                  onClick={() => handleViewTasker(tasker._id)}
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>    </>
  );
}
