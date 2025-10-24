import React, { useState, useEffect } from 'react';
import './AddColumnModal.css';

const AddColumnModal = ({ isOpen, onClose, onSubmit, database, table }) => {
  const [columnName, setColumnName] = useState('');
  const [columnType, setColumnType] = useState('VARCHAR');
  const [typeParams, setTypeParams] = useState('255');
  const [nullable, setNullable] = useState(true);
  const [unique, setUnique] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fieldTypes = [
    { value: 'INT', label: 'Integer', description: 'Whole numbers (e.g., 1, 100, -5)', needsParams: false },
    { value: 'VARCHAR', label: 'Varchar', description: 'Variable length string (e.g., names, emails)', needsParams: true, defaultParams: '255' },
    { value: 'TEXT', label: 'Text', description: 'Long text content (e.g., descriptions, comments)', needsParams: false },
    { value: 'DECIMAL', label: 'Decimal', description: 'Decimal numbers (e.g., prices, percentages)', needsParams: true, defaultParams: '10,2' },
    { value: 'BOOLEAN', label: 'Boolean', description: 'True/False values (e.g., is_active, is_published)', needsParams: false },
    { value: 'DATE', label: 'Date', description: 'Date values (e.g., birth_date, created_date)', needsParams: false },
    { value: 'TIMESTAMP', label: 'Timestamp', description: 'Date and time (e.g., created_at, updated_at)', needsParams: false },
    { value: 'JSON', label: 'JSON', description: 'JSON data (e.g., settings, metadata)', needsParams: false }
  ];

  useEffect(() => {
    if (isOpen) {
      setColumnName('');
      setColumnType('VARCHAR');
      setTypeParams('255');
      setNullable(true);
      setUnique(false);
      setDefaultValue('');
      setError(null);
    }
  }, [isOpen]);

  const handleTypeChange = (newType) => {
    setColumnType(newType);
    const selectedType = fieldTypes.find(t => t.value === newType);
    if (selectedType) {
      setTypeParams(selectedType.defaultParams || '');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!columnName.trim()) {
      setError('Column name is required');
      return;
    }
    
    if (!database || !table) {
      setError('Database and table information is missing');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Build the complete type with parameters
      let fullType = columnType;
      if (typeParams.trim()) {
        fullType += `(${typeParams.trim()})`;
      }
      
      // Determine key type based on unique constraint
      let keyType = '';
      if (unique) {
        keyType = 'UNI';
      }
      
      const columnData = {
        name: columnName.trim(),
        type: fullType,
        nullable,
        key: keyType,
        default: defaultValue.trim() || null,
        extra: ''
      };
      
      const result = await onSubmit(database, table, columnData);
      
      if (result.success) {
        onClose();
      } else {
        setError(result.error || 'Failed to add column');
      }
    } catch (error) {
      console.error('Add column error:', error);
      setError('Failed to add column');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = fieldTypes.find(t => t.value === columnType);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content add-column-modal">
        <div className="modal-header">
          <h2>Add Column to {table}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="columnName">Column Name</label>
            <input
              id="columnName"
              type="text"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder="e.g., user_id, email, created_at"
              className="form-input"
              title="Column name - use snake_case (e.g., user_id, email, created_at)"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="columnType">Data Type</label>
            <select
              id="columnType"
              value={columnType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="form-input"
              title="Data type for this column"
            >
              {fieldTypes.map(type => (
                <option key={type.value} value={type.value} title={type.description}>
                  {type.label}
                </option>
              ))}
            </select>
            {selectedType && (
              <small className="form-help">
                {selectedType.description}
              </small>
            )}
          </div>
          
          {selectedType?.needsParams && (
            <div className="form-group">
              <label htmlFor="typeParams">Type Parameters</label>
              <input
                id="typeParams"
                type="text"
                value={typeParams}
                onChange={(e) => setTypeParams(e.target.value)}
                placeholder={selectedType.defaultParams}
                className="form-input"
                title={`Parameters for ${selectedType.label} (e.g., ${selectedType.defaultParams})`}
              />
              <small className="form-help">
                {selectedType.label === 'VARCHAR' && 'Maximum length (e.g., 255)'}
                {selectedType.label === 'DECIMAL' && 'Precision and scale (e.g., 10,2)'}
              </small>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="defaultValue">Default Value (Optional)</label>
            <input
              id="defaultValue"
              type="text"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder="e.g., 'active', 0, CURRENT_TIMESTAMP"
              className="form-input"
              title="Default value for this column (optional)"
            />
            <small className="form-help">
              Leave empty for no default value. Use quotes for strings (e.g., 'active')
            </small>
          </div>
          
          <div className="form-group">
            <label>Column Options</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={nullable}
                  onChange={(e) => setNullable(e.target.checked)}
                />
                <span className="checkbox-text">Allow NULL values</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={unique}
                  onChange={(e) => setUnique(e.target.checked)}
                />
                <span className="checkbox-text">Unique constraint</span>
              </label>
            </div>
          </div>
          
          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Column'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddColumnModal;
