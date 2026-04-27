import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './GenderPreferenceSettings.css';
import api from '../../services/api';
import GenderPreferenceSelector from '../../components/GenderPreference/GenderPreferenceSelector';
import HouseholdTypeSelector from '../../components/GenderPreference/HouseholdTypeSelector';

const GenderPreferenceSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    gender: null,
    gender_preference: 'no_preference',
    household_type: null,
    mandatory_gender_matching: false
  });
  const [matchingRules, setMatchingRules] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchGenderProfile();
    fetchMatchingRules();
  }, []);

  const fetchGenderProfile = async () => {
    try {
      const response = await api.get('/gender-preference/profile');
      if (response.data.profile) {
        setFormData({
          gender: response.data.profile.gender || null,
          gender_preference: response.data.profile.gender_preference || 'no_preference',
          household_type: response.data.profile.household_type || null,
          mandatory_gender_matching: response.data.profile.mandatory_gender_matching || false
        });
      }
    } catch (error) {
      console.error('Failed to fetch gender profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchingRules = async () => {
    try {
      const response = await api.get('/gender-preference/all-matching-rules');
      setMatchingRules(response.data.rules || []);
    } catch (error) {
      console.error('Failed to fetch matching rules:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/gender-preference/profile', formData);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchGenderProfile(); // Refresh
    } catch (error) {
      console.error('Failed to save gender preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getMandatoryServicesForHousehold = () => {
    if (!formData.household_type) return [];
    
    return matchingRules
      .filter(rule => 
        rule.household_type === formData.household_type || 
        (rule.is_mandatory && rule.household_type === null)
      )
      .map(rule => ({
        category: rule.category,
        description: rule.description
      }));
  };

  if (loading) {
    return (
      <div className="gender-settings-loading">
        <div className="spinner"></div>
        <p>Loading your safety settings...</p>
      </div>
    );
  }

  const mandatoryServices = getMandatoryServicesForHousehold();

  return (
    <div className="gender-preference-settings-page">
      <div className="settings-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div>
          <h1>Gender Preference & Safety Settings</h1>
          <p>Configure your preferences for enhanced safety during service bookings</p>
        </div>
      </div>

      {showSuccess && (
        <div className="success-message">
          <span className="success-icon">✅</span>
          <span>Settings saved successfully!</span>
        </div>
      )}

      <div className="settings-content">
        {/* Your Gender Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2>Your Gender</h2>
            <p>This information helps us provide better safety matching</p>
          </div>
          
          <div className="gender-options">
            {['male', 'female', 'other', 'prefer_not_to_say'].map((gender) => (
              <div
                key={gender}
                className={`gender-option ${formData.gender === gender ? 'selected' : ''}`}
                onClick={() => setFormData({ ...formData, gender })}
              >
                <span className="gender-icon">
                  {gender === 'male' && '👨'}
                  {gender === 'female' && '👩'}
                  {gender === 'other' && '👤'}
                  {gender === 'prefer_not_to_say' && '🔒'}
                </span>
                <span className="gender-label">
                  {gender.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                {formData.gender === gender && <span className="check-icon">✓</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Household Type Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2>Household Type</h2>
            <p>Select your household type for automatic safety features</p>
          </div>
          
          <HouseholdTypeSelector
            value={formData.household_type}
            onChange={(type) => setFormData({ ...formData, household_type: type })}
            showLabel={false}
          />
        </div>

        {/* Gender Preference Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2>Default Gender Preference</h2>
            <p>Your default preference for service providers</p>
          </div>
          
          <GenderPreferenceSelector
            value={formData.gender_preference}
            onChange={(pref) => setFormData({ ...formData, gender_preference: pref })}
            showLabel={false}
          />
        </div>

        {/* Mandatory Matching Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2>Enhanced Safety Mode</h2>
            <p>Require gender matching for ALL services</p>
          </div>
          
          <div className="toggle-section">
            <div className="toggle-info">
              <div className="toggle-label">
                <span className="toggle-icon">🛡️</span>
                <span className="toggle-title">Mandatory Gender Matching</span>
              </div>
              <p className="toggle-description">
                When enabled, you must select a gender preference for all bookings, 
                not just sensitive services
              </p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={formData.mandatory_gender_matching}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  mandatory_gender_matching: e.target.checked 
                })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Mandatory Services Info */}
        {mandatoryServices.length > 0 && (
          <div className="settings-section mandatory-info-section">
            <div className="section-header">
              <h2>Automatic Safety Features</h2>
              <p>Based on your household type, these services require gender preference:</p>
            </div>
            
            <div className="mandatory-services-list">
              {mandatoryServices.map((service, index) => (
                <div key={index} className="mandatory-service-card">
                  <span className="service-icon">🔐</span>
                  <div className="service-info">
                    <h4>{service.category.replace('_', ' ').toUpperCase()}</h4>
                    <p>{service.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="settings-actions">
          <button 
            className="btn-save" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-small"></span>
                Saving...
              </>
            ) : (
              <>
                <span>💾</span>
                Save Preferences
              </>
            )}
          </button>
        </div>

        {/* Information Panel */}
        <div className="info-panel">
          <h3>Why do we ask for this information?</h3>
          <ul>
            <li>
              <span className="info-icon">🛡️</span>
              <span>Your safety is our top priority</span>
            </li>
            <li>
              <span className="info-icon">🔒</span>
              <span>This information is kept private and secure</span>
            </li>
            <li>
              <span className="info-icon">✓</span>
              <span>Helps us match you with appropriate service providers</span>
            </li>
            <li>
              <span className="info-icon">⚡</span>
              <span>You can change these settings anytime</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GenderPreferenceSettings;
