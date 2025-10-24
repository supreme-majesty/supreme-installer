import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import './Settings.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    general: {
      theme: 'dark',
      language: 'en',
      timezone: 'UTC',
      notifications: true,
      autoSave: true
    },
    supreme: {
      tld: 'test',
      webroot: '/var/www/html',
      defaultProtocol: 'https',
      enableDatabase: true,
      apacheRestartCmd: 'sudo systemctl restart apache2',
      certDir: '/etc/ssl/certs',
      vhostsPath: '/etc/apache2/sites-available'
    },
    development: {
      hotReload: true,
      debugMode: false,
      logLevel: 'info',
      port: 5000,
      host: 'localhost'
    },
    security: {
      enableHttps: true,
      enableCors: true,
      sessionTimeout: 30,
      maxLoginAttempts: 5
    },
    database: {
      enabled: true,
      host: 'localhost',
      port: 3306,
      name: 'supreme_dev',
      username: 'root',
      password: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [showResetModal, setShowResetModal] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    // Load settings from localStorage or API
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // First, get platform configuration from API
      const platformResponse = await fetch('/api/platform', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      let platformConfig = {};
      if (platformResponse.ok) {
        platformConfig = await platformResponse.json();
      }
      
      const savedSettings = localStorage.getItem('supreme-dashboard-settings');
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          // Ensure all required sections exist
          const defaultSettings = {
            general: {
              theme: 'dark',
              language: 'en',
              timezone: 'UTC',
              notifications: true,
              autoSave: true
            },
            supreme: {
              tld: 'test',
              webroot: platformConfig.webroot || '/var/www/html',
              defaultProtocol: 'https',
              enableDatabase: true,
              apacheRestartCmd: platformConfig.apacheRestartCmd || 'sudo systemctl restart apache2',
              certDir: platformConfig.certRoot || '/etc/ssl/certs',
              vhostsPath: platformConfig.vhostsPath || '/etc/apache2/sites-available'
            },
            development: {
              hotReload: true,
              debugMode: false,
              logLevel: 'info',
              port: 5000,
              host: 'localhost'
            },
            security: {
              enableHttps: true,
              enableCors: true,
              sessionTimeout: 30,
              maxLoginAttempts: 5
            },
            database: {
              enabled: true,
              host: 'localhost',
              port: 3306,
              name: 'supreme_dev',
              username: 'root',
              password: ''
            }
          };
          
          setSettings({
            ...defaultSettings,
            ...parsedSettings,
            // Ensure each section has all required properties
            general: { ...defaultSettings.general, ...parsedSettings.general },
            supreme: { ...defaultSettings.supreme, ...parsedSettings.supreme },
            development: { ...defaultSettings.development, ...parsedSettings.development },
            security: { ...defaultSettings.security, ...parsedSettings.security },
            database: { ...defaultSettings.database, ...parsedSettings.database }
          });
        } catch (error) {
          console.error('Error parsing saved settings:', error);
          // If parsing fails, use default settings with platform config
          setSettings({
            general: {
              theme: 'dark',
              language: 'en',
              timezone: 'UTC',
              notifications: true,
              autoSave: true
            },
            supreme: {
              tld: 'test',
              webroot: platformConfig.webroot || '/var/www/html',
              defaultProtocol: 'https',
              enableDatabase: true,
              apacheRestartCmd: platformConfig.apacheRestartCmd || 'sudo systemctl restart apache2',
              certDir: platformConfig.certRoot || '/etc/ssl/certs',
              vhostsPath: platformConfig.vhostsPath || '/etc/apache2/sites-available'
            },
            development: {
              hotReload: true,
              debugMode: false,
              logLevel: 'info',
              port: 5000,
              host: 'localhost'
            },
            security: {
              enableHttps: true,
              enableCors: true,
              sessionTimeout: 30,
              maxLoginAttempts: 5
            },
            database: {
              enabled: true,
              host: 'localhost',
              port: 3306,
              name: 'supreme_dev',
              username: 'root',
              password: ''
            }
          });
        }
      } else {
        // No saved settings, use platform config as defaults
        setSettings({
          general: {
            theme: 'dark',
            language: 'en',
            timezone: 'UTC',
            notifications: true,
            autoSave: true
          },
          supreme: {
            tld: 'test',
            webroot: platformConfig.webroot || '/var/www/html',
            defaultProtocol: 'https',
            enableDatabase: true,
            apacheRestartCmd: platformConfig.apacheRestartCmd || 'sudo systemctl restart apache2',
            certDir: platformConfig.certRoot || '/etc/ssl/certs',
            vhostsPath: platformConfig.vhostsPath || '/etc/apache2/sites-available'
          },
          development: {
            hotReload: true,
            debugMode: false,
            logLevel: 'info',
            port: 5000,
            host: 'localhost'
          },
          security: {
            enableHttps: true,
            enableCors: true,
            sessionTimeout: 30,
            maxLoginAttempts: 5
          },
          database: {
            enabled: true,
            host: 'localhost',
            port: 3306,
            name: 'supreme_dev',
            username: 'root',
            password: ''
          }
        });
      }
    } catch (error) {
      console.error('Error loading platform configuration:', error);
      // Fallback to default settings if API fails
      setSettings({
        general: {
          theme: 'dark',
          language: 'en',
          timezone: 'UTC',
          notifications: true,
          autoSave: true
        },
        supreme: {
          tld: 'test',
          webroot: '/var/www/html',
          defaultProtocol: 'https',
          enableDatabase: true,
          apacheRestartCmd: 'sudo systemctl restart apache2',
          certDir: '/etc/ssl/certs',
          vhostsPath: '/etc/apache2/sites-available'
        },
        development: {
          hotReload: true,
          debugMode: false,
          logLevel: 'info',
          port: 5000,
          host: 'localhost'
        },
        security: {
          enableHttps: true,
          enableCors: true,
          sessionTimeout: 30,
          maxLoginAttempts: 5
        },
        database: {
          enabled: true,
          host: 'localhost',
          port: 3306,
          name: 'supreme_dev',
          username: 'root',
          password: ''
        }
      });
    }
  };

  const handleInputChange = (category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Save to localStorage
      localStorage.setItem('supreme-dashboard-settings', JSON.stringify(settings));

      // Send to API
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setLoading(false);
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleReset = () => {
    setShowResetModal(true);
  };

  const resetSettings = () => {
    setSettings({
      general: {
        theme: 'dark',
        language: 'en',
        timezone: 'UTC',
        notifications: true,
        autoSave: true
      },
      supreme: {
        tld: 'test',
        webroot: '/var/www/html',
        defaultProtocol: 'https',
        enableDatabase: true,
        apacheRestartCmd: 'sudo systemctl restart apache2',
        certDir: '/etc/ssl/certs',
        vhostsPath: '/etc/apache2/sites-available'
      },
      development: {
        hotReload: true,
        debugMode: false,
        logLevel: 'info',
        port: 5000,
        host: 'localhost'
      },
      security: {
        enableHttps: true,
        enableCors: true,
        sessionTimeout: 30,
        maxLoginAttempts: 5
      },
      database: {
        enabled: true,
        host: 'localhost',
        port: 3306,
        name: 'supreme_dev',
        username: 'root',
        password: ''
      }
    });
    setMessage({ type: 'info', text: 'Settings reset to default values.' });
  };

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'supreme', label: 'Supreme', icon: '⚡' },
    { id: 'development', label: 'Development', icon: '💻' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'database', label: 'Database', icon: '🗄️' }
  ];

  return (
    <div className="settings">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your Supreme Development Environment</p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-container">
        {/* Settings Tabs */}
        <div className="settings-tabs">
          <div className="dashboard-card">
            <div className="tab-list">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  <span className="tab-label">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="settings-content">
          <div className="dashboard-card">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="settings-section">
                <h3>General Settings</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Theme</label>
                    <select
                      className="form-input"
                      value={settings.general.theme}
                      onChange={(e) => handleInputChange('general', 'theme', e.target.value)}
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Language</label>
                    <select
                      className="form-input"
                      value={settings.general.language}
                      onChange={(e) => handleInputChange('general', 'language', e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Timezone</label>
                    <select
                      className="form-input"
                      value={settings.general.timezone}
                      onChange={(e) => handleInputChange('general', 'timezone', e.target.value)}
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notifications</label>
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id="notifications"
                        checked={settings.general.notifications}
                        onChange={(e) => handleInputChange('general', 'notifications', e.target.checked)}
                      />
                      <label htmlFor="notifications">Enable notifications</label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Auto Save</label>
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id="autoSave"
                        checked={settings.general.autoSave}
                        onChange={(e) => handleInputChange('general', 'autoSave', e.target.checked)}
                      />
                      <label htmlFor="autoSave">Automatically save changes</label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Supreme Settings */}
            {activeTab === 'supreme' && (
              <div className="settings-section">
                <h3>Supreme Configuration</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Top Level Domain (TLD)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={settings.supreme?.tld || 'test'}
                      onChange={(e) => handleInputChange('supreme', 'tld', e.target.value)}
                      placeholder="test"
                    />
                    <small className="form-help">Default domain extension for local projects (e.g., .test, .dev, .local)</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Web Root Directory {settings.supreme?.webroot}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={settings.supreme?.webroot || '/var/www/html'}
                      onChange={(e) => handleInputChange('supreme', 'webroot', e.target.value)}
                      placeholder="/var/www/html"
                    />
                    <small className="form-help">
                      Directory where your projects are stored. 
                      If XAMPP is detected, it will automatically use XAMPP's htdocs directory instead of /var/www/html.
                    </small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Default Protocol</label>
                    <select
                      className="form-input"
                      value={settings.supreme?.defaultProtocol || 'https'}
                      onChange={(e) => handleInputChange('supreme', 'defaultProtocol', e.target.value)}
                    >
                      <option value="http">HTTP</option>
                      <option value="https">HTTPS</option>
                    </select>
                    <small className="form-help">Default protocol for new projects</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Apache Restart Command</label>
                    <input
                      type="text"
                      className="form-input"
                      value={settings.supreme?.apacheRestartCmd || 'sudo systemctl restart apache2'}
                      onChange={(e) => handleInputChange('supreme', 'apacheRestartCmd', e.target.value)}
                      placeholder="sudo systemctl restart apache2"
                    />
                    <small className="form-help">Command to restart Apache server</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">SSL Certificate Directory</label>
                    <input
                      type="text"
                      className="form-input"
                      value={settings.supreme?.certDir || '/etc/ssl/certs'}
                      onChange={(e) => handleInputChange('supreme', 'certDir', e.target.value)}
                      placeholder="/etc/ssl/certs"
                    />
                    <small className="form-help">Directory where SSL certificates are stored</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Virtual Hosts Path</label>
                    <input
                      type="text"
                      className="form-input"
                      value={settings.supreme?.vhostsPath || '/etc/apache2/sites-available'}
                      onChange={(e) => handleInputChange('supreme', 'vhostsPath', e.target.value)}
                      placeholder="/etc/apache2/sites-available"
                    />
                    <small className="form-help">Directory where Apache virtual host files are stored</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Database Features</label>
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id="supremeDbEnabled"
                        checked={settings.supreme?.enableDatabase || true}
                        onChange={(e) => handleInputChange('supreme', 'enableDatabase', e.target.checked)}
                      />
                      <label htmlFor="supremeDbEnabled">Enable database management features</label>
                    </div>
                    <small className="form-help">Enable database creation and management commands</small>
                  </div>
                </div>

                <div className="settings-actions-inline">
                  <button className="btn btn-info" onClick={() => window.location.href = '/certificates'}>
                    🔐 Manage SSL Certificates
                  </button>
                  <button className="btn btn-secondary" onClick={() => window.location.href = '/projects'}>
                    🏠 View Projects
                  </button>
                </div>
              </div>
            )}

            {/* Development Settings */}
            {activeTab === 'development' && (
              <div className="settings-section">
                <h3>Development Settings</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Hot Reload</label>
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id="hotReload"
                        checked={settings.development.hotReload}
                        onChange={(e) => handleInputChange('development', 'hotReload', e.target.checked)}
                      />
                      <label htmlFor="hotReload">Enable hot reloading</label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Debug Mode</label>
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id="debugMode"
                        checked={settings.development.debugMode}
                        onChange={(e) => handleInputChange('development', 'debugMode', e.target.checked)}
                      />
                      <label htmlFor="debugMode">Enable debug mode</label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Log Level</label>
                    <select
                      className="form-input"
                      value={settings.development.logLevel}
                      onChange={(e) => handleInputChange('development', 'logLevel', e.target.value)}
                    >
                      <option value="error">Error</option>
                      <option value="warn">Warning</option>
                      <option value="info">Info</option>
                      <option value="debug">Debug</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Server Port</label>
                    <input
                      type="number"
                      className="form-input"
                      value={settings.development.port}
                      onChange={(e) => handleInputChange('development', 'port', parseInt(e.target.value))}
                      min="1000"
                      max="65535"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Server Host</label>
                    <input
                      type="text"
                      className="form-input"
                      value={settings.development.host}
                      onChange={(e) => handleInputChange('development', 'host', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="settings-section">
                <h3>Security Settings</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">HTTPS</label>
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id="enableHttps"
                        checked={settings.security.enableHttps}
                        onChange={(e) => handleInputChange('security', 'enableHttps', e.target.checked)}
                      />
                      <label htmlFor="enableHttps">Enable HTTPS</label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">CORS</label>
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id="enableCors"
                        checked={settings.security.enableCors}
                        onChange={(e) => handleInputChange('security', 'enableCors', e.target.checked)}
                      />
                      <label htmlFor="enableCors">Enable CORS</label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
                      min="5"
                      max="1440"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Max Login Attempts</label>
                    <input
                      type="number"
                      className="form-input"
                      value={settings.security.maxLoginAttempts}
                      onChange={(e) => handleInputChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                      min="3"
                      max="10"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Database Settings */}
            {activeTab === 'database' && (
              <div className="settings-section">
                <h3>Database Settings</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Database</label>
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id="dbEnabled"
                        checked={settings.database.enabled}
                        onChange={(e) => handleInputChange('database', 'enabled', e.target.checked)}
                      />
                      <label htmlFor="dbEnabled">Enable database features</label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Host</label>
                    <input
                      type="text"
                      className="form-input"
                      value={settings.database.host}
                      onChange={(e) => handleInputChange('database', 'host', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Port</label>
                    <input
                      type="number"
                      className="form-input"
                      value={settings.database.port}
                      onChange={(e) => handleInputChange('database', 'port', parseInt(e.target.value))}
                      min="1"
                      max="65535"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Database Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={settings.database.name}
                      onChange={(e) => handleInputChange('database', 'name', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      className="form-input"
                      value={settings.database.username}
                      onChange={(e) => handleInputChange('database', 'username', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={settings.database.password}
                      onChange={(e) => handleInputChange('database', 'password', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="settings-actions">
              <button
                className="btn btn-secondary"
                onClick={handleReset}
                disabled={loading}
              >
                Reset to Default
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Settings Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={resetSettings}
        title="Reset Settings"
        message="Are you sure you want to reset all settings to default? This action cannot be undone."
        confirmText="Reset"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
};

export default Settings;
