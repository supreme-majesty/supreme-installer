import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ isOpen, onToggle }) => {
  const location = useLocation();

  const menuItems = [
    {
      path: '/',
      icon: '📊',
      label: 'Dashboard',
      description: 'Overview and analytics'
    },
    {
      path: '/projects',
      icon: '🏠',
      label: 'Projects',
      description: 'Manage local development projects'
    },
    {
      path: '/certificates',
      icon: '🔐',
      label: 'Certificates',
      description: 'SSL certificate management'
    },
    {
      path: '/logs',
      icon: '📜',
      label: 'Logs',
      description: 'Apache and application logs'
    },
    {
      path: '/system',
      icon: '💻',
      label: 'System Info',
      description: 'System status and metrics'
    },
    {
      path: '/modules',
      icon: '🧩',
      label: 'Modules',
      description: 'Installed modules and plugins'
    },
    {
      path: '/database',
      icon: '🗄️',
      label: 'Database',
      description: 'Database management and queries'
    },
    {
      path: '/files',
      icon: '📁',
      label: 'File Manager',
      description: 'Browse and edit project files'
    },
    {
      path: '/terminal',
      icon: '💻',
      label: 'Terminal',
      description: 'Execute commands and manage environment'
    },
    {
      path: '/settings',
      icon: '⚙️',
      label: 'Settings',
      description: 'Configuration and preferences'
    }
  ];

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">⚡</div>
          {isOpen && (
            <div className="logo-text">
              <h2>Supreme</h2>
              <p>Dashboard</p>
            </div>
          )}
        </div>
        {/* <button className="sidebar-toggle" onClick={onToggle}>
          {isOpen ? '←' : '→'}
        </button> */}
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item) => (
            <li key={item.path} className="nav-item">
              <Link
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                title={!isOpen ? item.label : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                {isOpen && (
                  <div className="nav-content">
                    <span className="nav-label">{item.label}</span>
                    <span className="nav-description">{item.description}</span>
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="version-info">
          {isOpen && (
            <div className="version-text">
              <p>Supreme Dashboard</p>
              <small>v2.0.0</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
