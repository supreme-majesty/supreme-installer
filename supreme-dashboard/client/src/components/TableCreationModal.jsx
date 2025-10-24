import React, { useState, useEffect } from 'react';
import './TableCreationModal.css';

const TableCreationModal = ({ isOpen, onClose, onSubmit, database, templates }) => {
  const [tableName, setTableName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customSchema, setCustomSchema] = useState('');
  const [fields, setFields] = useState([]);
  const [useTemplate, setUseTemplate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setTableName('');
      setSelectedTemplate('');
      setCustomSchema('');
      setFields([]);
      setUseTemplate(true);
      setError(null);
    }
  }, [isOpen]);

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

  const addField = () => {
    setFields([...fields, {
      id: Date.now(),
      name: '',
      type: 'VARCHAR',
      typeParams: '255',
      nullable: true,
      unique: false,
      primaryKey: false,
      autoIncrement: false,
      defaultValue: ''
    }]);
  };

  const updateField = (id, updates) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const removeField = (id) => {
    setFields(fields.filter(field => field.id !== id));
  };

  const generateSchema = () => {
    if (useTemplate && selectedTemplate && templates[selectedTemplate]) {
      return templates[selectedTemplate].schema;
    }
    
    if (!useTemplate && fields.length > 0) {
      const schema = fields.map(field => {
        console.log('Processing field:', field);
        let definition = `${field.name} ${field.type}`;
        
        // Add type parameters if they exist
        if (field.typeParams && field.typeParams.trim()) {
          definition += `(${field.typeParams})`;
        }
        
        if (field.autoIncrement && field.type === 'INT') {
          definition = definition.replace('INT', 'INT AUTO_INCREMENT');
        }
        
        if (field.primaryKey) {
          definition += ' PRIMARY KEY';
        }
        
        if (field.unique && !field.primaryKey) {
          definition += ' UNIQUE';
        }
        
        if (!field.nullable) {
          definition += ' NOT NULL';
        }
        
        if (field.defaultValue) {
          definition += ` DEFAULT '${field.defaultValue}'`;
        }
        
        console.log('Generated definition:', definition);
        return definition;
      }).join(', ');
      
      console.log('Final schema:', schema);
      return schema;
    }
    
    return customSchema;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!tableName.trim()) {
      setError('Table name is required');
      return;
    }
    
    if (!database) {
      setError('Please select a database first');
      return;
    }
    
    if (!useTemplate && fields.length === 0 && !customSchema.trim()) {
      setError('Please add fields or provide a custom schema');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const schema = generateSchema();
      console.log('Creating table with data:', { database, name: tableName, schema });
      console.log('Fields data:', fields);
      const result = await onSubmit({
        database,
        name: tableName,
        schema
      });
      
      if (result.success) {
        onClose();
      } else {
        setError(result.error || 'Failed to create table');
      }
    } catch (error) {
      console.error('Table creation error:', error);
      setError('Failed to create table');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (templateId) => {
    setSelectedTemplate(templateId);
    if (templates[templateId]) {
      setCustomSchema(templates[templateId].schema);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content table-creation-modal">
        <div className="modal-header">
          <h2>Create New Table</h2>
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
            <label htmlFor="tableName">Table Name</label>
            <input
              id="tableName"
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="e.g., users, products, orders"
              className="form-input"
              title="Table name - use snake_case or camelCase (e.g., users, product_categories)"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Creation Method</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="creationMethod"
                  checked={useTemplate}
                  onChange={() => setUseTemplate(true)}
                />
                Use Template
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="creationMethod"
                  checked={!useTemplate}
                  onChange={() => setUseTemplate(false)}
                />
                Custom Schema
              </label>
            </div>
          </div>
          
          {useTemplate ? (
            <div className="form-group">
              <label htmlFor="template">Select Template</label>
              <select
                id="template"
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="form-input"
              >
                <option value="">Choose a template...</option>
                {Object.entries(templates).map(([key, template]) => (
                  <option key={key} value={key}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
              
              {selectedTemplate && templates[selectedTemplate] && (
                <div className="template-preview">
                  <h4>Template Preview</h4>
                  <div className="schema-preview">
                    <code>{templates[selectedTemplate].schema}</code>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="form-group">
              <label>Table Fields</label>
              <div className="fields-container">
                {fields.map(field => (
                  <div key={field.id} className="field-row">
                    <div className="field-inputs">
                      <input
                        type="text"
                        placeholder="e.g. user_id, email, created_at"
                        value={field.name}
                        onChange={(e) => updateField(field.id, { name: e.target.value })}
                        className="form-input field-name"
                        title="Field name - use snake_case (e.g., user_id, email, created_at)"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => {
                          const selectedType = fieldTypes.find(t => t.value === e.target.value);
                          updateField(field.id, { 
                            type: e.target.value,
                            typeParams: selectedType?.defaultParams || ''
                          });
                        }}
                        className="form-input field-type"
                        title="Data type for this field"
                      >
                        {fieldTypes.map(type => (
                          <option key={type.value} value={type.value} title={type.description}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="e.g. 255, 10,2, 100"
                        value={field.typeParams}
                        onChange={(e) => updateField(field.id, { typeParams: e.target.value })}
                        className="form-input field-params"
                        title="Type parameters (e.g., 255 for VARCHAR, 10,2 for DECIMAL)"
                      />
                      <input
                        type="text"
                        placeholder="e.g. 'active', 0, CURRENT_TIMESTAMP"
                        value={field.defaultValue}
                        onChange={(e) => updateField(field.id, { defaultValue: e.target.value })}
                        className="form-input field-default"
                        title="Default value (optional)"
                      />
                    </div>
                    <div className="field-options">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={field.primaryKey}
                          onChange={(e) => updateField(field.id, { primaryKey: e.target.checked })}
                        />
                        PK
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={field.unique}
                          onChange={(e) => updateField(field.id, { unique: e.target.checked })}
                        />
                        Unique
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={field.nullable}
                          onChange={(e) => updateField(field.id, { nullable: e.target.checked })}
                        />
                        Nullable
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={field.autoIncrement}
                          onChange={(e) => updateField(field.id, { autoIncrement: e.target.checked })}
                        />
                        Auto Inc
                      </label>
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="btn btn-danger btn-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addField}
                  className="btn btn-secondary btn-sm"
                >
                  + Add Field
                </button>
              </div>
            </div>
          )}
          
          {!useTemplate && (
            <div className="form-group">
              <label htmlFor="customSchema">Custom Schema (Advanced)</label>
              <textarea
                id="customSchema"
                value={customSchema}
                onChange={(e) => setCustomSchema(e.target.value)}
                placeholder="e.g. id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(100) UNIQUE"
                className="form-textarea"
                rows={4}
                title="Enter complete SQL table schema. This overrides the field builder above."
              />
              <small className="form-help">
                Enter the complete table schema in SQL format. This will override the field builder above.
                <br />
                <strong>Example:</strong> id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(100) UNIQUE
              </small>
            </div>
          )}
          
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
              {loading ? 'Creating...' : 'Create Table'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TableCreationModal;
