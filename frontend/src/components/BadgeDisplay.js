import React from 'react';
import './BadgeDisplay.css';

const BADGE_INFO = {
  bronze: {
    name: 'Verified Professional',
    icon: '🥉',
    color: '#CD7F32'
  },
  silver: {
    name: 'Trusted Expert',
    icon: '🥈',
    color: '#C0C0C0'
  },
  gold: {
    name: 'Elite Professional',
    icon: '🥇',
    color: '#FFD700'
  }
};

export default function BadgeDisplay({ badgeType, size = 'medium', showName = true }) {
  if (!badgeType || !BADGE_INFO[badgeType]) {
    return null;
  }

  const badge = BADGE_INFO[badgeType];

  return (
    <div className={`badge-display ${size} ${badgeType}`}>
      <span className="badge-icon" style={{ color: badge.color }}>
        {badge.icon}
      </span>
      {showName && <span className="badge-name">{badge.name}</span>}
    </div>
  );
}
