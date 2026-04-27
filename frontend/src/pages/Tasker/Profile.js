import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/apiService';
import { toast } from 'react-toastify';
import ServiceAreaLocationSelector from '../../components/ServiceAreaLocationSelector/ServiceAreaLocationSelector';
import api from '../../services/api';
import './Profile.css';

const LANGUAGES = [
  'English', 'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 
  'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Other'
];

const SKILLS = [
  'Cleaning', 'Plumbing', 'Electrical', 'Carpentry', 'Painting',
  'Moving & Packing', 'Appliance Repair', 'Pest Control', 
  'Gardening', 'AC Repair', 'Computer Repair', 'Mobile Repair', 'Other'
];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingSkills, setEditingSkills] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
// ...existing code...
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    bio: '',
    gender: '',
  });
  
  const [locationData, setLocationData] = useState(null);
  const [skillsData, setSkillsData] = useState({
    languages_spoken: [],
    skills: [],
  });

  const [upgradeData, setUpgradeData] = useState({
    experience_years: '',
    referral_code: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        bio: user.bio || '',
        gender: user.gender || '',
      });
      setLocationData(user.service_location || null);
      setSkillsData({
        languages_spoken: user.languages_spoken || [],
        skills: user.skills || [],
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLanguageToggle = (language) => {
    setSkillsData(prev => ({
      ...prev,
      languages_spoken: prev.languages_spoken.includes(language)
        ? prev.languages_spoken.filter(l => l !== language)
        : [...prev.languages_spoken, language]
    }));
  };

  const handleSkillToggle = (skill) => {
    setSkillsData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const updatedUser = await userService.updateProfile(formData);
      
      // Update auth context
      updateUser(updatedUser);
      
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name || '',
      phone: user.phone || '',
      address: user.address || '',
      bio: user.bio || '',
    });
    setEditing(false);
  };

  const handleSkillsCancel = () => {
    setSkillsData({
      languages_spoken: user.languages_spoken || [],
      skills: user.skills || [],
    });
    setEditingSkills(false);
  };

  const handleSkillsUpdate = async () => {
    if (skillsData.languages_spoken.length === 0) {
      toast.error('Please select at least one language');
      return;
    }

    try {
      setLoading(true);
      const response = await userService.updateProfile(skillsData);
      updateUser(response);
      toast.success('Skills and languages updated successfully!');
      setEditingSkills(false);
    } catch (error) {
      toast.error('Failed to update skills and languages');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationUpdate = async (newLocation) => {
    try {
      setLoading(true);
      const response = await api.put('/users/update-service-location', newLocation);
      
      // Update local state
      setLocationData(newLocation);
      
      // Update user in context
      const updatedUser = { ...user, service_location: newLocation };
      updateUser(updatedUser);
      
      toast.success(`Location updated! ${response.data.services_updated} services updated.`);
    } catch (error) {
      console.error('Location update error:', error);
      toast.error(error.response?.data?.detail || 'Failed to update service location');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeToProfessional = async () => {
    if (!upgradeData.experience_years || upgradeData.experience_years < 1) {
      toast.error('Please enter at least 1 year of experience');
      return;
    }

    if (skillsData.skills.length === 0) {
      toast.error('Please select at least one skill before upgrading');
      return;
    }

    try {
      setLoading(true);
      const upgradePayload = {
        tasker_type: 'professional',
        work_as_professional: true,
        experience_years: parseInt(upgradeData.experience_years),
        referral_code: upgradeData.referral_code || null,
        skills: skillsData.skills,
        languages_spoken: skillsData.languages_spoken,
      };

      const response = await userService.updateProfile(upgradePayload);
      updateUser(response);
      
      toast.success('Application submitted! Your account will be verified by admin.');
      setShowUpgradeModal(false);
      setUpgradeData({ experience_years: '', referral_code: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upgrade to professional');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="profile-container">
        <div className="profile-header">
          <h1>⚙️ Profile Settings</h1>
          <p>Manage your account information</p>
        </div>

      <div className="profile-content">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-avatar">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt={user.name} />
            ) : (
              <div className="avatar-placeholder">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="profile-info">
            <h2>{user?.name}</h2>
            <p className="email">{user?.email}</p>
            
            <div className="profile-badges">
              <span className="badge role">
                {user?.tasker_type === 'professional' ? '⭐ Professional' : '🙋 Helper'}
              </span>
              
              {user?.professional_badge && (
                <span className="badge verified">✓ Verified</span>
              )}
              
              <span className="badge rating">
                ⭐ {user?.rating?.toFixed(1) || '0.0'}
              </span>
            </div>
            
            {/* Referral code only for Professional taskers */}
            {user?.referral_code && user?.tasker_type === 'professional' && (
              <div className="referral-section">
                <h4>Your Referral Code</h4>
                <div className="referral-code">
                  <code>{user.referral_code}</code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(user.referral_code);
                      toast.success('Referral code copied!');
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
                <small>Share this code with other professionals to help them get verified faster</small>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon">💼</div>
            <div>
              <h3>{user?.total_jobs || 0}</h3>
              <p>Total Jobs</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🗣️</div>
            <div>
              <h3>{user?.languages_spoken?.length || 0}</h3>
              <p>Languages</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🛠️</div>
            <div>
              <h3>{user?.skills?.length || 0}</h3>
              <p>Skills</p>
            </div>
          </div>
        </div>

        {/* Editable Information */}
        <div className="info-section">
          <div className="section-header">
            <h3>Personal Information</h3>
            {!editing ? (
              <button className="btn-edit" onClick={() => setEditing(true)}>
                ✏️ Edit Profile
              </button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              {editing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              ) : (
                <p className="value">{user?.name || 'Not set'}</p>
              )}
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              {editing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                />
              ) : (
                <p className="value">{user?.phone || 'Not set'}</p>
              )}
            </div>

            <div className="form-group">
              <label>Gender *</label>
              {editing ? (
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  required
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid #2a2a2a',
                    background: '#1a1a1a',
                    color: '#fff',
                    fontSize: '15px'
                  }}
                >
                  <option value="">Select your gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              ) : (
                <p className="value">
                  {user?.gender ? (
                    <>
                      {user.gender === 'male' ? '👨 Male' : user.gender === 'female' ? '👩 Female' : '⚧️ Other'}
                    </>
                  ) : (
                    'Not set'
                  )}
                </p>
              )}
              {editing && (
                <small style={{ color: '#B0B0B0', fontSize: '13px', marginTop: '6px', display: 'block' }}>
                  🔒 This helps customers with gender preference requirements
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Address</label>
              {editing ? (
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Enter your complete address"
                />
              ) : (
                <p className="value">{user?.address || 'Not set'}</p>
              )}
            </div>

            <div className="form-group">
              <label>Bio</label>
              {editing ? (
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Tell customers about yourself..."
                  maxLength="500"
                />
              ) : (
                <p className="value">{user?.bio || 'No bio added'}</p>
              )}
            </div>

            {editing && (
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Service Location Section */}
        <div className="profile-section">
          <div className="section-header">
            <h2>📍 Service Area</h2>
          </div>

          <div className="location-info-box">
            <p className="info-text">
              ⚠️ This location will be shown on all your service listings. 
              When you update it, all existing services will automatically update.
            </p>
          </div>

          <ServiceAreaLocationSelector
            value={locationData}
            onChange={(newLocation) => {
              setLocationData(newLocation);
              handleLocationUpdate(newLocation);
            }}
            required={true}
            label="Service Area"
          />
        </div>

        {/* Existing Skills Section continues... */}
        <div className="profile-section">
          <div className="section-header">
            <h2>🛠️ Skills & Languages</h2>
            {!editingSkills && (
              <button 
                type="button" 
                className="btn-edit" 
                onClick={() => setEditingSkills(true)}
              >
                ✏️ Edit
              </button>
            )}
          </div>

          <div className="form-group">
            <label>Languages Spoken</label>
            {editingSkills ? (
              <div className="skills-grid">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    type="button"
                    className={`skill-chip ${skillsData.languages_spoken.includes(lang) ? 'selected' : ''}`}
                    onClick={() => handleLanguageToggle(lang)}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            ) : (
              <div className="tags-list">
                {user?.languages_spoken?.length > 0 ? (
                  user.languages_spoken.map((lang, index) => (
                    <span key={index} className="tag">{lang}</span>
                  ))
                ) : (
                  <p className="value">No languages added</p>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Skills</label>
            {editingSkills ? (
              <div className="skills-grid">
                {SKILLS.map(skill => (
                  <button
                    key={skill}
                    type="button"
                    className={`skill-chip ${skillsData.skills.includes(skill) ? 'selected' : ''}`}
                    onClick={() => handleSkillToggle(skill)}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            ) : (
              <div className="tags-list">
                {user?.skills?.length > 0 ? (
                  user.skills.map((skill, index) => (
                    <span key={index} className="tag skill">{skill}</span>
                  ))
                ) : (
                  <p className="value">No skills added</p>
                )}
              </div>
            )}
          </div>

          {user?.experience_years && (
            <div className="form-group">
              <label>Experience</label>
              <p className="value">{user.experience_years} years</p>
            </div>
          )}

          {editingSkills && (
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={handleSkillsCancel}>
                Cancel
              </button>
              <button type="button" className="btn-save" onClick={handleSkillsUpdate} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Upgrade to Professional Button */}
          {(user?.tasker_type === 'helper' || !user?.tasker_type || (user?.tasker_type !== 'professional' && !user?.professional_badge)) && (
            <div className="upgrade-section">
              <div className="upgrade-info">
                <h4>⭐ Upgrade to Professional</h4>
                <p>Get verified, access premium jobs, and earn more!</p>
              </div>
              <button 
                className="btn-upgrade" 
                onClick={() => setShowUpgradeModal(true)}
              >
                Apply for Professional Status
              </button>
            </div>
          )}
        </div>

        {/* Account Details */}
        <div className="info-section">
          <h3>Account Details</h3>
          
          <div className="form-group">
            <label>Email</label>
            <p className="value">{user?.email}</p>
          </div>

          <div className="form-group">
            <label>Account Type</label>
            <p className="value">{user?.role}</p>
          </div>

          <div className="form-group">
            <label>Verification Status</label>
            <p className="value">
              <span className={`status-badge ${user?.verification_status}`}>
                {user?.verification_status?.replace('_', ' ').toUpperCase()}
              </span>
            </p>
          </div>

          <div className="form-group">
            <label>Member Since</label>
            <p className="value">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Upgrade to Professional Modal */}
      {showUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⭐ Upgrade to Professional</h2>
              <button className="modal-close" onClick={() => setShowUpgradeModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <p className="modal-description">
                Become a verified professional to access premium jobs, earn more, and build your reputation faster!
              </p>

              <div className="benefits-list">
                <h4>Benefits:</h4>
                <ul>
                  <li>✓ Professional badge on your profile</li>
                  <li>✓ Access to high-paying premium jobs</li>
                  <li>✓ Priority in search results</li>
                  <li>✓ Your own referral code to earn bonuses</li>
                  <li>✓ Increased customer trust</li>
                </ul>
              </div>

              <div className="form-group">
                <label>Years of Experience *</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={upgradeData.experience_years}
                  onChange={(e) => setUpgradeData(prev => ({ ...prev, experience_years: e.target.value }))}
                  placeholder="How many years of professional experience?"
                  required
                />
              </div>

              <div className="form-group">
                <label>Skills Required *</label>
                <p className="helper-text">
                  You have selected {skillsData.skills.length} skill(s). 
                  {skillsData.skills.length === 0 && <span className="error-text"> Please select at least one skill from the Skills section above.</span>}
                </p>
                {skillsData.skills.length > 0 && (
                  <div className="tags-list">
                    {skillsData.skills.map((skill, index) => (
                      <span key={index} className="tag skill">{skill}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Referral Code (Optional)</label>
                <input
                  type="text"
                  value={upgradeData.referral_code}
                  onChange={(e) => setUpgradeData(prev => ({ ...prev, referral_code: e.target.value }))}
                  placeholder="Enter referral code from an existing professional"
                />
                <small>Get faster verification with a professional's referral code</small>
              </div>

              <div className="alert-info">
                <p>⚠️ Your application will be reviewed by our admin team. You'll receive a notification once verified.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-cancel" 
                onClick={() => setShowUpgradeModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleUpgradeToProfessional}
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
