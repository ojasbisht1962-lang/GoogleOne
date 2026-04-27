import React from 'react';
import './GenderPreferenceSelector.css';

const GenderPreferenceSelector = ({ 
  value, 
  onChange, 
  isRequired = false,
  showLabel = true,
  disabled = false 
}) => {

  // Using hardcoded values (backend endpoint disabled)
  const genderPreferences = ['male', 'female', 'any', 'no_preference'];

  // Disabled function - using hardcoded values
  // const fetchGenderPreferences = async () => {
  //   try {
  //     const response = await api.get('/gender-preference/enums');
  //     setGenderPreferences(response.data.gender_preferences || []);
  //   } catch (error) {
  //     console.error('Failed to fetch gender preferences:', error);
  //     // Fallback to hardcoded values
  //     setGenderPreferences(['male', 'female', 'any', 'no_preference']);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const formatLabel = (preference) => {
    const labels = {
      'male': 'Male',
      'female': 'Female',
      'any': 'Any Gender',
      'no_preference': 'No Preference'
    };
    return labels[preference] || preference.replace('_', ' ').toUpperCase();
  };

  const getIcon = (preference) => {
    const icons = {
      'male': '👨',
      'female': '👩',
      'any': '👥',
      'no_preference': '🔓'
    };
    return icons[preference] || '👤';
  };

  return (
    <div className="gender-preference-selector">
      {showLabel && (
        <label className="gender-preference-label">
          Preferred Service Provider Gender {isRequired && <span className="required-star">*</span>}
        </label>
      )}
      
      {isRequired && (
        <div className="safety-notice">
          <span className="safety-icon">🛡️</span>
          <span className="safety-text">
            Gender preference is required for your safety based on household type
          </span>
        </div>
      )}

      <div className="gender-preference-options">
        {genderPreferences.map((preference) => (
          <div
            key={preference}
            className={`preference-option ${value === preference ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onChange(preference)}
          >
            <div className="option-icon">{getIcon(preference)}</div>
            <div className="option-label">{formatLabel(preference)}</div>
            {value === preference && (
              <div className="option-checkmark">✓</div>
            )}
          </div>
        ))}
      </div>

      {value === 'female' && (
        <div className="preference-note female-note">
          <span className="note-icon">✅</span>
          <span>Only female service providers will be shown</span>
        </div>
      )}

      {value === 'male' && (
        <div className="preference-note male-note">
          <span className="note-icon">✅</span>
          <span>Only male service providers will be shown</span>
        </div>
      )}

      {value === 'any' && (
        <div className="preference-note any-note">
          <span className="note-icon">ℹ️</span>
          <span>All available service providers will be shown</span>
        </div>
      )}
    </div>
  );
};

export default GenderPreferenceSelector;
