import React, { useState, useEffect } from 'react';
import './InputModal.css';

const InputModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  title, 
  placeholder, 
  defaultValue = '', 
  type = 'text',
  required = true,
  validationMessage = 'This field is required'
}) => {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setError('');
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (required && !value.trim()) {
      setError(validationMessage);
      return;
    }
    
    onSubmit(value.trim());
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button 
            className="modal-close" 
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
            <input
              type={type}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`modal-input ${error ? 'error' : ''}`}
              autoFocus
              autoComplete="off"
            />
            {error && <div className="modal-error">{error}</div>}
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InputModal;
