import React from 'react';
import './Header.css';

const Header = ({ onMenuClick, systemInfo }) => {
  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-button" onClick={onMenuClick}>
          <span className="menu-icon">☰</span>
        </button>
        <div className="header-title">
          <h1>Supreme Dashboard</h1>
          <p>Development Environment Management</p>
        </div>
      </div>
      
      <div className="header-right">
        {systemInfo && (
          <div className="system-status">
            <div className="status-indicator">
              <div className="status-dot online"></div>
              <span>Online</span>
            </div>
            <div className="uptime">
              <span className="uptime-label">Uptime:</span>
              <span className="uptime-value">
                {formatUptime(systemInfo.uptime.seconds)}
              </span>
            </div>
          </div>
        )}
        
        <div className="user-avatar">
          <div className="avatar-icon">👤</div>
          <div className="user-info">
            <span className="user-name">Admin</span>
            <span className="user-role">System Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
