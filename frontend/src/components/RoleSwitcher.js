import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
export default function RoleSwitcher() {
  const { user, switchRole, hasMultipleRoles, availableRoles } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const navigate = useNavigate();

  if (!hasMultipleRoles) return null;
  const handleRoleSwitch = async (newRole) => {
    if (newRole === user.role) {
      setIsOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await switchRole(newRole);
      toast.success(`Switched to ${newRole} mode successfully!`);
      if (newRole === 'customer') navigate('/customer/dashboard');
      else if (newRole === 'tasker') navigate('/tasker/dashboard');
      else if (newRole === 'superadmin') navigate('/superadmin/dashboard');
      setIsOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to switch role');
    } finally {
      setSwitching(false);
    }
  };
  const getRoleIcon = (role) => {
    if (role === 'customer') return '🛒';
    if (role === 'tasker') return '🔧';
    if (role === 'superadmin') return '👑';
    return '👤';
  };
  const getRoleLabel = (role) => {
    if (role === 'customer') return 'Customer Mode';
    if (role === 'tasker') return 'Tasker Mode';
    if (role === 'superadmin') return 'Admin Mode';
    return role;
  };
  return (
    <div className="role-switcher">
      <button
        className="role-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        title="Switch Role"
      >
        <span className="role-icon">{getRoleIcon(user.role)}</span>
        <span className="role-label">{getRoleLabel(user.role)}</span>
        <svg
          className={`dropdown-arrow ${isOpen ? 'open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </button>
      {isOpen && (
        <div className="role-switcher-dropdown">
          <div className="role-switcher-header">
            <span>Switch View</span>
          </div>
          {availableRoles.map((role) => (
            <button
              key={role}
              className={`role-option ${role === user.role ? 'active' : ''}`}
              onClick={() => handleRoleSwitch(role)}
              disabled={switching || role === user.role}
            >
              <span className="role-option-icon">{getRoleIcon(role)}</span>
              <span className="role-option-label">{getRoleLabel(role)}</span>
              {role === user.role && (
                <svg
                  className="checkmark"
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
      {isOpen && (
        <div className="role-switcher-overlay" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
