import React from 'react';
import './ConfirmModal.css';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning' // warning, danger, info
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'warning':
      default:
        return '⚠️';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="modal-icon">{getIcon()}</span>
            <h3>{title}</h3>
          </div>
          <button 
            className="modal-close" 
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <p className="confirm-message">{message}</p>
        </div>
        
        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
            onKeyDown={handleKeyDown}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
