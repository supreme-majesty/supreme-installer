import React, { useState, useEffect } from 'react';
import './ModuleConfigModal.css';

const ModuleConfigModal = ({ isOpen, onClose, module, onSave }) => {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && module) {
      // Set default configuration if none provided
      const defaultConfig = {
        platform: { autoDetect: true, preferredApache: 'xampp', preferredDatabase: 'mysql' },
        ssl: { autoRenew: true, wildcardDomain: 'localhost', encryptionLevel: 'high' },
        database: { defaultType: 'mysql', autoBackup: true, backupRetention: 30 },
        projects: { defaultFramework: 'laravel', autoCreateDatabase: true, enableSSL: true },
        dependencies: { autoInstall: true, preferXAMPP: true, checkUpdates: true },
        sync: { backend: 'none', encryption: true, autoSync: false }
      };
      
      setConfig(module.configuration || defaultConfig[module.id] || {});
      setError(null);
    }
  }, [isOpen, module]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      await onSave(module.id, config);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Configure {module?.name}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {module?.id === 'platform' && (
            <div className="config-section">
              <h4>Platform Detection Settings</h4>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.autoDetect || false}
                    onChange={e => handleInputChange('autoDetect', e.target.checked)}
                  />
                  Auto-detect platform configuration
                </label>
              </div>
              <div className="form-group">
                <label>Preferred Apache Installation:</label>
                <select
                  value={config.preferredApache || 'xampp'}
                  onChange={e => handleInputChange('preferredApache', e.target.value)}
                >
                  <option value="xampp">XAMPP</option>
                  <option value="system">System Apache</option>
                </select>
              </div>
              <div className="form-group">
                <label>Preferred Database:</label>
                <select
                  value={config.preferredDatabase || 'mysql'}
                  onChange={e => handleInputChange('preferredDatabase', e.target.value)}
                >
                  <option value="mysql">MySQL</option>
                  <option value="postgresql">PostgreSQL</option>
                </select>
              </div>
            </div>
          )}

          {module?.id === 'ssl' && (
            <div className="config-section">
              <h4>SSL Management Settings</h4>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.autoRenew || false}
                    onChange={e => handleInputChange('autoRenew', e.target.checked)}
                  />
                  Auto-renew certificates
                </label>
              </div>
              <div className="form-group">
                <label>Wildcard Domain:</label>
                <input
                  type="text"
                  value={config.wildcardDomain || 'localhost'}
                  onChange={e => handleInputChange('wildcardDomain', e.target.value)}
                  placeholder="localhost"
                />
              </div>
              <div className="form-group">
                <label>Encryption Level:</label>
                <select
                  value={config.encryptionLevel || 'high'}
                  onChange={e => handleInputChange('encryptionLevel', e.target.value)}
                >
                  <option value="low">Low (1024-bit)</option>
                  <option value="medium">Medium (2048-bit)</option>
                  <option value="high">High (4096-bit)</option>
                </select>
              </div>
            </div>
          )}

          {module?.id === 'database' && (
            <div className="config-section">
              <h4>Database Settings</h4>
              <div className="form-group">
                <label>Default Database Type:</label>
                <select
                  value={config.defaultType || 'mysql'}
                  onChange={e => handleInputChange('defaultType', e.target.value)}
                >
                  <option value="mysql">MySQL</option>
                  <option value="postgresql">PostgreSQL</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.autoBackup || false}
                    onChange={e => handleInputChange('autoBackup', e.target.checked)}
                  />
                  Enable automatic backups
                </label>
              </div>
              <div className="form-group">
                <label>Backup Retention (days):</label>
                <input
                  type="number"
                  value={config.backupRetention || 30}
                  onChange={e => handleInputChange('backupRetention', parseInt(e.target.value))}
                  min="1"
                  max="365"
                />
              </div>
            </div>
          )}

          {module?.id === 'projects' && (
            <div className="config-section">
              <h4>Project Management Settings</h4>
              <div className="form-group">
                <label>Default Framework:</label>
                <select
                  value={config.defaultFramework || 'laravel'}
                  onChange={e => handleInputChange('defaultFramework', e.target.value)}
                >
                  <option value="laravel">Laravel</option>
                  <option value="react">React</option>
                  <option value="vue">Vue</option>
                  <option value="angular">Angular</option>
                  <option value="django">Django</option>
                  <option value="flask">Flask</option>
                  <option value="wordpress">WordPress</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.autoCreateDatabase || false}
                    onChange={e => handleInputChange('autoCreateDatabase', e.target.checked)}
                  />
                  Auto-create database for new projects
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.enableSSL || false}
                    onChange={e => handleInputChange('enableSSL', e.target.checked)}
                  />
                  Enable SSL by default for new projects
                </label>
              </div>
            </div>
          )}

          {module?.id === 'dependencies' && (
            <div className="config-section">
              <h4>Dependency Management Settings</h4>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.autoInstall || false}
                    onChange={e => handleInputChange('autoInstall', e.target.checked)}
                  />
                  Auto-install missing dependencies
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.preferXAMPP || false}
                    onChange={e => handleInputChange('preferXAMPP', e.target.checked)}
                  />
                  Prefer XAMPP over system packages
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.checkUpdates || false}
                    onChange={e => handleInputChange('checkUpdates', e.target.checked)}
                  />
                  Check for dependency updates
                </label>
              </div>
            </div>
          )}

          {module?.id === 'sync' && (
            <div className="config-section">
              <h4>Cloud Sync Settings</h4>
              <div className="form-group">
                <label>Sync Backend:</label>
                <select
                  value={config.backend || 'none'}
                  onChange={e => handleInputChange('backend', e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="github">GitHub</option>
                  <option value="gitlab">GitLab</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.encryption || false}
                    onChange={e => handleInputChange('encryption', e.target.checked)}
                  />
                  Encrypt synced data
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.autoSync || false}
                    onChange={e => handleInputChange('autoSync', e.target.checked)}
                  />
                  Auto-sync configuration changes
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleConfigModal;
