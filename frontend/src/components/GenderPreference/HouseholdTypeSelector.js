import React from 'react';
import './HouseholdTypeSelector.css';

const HouseholdTypeSelector = ({ 
  value, 
  onChange, 
  showLabel = true,
  disabled = false 
}) => {

  // Using hardcoded values (backend endpoint disabled)
  const householdTypes = [
    'single_woman',
    'elderly_home',
    'family_with_children',
    'mixed',
    'other'
  ];

  // Disabled function - using hardcoded values
  // const fetchHouseholdTypes = async () => {
  //   try {
  //     const response = await api.get('/gender-preference/enums');
  //     setHouseholdTypes(response.data.household_types || []);
  //   } catch (error) {
  //     console.error('Failed to fetch household types:', error);
  //     // Fallback to hardcoded values
  //     setHouseholdTypes([
  //       'single_woman',
  //       'elderly_home',
  //       'family_with_children',
  //       'mixed',
  //       'other'
  //     ]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const getHouseholdInfo = (type) => {
    const info = {
      'single_woman': {
        label: 'Single Woman Household',
        icon: '👩',
        description: 'Living alone or with other women',
        safetyLevel: 'high',
        mandatoryCategories: ['Home Cleaning', 'Bathroom Cleaning']
      },
      'elderly_home': {
        label: 'Elderly Home',
        icon: '👴👵',
        description: 'Household with elderly residents',
        safetyLevel: 'high',
        mandatoryCategories: ['Home Cleaning', 'Elderly Care']
      },
      'family_with_children': {
        label: 'Family with Children',
        icon: '👨‍👩‍👧‍👦',
        description: 'Household with children',
        safetyLevel: 'medium',
        mandatoryCategories: []
      },
      'mixed': {
        label: 'Mixed Household',
        icon: '🏠',
        description: 'Mixed gender household',
        safetyLevel: 'low',
        mandatoryCategories: []
      },
      'other': {
        label: 'Other',
        icon: '🏘️',
        description: 'Other household type',
        safetyLevel: 'low',
        mandatoryCategories: []
      }
    };
    return info[type] || { label: type, icon: '🏠', description: '', safetyLevel: 'low', mandatoryCategories: [] };
  };

  const getSafetyBadge = (safetyLevel) => {
    const badges = {
      'high': { text: 'Enhanced Safety', color: '#00E676', icon: '🛡️' },
      'medium': { text: 'Standard Safety', color: '#FDB913', icon: '✓' },
      'low': { text: 'Basic Safety', color: '#B0B0B0', icon: 'ℹ️' }
    };
    return badges[safetyLevel] || badges.low;
  };

  return (
    <div className="household-type-selector">
      {showLabel && (
        <label className="household-type-label">
          Household Type
          <span className="label-hint">(helps us ensure your safety)</span>
        </label>
      )}

      <div className="household-type-grid">
        {householdTypes.map((type) => {
          const info = getHouseholdInfo(type);
          const safety = getSafetyBadge(info.safetyLevel);
          const isSelected = value === type;

          return (
            <div
              key={type}
              className={`household-card ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
              onClick={() => !disabled && onChange(type)}
            >
              <div className="household-icon">{info.icon}</div>
              
              <div className="household-info">
                <h4 className="household-label">{info.label}</h4>
                <p className="household-description">{info.description}</p>
              </div>

              {info.safetyLevel === 'high' && (
                <div className="safety-badge" style={{ borderColor: safety.color }}>
                  <span className="safety-badge-icon">{safety.icon}</span>
                  <span className="safety-badge-text" style={{ color: safety.color }}>
                    {safety.text}
                  </span>
                </div>
              )}

              {info.mandatoryCategories.length > 0 && (
                <div className="mandatory-notice">
                  <span className="mandatory-icon">⚠️</span>
                  <span className="mandatory-text">
                    Gender preference required for: {info.mandatoryCategories.join(', ')}
                  </span>
                </div>
              )}

              {isSelected && (
                <div className="selection-checkmark">
                  <span className="checkmark-icon">✓</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {value && getHouseholdInfo(value).safetyLevel === 'high' && (
        <div className="enhanced-safety-info">
          <div className="safety-info-header">
            <span className="safety-shield">🛡️</span>
            <h4>Enhanced Safety Features Active</h4>
          </div>
          <ul className="safety-features-list">
            <li>✅ Gender preference required for sensitive services</li>
            <li>✅ Priority matching with verified providers</li>
            <li>✅ Additional background verification checks</li>
            <li>✅ Real-time safety monitoring during service</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default HouseholdTypeSelector;
