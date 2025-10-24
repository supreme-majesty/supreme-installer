import React, { useState, useEffect } from 'react';
import './EditableTableStructure.css';

const EditableTableStructure = ({ 
  tableStructure, 
  selectedDb, 
  selectedTable, 
  onUpdateColumn,
  onDeleteColumn,
  onAddColumn 
}) => {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    if (tableStructure?.columns) {
      console.log('EditableTableStructure: Updating columns from tableStructure:', tableStructure.columns);
      setColumns(tableStructure.columns);
    }
  }, [tableStructure]);

  const handleCellDoubleClick = (rowIndex, field, currentValue) => {
    setEditingCell({ rowIndex, field });
    setEditValue(currentValue || '');
  };

  const handleCellKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleSave = async () => {
    if (editingCell) {
      const { rowIndex, field } = editingCell;
      console.log('EditableTableStructure: Saving field', field, 'with value', editValue, 'for row', rowIndex);
      const updatedColumns = [...columns];
      const originalColumn = columns[rowIndex];
      
      // Convert string values to appropriate types for specific fields
      let processedValue = editValue;
      if (field === 'nullable') {
        processedValue = editValue === 'true';
        console.log('EditableTableStructure: Converting nullable from string', editValue, 'to boolean', processedValue);
      }
      
      updatedColumns[rowIndex] = {
        ...updatedColumns[rowIndex],
        [field]: processedValue
      };
      
      // Include original column name for name changes
      const columnData = {
        ...updatedColumns[rowIndex],
        originalName: originalColumn.name
      };
      
      console.log('EditableTableStructure: Updated columns:', updatedColumns);
      console.log('EditableTableStructure: Column data with original name:', columnData);
      setColumns(updatedColumns);
      
      // Call the update function
      if (onUpdateColumn) {
        try {
          const result = await onUpdateColumn(selectedDb, selectedTable, columnData);
          if (!result.success) {
            console.error('Failed to update column:', result.error);
            // Revert the local change if the update failed
            setColumns(columns);
          }
        } catch (error) {
          console.error('Error updating column:', error);
          // Revert the local change if the update failed
          setColumns(columns);
        }
      }
      
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleDeleteColumn = (columnName) => {
    if (window.confirm(`Are you sure you want to delete column "${columnName}"?`)) {
      if (onDeleteColumn) {
        onDeleteColumn(selectedDb, selectedTable, columnName);
      }
    }
  };

  const renderCell = (rowIndex, field, value, isEditable = true, column = null) => {
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.field === field;
    
    if (isEditing) {
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyPress={handleCellKeyPress}
          onBlur={handleSave}
          className="edit-input"
          autoFocus
        />
      );
    }
    
    // Special handling for name column to include key icons
    if (field === 'name' && column) {
      const getKeyIcon = (keyType) => {
        if (keyType === 'PRI') {
          return <span className="key-icon primary-key" title="Primary Key">🔑</span>;
        } else if (keyType === 'MUL') {
          return <span className="key-icon foreign-key" title="Foreign Key">🗝️</span>;
        } else if (keyType === 'UNI') {
          return <span className="key-icon unique-key" title="Unique Key">🔐</span>;
        }
        return null;
      };
      
      return (
        <span 
          className={isEditable ? 'editable-cell name-cell' : 'name-cell'}
          onDoubleClick={isEditable ? () => handleCellDoubleClick(rowIndex, field, value) : undefined}
        >
          <span className="column-name">{value || '-'}</span>
          {getKeyIcon(column.key)}
        </span>
      );
    }
    
    return (
      <span 
        className={isEditable ? 'editable-cell' : ''}
        onDoubleClick={isEditable ? () => handleCellDoubleClick(rowIndex, field, value) : undefined}
      >
        {value || '-'}
      </span>
    );
  };

  const renderTypeCell = (rowIndex, column) => {
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.field === 'type';
    
    if (isEditing) {
      return (
        <select
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyPress={handleCellKeyPress}
          onBlur={handleSave}
          className="edit-select"
          autoFocus
        >
          <option value="INT">INT</option>
          <option value="VARCHAR(255)">VARCHAR(255)</option>
          <option value="TEXT">TEXT</option>
          <option value="DECIMAL(10,2)">DECIMAL(10,2)</option>
          <option value="BOOLEAN">BOOLEAN</option>
          <option value="DATE">DATE</option>
          <option value="TIMESTAMP">TIMESTAMP</option>
          <option value="JSON">JSON</option>
        </select>
      );
    }
    
    return (
      <span 
        className="editable-cell"
        onDoubleClick={() => handleCellDoubleClick(rowIndex, 'type', column.type)}
      >
        {column.type}
      </span>
    );
  };

  const renderNullableCell = (rowIndex, column) => {
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.field === 'nullable';
    
    if (isEditing) {
      return (
        <select
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyPress={handleCellKeyPress}
          onBlur={handleSave}
          className="edit-select"
          autoFocus
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }
    
    return (
      <span 
        className="editable-cell"
        onDoubleClick={() => handleCellDoubleClick(rowIndex, 'nullable', column.nullable ? 'true' : 'false')}
      >
        {column.nullable ? 'Yes' : 'No'}
      </span>
    );
  };


  if (!tableStructure?.columns) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <p>No table structure available</p>
      </div>
    );
  }

  return (
    <div className="editable-structure">
      <div className="structure-header">
        <h4>{selectedTable}</h4>
        <div className="structure-actions">
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => onAddColumn && onAddColumn(selectedDb, selectedTable)}
          >
            + Add Column
          </button>
        </div>
      </div>
      
      <div className="structure-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Nullable</th>
              <th>Key</th>
              <th>Default</th>
              <th>Extra</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((column, index) => (
              <tr key={index}>
                <td>
                  {renderCell(index, 'name', column.name, true, column)}
                </td>
                <td>
                  {renderTypeCell(index, column)}
                </td>
                <td>
                  {renderNullableCell(index, column)}
                </td>
                <td>
                  {renderCell(index, 'key', column.key)}
                </td>
                <td>
                  {renderCell(index, 'default', column.default)}
                </td>
                <td>
                  {renderCell(index, 'extra', column.extra)}
                </td>
                <td>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteColumn(column.name)}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EditableTableStructure;

