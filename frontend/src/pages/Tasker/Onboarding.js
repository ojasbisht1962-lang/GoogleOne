import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/apiService';
import { toast } from 'react-toastify';
import ServiceAreaLocationSelector from '../../components/ServiceAreaLocationSelector/ServiceAreaLocationSelector';
import './Onboarding.css';

const LANGUAGES = [
  'English', 'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 
  'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Other'
];

const SKILLS = [
  'Cleaning', 'Plumbing', 'Electrical', 'Carpentry', 'Painting',
  'Moving & Packing', 'Appliance Repair', 'Pest Control', 
  'Gardening', 'AC Repair', 'Computer Repair', 'Mobile Repair', 'Other'
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    // Personal Details
    age: '',
    phone: '',
    address: '',
    bio: '',
    
    // Service Location (mandatory)
    service_location: null,
    
    // Tasker Type
    tasker_type: 'helper', // helper or professional
    
    // Languages
    languages_spoken: [],
    
    // Background Check
    criminal_record: false,
    
    // Professional Details (if applicable)
    work_as_professional: false,
    experience_years: '',
    skills: [],
    referral_code: '',
    
    // Documents (for verification)
    documents: {
      id_proof: null,
      address_proof: null,
      skill_certificate: null,
    }
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLanguageToggle = (language) => {
    setFormData(prev => ({
      ...prev,
      languages_spoken: prev.languages_spoken.includes(language)
        ? prev.languages_spoken.filter(l => l !== language)
        : [...prev.languages_spoken, language]
    }));
  };

  const handleSkillToggle = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const validateStep = (currentStep) => {
    switch(currentStep) {
      case 1:
        if (!formData.age || formData.age < 18) {
          toast.error('You must be at least 18 years old');
          return false;
        }
        if (!formData.phone || formData.phone.length < 10) {
          toast.error('Please enter a valid phone number');
          return false;
        }
        if (!formData.address || formData.address.length < 10) {
          toast.error('Please enter your complete address');
          return false;
        }
        if (!formData.service_location || !formData.service_location.address) {
          toast.error('Please set your service location');
          return false;
        }
        return true;
        
      case 2:
        if (!formData.tasker_type) {
          toast.error('Please select your tasker type');
          return false;
        }
        if (formData.tasker_type === 'professional') {
          if (!formData.experience_years || formData.experience_years < 1) {
            toast.error('Professionals must have at least 1 year of experience');
            return false;
          }
          if (formData.skills.length === 0) {
            toast.error('Please select at least one skill');
            return false;
          }
        }
        return true;
        
      case 3:
        if (formData.languages_spoken.length === 0) {
          toast.error('Please select at least one language');
          return false;
        }
        return true;
        
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(step)) return;
    
    setLoading(true);
    try {
      // Prepare data for submission
      const profileData = {
        age: parseInt(formData.age),
        phone: formData.phone,
        address: formData.address,
        bio: formData.bio,
        service_location: formData.service_location,
        tasker_type: formData.tasker_type,
        languages_spoken: formData.languages_spoken,
        criminal_record: formData.criminal_record,
        work_as_professional: formData.tasker_type === 'professional',
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
        skills: formData.skills,
        referral_code: formData.referral_code || null,
      };

      const updatedUser = await userService.completeTaskerProfile(profileData);
      
      // Update the user in auth context with the new data
      updateUser(updatedUser);
      
      toast.success('Profile completed successfully!');
      
      // If applying as professional with referral, verification is pending
      if (formData.tasker_type === 'professional' && formData.referral_code) {
        toast.info('Your verification request has been submitted for review');
      }
      
      navigate('/tasker/dashboard');
    } catch (error) {
      console.error('Profile completion error:', error);
      toast.error(error.response?.data?.detail || 'Failed to complete profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="onboarding-step">
      <h2>📋 Personal Information</h2>
      <p className="step-description">Let's start with your basic details</p>
      
      <div className="form-group">
        <label>Age *</label>
        <input
          type="number"
          name="age"
          value={formData.age}
          onChange={handleInputChange}
          min="18"
          max="100"
          required
          placeholder="Enter your age"
        />
        <small>You must be at least 18 years old</small>
      </div>

      <div className="form-group">
        <label>Phone Number *</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          required
          placeholder="Enter your 10-digit mobile number"
          maxLength="10"
        />
      </div>

      <div className="form-group">
        <label>Complete Address *</label>
        <textarea
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          required
          placeholder="Enter your complete address with city and pincode"
          rows="3"
        />
      </div>

      <div className="form-group">
        <label>Bio (Optional)</label>
        <textarea
          name="bio"
          value={formData.bio}
          onChange={handleInputChange}
          placeholder="Tell customers about yourself and your work style..."
          rows="4"
          maxLength="500"
        />
        <small>{formData.bio.length}/500 characters</small>
      </div>

      <div className="form-group">
        <ServiceAreaLocationSelector
          value={formData.service_location}
          onChange={(location) => setFormData(prev => ({ ...prev, service_location: location }))}
          required={true}
          label="Service Area"
        />
        <small className="help-text">This location will be displayed on all your service offerings. Customers will use this to find services near them.</small>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="onboarding-step">
      <h2>⚡ Tasker Type & Skills</h2>
      <p className="step-description">Choose your role and expertise</p>
      
      <div className="form-group">
        <label>I want to work as a: *</label>
        <div className="tasker-type-cards">
          <div 
            className={`type-card ${formData.tasker_type === 'helper' ? 'selected' : ''}`}
            onClick={() => setFormData(prev => ({ ...prev, tasker_type: 'helper' }))}
          >
            <div className="type-icon">🙋‍♂️</div>
            <h3>Helper</h3>
            <p>General tasks and assistance</p>
            <ul>
              <li>No experience required</li>
              <li>Quick approval</li>
              <li>Basic tasks</li>
            </ul>
          </div>
          
          <div 
            className={`type-card ${formData.tasker_type === 'professional' ? 'selected' : ''}`}
            onClick={() => setFormData(prev => ({ ...prev, tasker_type: 'professional' }))}
          >
            <div className="type-icon">⭐</div>
            <h3>Professional</h3>
            <p>Skilled expert services</p>
            <ul>
              <li>Experience required</li>
              <li>Verification needed</li>
              <li>Higher earnings</li>
              <li>Professional badge</li>
            </ul>
          </div>
        </div>
      </div>

      {formData.tasker_type === 'professional' && (
        <>
          <div className="form-group">
            <label>Years of Experience *</label>
            <input
              type="number"
              name="experience_years"
              value={formData.experience_years}
              onChange={handleInputChange}
              min="1"
              max="50"
              required
              placeholder="How many years of professional experience?"
            />
          </div>

          <div className="form-group">
            <label>Your Skills/Services *</label>
            <div className="skills-grid">
              {SKILLS.map(skill => (
                <button
                  key={skill}
                  type="button"
                  className={`skill-chip ${formData.skills.includes(skill) ? 'selected' : ''}`}
                  onClick={() => handleSkillToggle(skill)}
                >
                  {skill}
                </button>
              ))}
            </div>
            <small>Select all skills you can provide</small>
          </div>

          <div className="form-group">
            <label>Referral Code (Optional)</label>
            <input
              type="text"
              name="referral_code"
              value={formData.referral_code}
              onChange={handleInputChange}
              placeholder="Enter referral code from an existing professional"
            />
            <small>Get faster verification with a professional's referral code</small>
          </div>
        </>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="onboarding-step">
      <h2>🗣️ Languages & Background</h2>
      <p className="step-description">Final details to complete your profile</p>
      
      <div className="form-group">
        <label>Languages You Speak *</label>
        <div className="languages-grid">
          {LANGUAGES.map(language => (
            <button
              key={language}
              type="button"
              className={`language-chip ${formData.languages_spoken.includes(language) ? 'selected' : ''}`}
              onClick={() => handleLanguageToggle(language)}
            >
              {language}
            </button>
          ))}
        </div>
        <small>Select all languages you can communicate in</small>
      </div>

      <div className="form-group">
        <div className="checkbox-group">
          <input
            type="checkbox"
            name="criminal_record"
            id="criminal_record"
            checked={formData.criminal_record}
            onChange={handleInputChange}
          />
          <label htmlFor="criminal_record">
            I acknowledge that I have a criminal record
          </label>
        </div>
        <small className="warning-text">
          ⚠️ Honesty is important. Background checks may be conducted.
        </small>
      </div>

      <div className="info-box">
        <h4>📝 What happens next?</h4>
        <ul>
          {formData.tasker_type === 'helper' ? (
            <>
              <li>Your profile will be activated immediately</li>
              <li>You can start browsing service requests</li>
              <li>Build your reputation with completed jobs</li>
            </>
          ) : (
            <>
              <li>Your profile will be submitted for verification</li>
              <li>SuperAdmin will review your details</li>
              <li>You'll receive a professional badge upon approval</li>
              <li>Access to premium service requests</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );

  return (
    <>
      <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <h1>Complete Your Tasker Profile</h1>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
          <div className="step-indicator">
            Step {step} of 3
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          <div className="form-actions">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="btn-secondary"
                disabled={loading}
              >
                ← Back
              </button>
            )}
            
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary"
              >
                Continue →
              </button>
            ) : (
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Completing Profile...' : 'Complete Profile ✓'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
