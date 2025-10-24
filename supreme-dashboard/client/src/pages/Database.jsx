import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import InputModal from '../components/InputModal';
import ConfirmModal from '../components/ConfirmModal';
import TableCreationModal from '../components/TableCreationModal';
import EditableTableStructure from '../components/EditableTableStructure';
import './Database.css';

const Database = () => {
  const { token } = useAuth();
  const [databases, setDatabases] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedDb, setSelectedDb] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('browser');
  const [tableStructure, setTableStructure] = useState(null);
  const [showCreateDbModal, setShowCreateDbModal] = useState(false);
  const [showDeleteDbModal, setShowDeleteDbModal] = useState(false);
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);
  const [dbToDelete, setDbToDelete] = useState(null);
  const [tableTemplates, setTableTemplates] = useState({});

  useEffect(() => {
    if (token) {
      fetchDatabases();
      fetchTableTemplates();
    }
  }, [token]);

  useEffect(() => {
    if (selectedDb && selectedTable && activeTab === 'structure') {
      getTableStructure(selectedTable);
    }
  }, [selectedDb, selectedTable, activeTab]);

  const fetchDatabases = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/database/databases', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setDatabases(data.databases || []);
    } catch (error) {
      setError('Failed to fetch databases');
      console.error('Error fetching databases:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async (databaseName) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/database/tables/${databaseName}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setTables(data.tables || []);
    } catch (error) {
      setError('Failed to fetch tables');
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/database/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          database: selectedDb,
          query: query.trim()
        })
      });

      const data = await response.json();
      if (response.ok) {
        setQueryResult(data);
      } else {
        setError(data.error || 'Query execution failed');
      }
    } catch (error) {
      setError('Failed to execute query');
      console.error('Error executing query:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDatabaseSelect = (dbName) => {
    setSelectedDb(dbName);
    setSelectedTable('');
    setTables([]);
    if (dbName) {
      fetchTables(dbName);
    }
  };

  const handleTableSelect = (tableName) => {
    setSelectedTable(tableName);
    setQuery(`SELECT * FROM ${tableName} LIMIT 100;`);
  };

  const getTableStructure = async (tableName) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/database/table-structure/${selectedDb}/${tableName}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setTableStructure(data);
        return data;
      } else {
        setError(data.error || 'Failed to fetch table structure');
        return null;
      }
    } catch (error) {
      setError('Failed to fetch table structure');
      console.error('Error fetching table structure:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createDatabase = async (dbName) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/database/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: dbName })
      });

      if (response.ok) {
        await fetchDatabases();
        setSelectedDb(dbName);
        fetchTables(dbName);
        return { success: true };
      } else {
        const data = await response.json();
        const errorMessage = data.error || 'Failed to create database';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = 'Network error: Failed to create database';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDatabase = (dbName) => {
    setDbToDelete(dbName);
    setShowDeleteDbModal(true);
  };

  const deleteDatabase = async (dbName) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/database/delete/${dbName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchDatabases();
        if (selectedDb === dbName) {
          setSelectedDb('');
          setTables([]);
        }
        return { success: true };
      } else {
        const data = await response.json();
        const errorMessage = data.error || 'Failed to delete database';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = 'Network error: Failed to delete database';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Handler functions for editable table structure
  const handleUpdateColumn = async (database, table, columnData) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Updating column:', { database, table, columnData });
      
      const response = await fetch(`/api/database/table/update-column`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          database,
          table,
          column: columnData
        })
      });
      
      console.log('Update column response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Update column success:', data);
        // Refresh table structure
        await getTableStructure(selectedTable);
        return { success: true };
      } else {
        const data = await response.json();
        console.error('Update column failed:', data);
        setError(data.error || 'Failed to update column');
        return { success: false, error: data.error };
      }
    } catch (error) {
      setError('Network error: Failed to update column');
      return { success: false, error: 'Network error' };
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteColumn = async (database, table, columnName) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/database/table/delete-column`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          database,
          table,
          column: columnName
        })
      });

      if (response.ok) {
        // Refresh table structure
        await getTableStructure(selectedTable);
        return { success: true };
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete column');
        return { success: false, error: data.error };
      }
    } catch (error) {
      setError('Network error: Failed to delete column');
      return { success: false, error: 'Network error' };
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = async (database, table) => {
    // For now, we'll use the existing table creation modal
    // In the future, we could create a dedicated "Add Column" modal
    setShowCreateTableModal(true);
  };

  const fetchTableTemplates = async () => {
    try {
      const response = await fetch('/api/database/table/templates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setTableTemplates(data.templates || {});
      }
    } catch (error) {
      console.error('Error fetching table templates:', error);
    }
  };

  const createTable = async (tableData) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Creating table with data:', tableData);
      
      const response = await fetch('/api/database/table/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tableData)
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        await fetchTables(selectedDb);
        return { success: true };
      } else {
        const errorMessage = data.error || 'Failed to create table';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Table creation network error:', error);
      const errorMessage = 'Network error: Failed to create table';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'browser', label: 'Database Browser', icon: '🗂️' },
    { id: 'query', label: 'SQL Query', icon: '💻' },
    { id: 'structure', label: 'Table Structure', icon: '📊' }
  ];

  return (
    <div className="database">
      <div className="page-header">
        <h1 className="page-title">Database Management</h1>
        <p className="page-subtitle">Manage databases, tables, and execute SQL queries</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      <div className="database-container">
        {/* Database Tabs */}
        <div className="database-tabs">
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

        {/* Database Browser Tab */}
        {activeTab === 'browser' && (
          <div className="database-browser">
            <div className="browser-grid">
              {/* Databases List */}
              <div className="browser-section">
                <div className="dashboard-card">
                  <div className="section-header">
                    <h3>Databases</h3>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowCreateDbModal(true)}
                    >
                      + New
                    </button>
                  </div>
                  
                  <div className="database-list">
                    {loading ? (
                      <LoadingSpinner size="small" text="Loading databases..." />
                    ) : databases.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">🗄️</div>
                        <p>No databases found</p>
                      </div>
                    ) : (
                      databases.map(db => (
                        <div 
                          key={db.name} 
                          className={`database-item ${selectedDb === db.name ? 'selected' : ''}`}
                          onClick={() => handleDatabaseSelect(db.name)}
                        >
                          <div className="database-info">
                            <span className="database-name">{db.name}</span>
                            <span className="database-size">{db.size || 'Unknown'}</span>
                          </div>
                          <div className="database-actions">
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDatabase(db.name);
                              }}
                              title="Delete database"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Tables List */}
              <div className="browser-section">
                <div className="dashboard-card">
                  <div className="section-header">
                    <h3>Tables</h3>
                    <div className="section-actions">
                      {selectedDb && (
                        <span className="database-name">{selectedDb}</span>
                      )}
                      {selectedDb ? (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => setShowCreateTableModal(true)}
                          title={`Create new table in ${selectedDb}`}
                        >
                          + New Table
                        </button>
                      ) : (
                        <span className="text-muted" style={{fontSize: '0.8rem', color: '#6b7280'}}>
                          Select a database to create tables
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="table-list">
                    {!selectedDb ? (
                      <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <p>Select a database to view tables</p>
                      </div>
                    ) : loading ? (
                      <LoadingSpinner size="small" text="Loading tables..." />
                    ) : tables.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <p>No tables found</p>
                      </div>
                    ) : (
                      tables.map(table => (
                        <div 
                          key={table.name} 
                          className={`table-item ${selectedTable === table.name ? 'selected' : ''}`}
                          onClick={() => handleTableSelect(table.name)}
                        >
                          <div className="table-info">
                            <span className="table-name">{table.name}</span>
                            <span className="table-rows">{table.rows || 'Unknown'} rows</span>
                          </div>
                          <div className="table-type">{table.type || 'table'}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SQL Query Tab */}
        {activeTab === 'query' && (
          <div className="query-section">
            <div className="dashboard-card">
              <div className="query-header">
                <h3>SQL Query Editor</h3>
                <div className="query-controls">
                  <select 
                    value={selectedDb} 
                    onChange={(e) => setSelectedDb(e.target.value)}
                    className="form-input"
                    style={{ width: '200px' }}
                  >
                    <option value="">Select Database</option>
                    {databases.map(db => (
                      <option key={db.name} value={db.name}>{db.name}</option>
                    ))}
                  </select>
                  <button 
                    className="btn btn-primary"
                    onClick={executeQuery}
                    disabled={!query.trim() || !selectedDb || loading}
                  >
                    {loading ? <LoadingSpinner size="small" text="" /> : '▶️ Execute'}
                  </button>
                </div>
              </div>

              <div className="query-editor">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your SQL query here..."
                  className="query-textarea"
                  rows={10}
                />
              </div>

              {queryResult && (
                <div className="query-result">
                  <h4>Query Result</h4>
                  <div className="result-info">
                    <span>Rows: {queryResult.rows?.length || 0}</span>
                    <span>Execution time: {queryResult.executionTime || 'Unknown'}ms</span>
                  </div>
                  {queryResult.rows && queryResult.rows.length > 0 && (
                    <div className="result-table">
                      <table>
                        <thead>
                          <tr>
                            {Object.keys(queryResult.rows[0]).map(column => (
                              <th key={column}>{column}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResult.rows.map((row, index) => (
                            <tr key={index}>
                              {Object.values(row).map((value, i) => (
                                <td key={i}>{String(value)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Table Structure Tab */}
        {activeTab === 'structure' && (
          <div className="structure-section">
            <div className="dashboard-card">
              <h3>Table Structure</h3>
              {!selectedDb || !selectedTable ? (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <p>Select a database and table to view structure</p>
                </div>
              ) : loading ? (
                <LoadingSpinner size="small" text="Loading table structure..." />
              ) : tableStructure ? (
                <div className="structure-content">
                  <EditableTableStructure
                    key={`${selectedDb}-${selectedTable}-${JSON.stringify(tableStructure)}`}
                    tableStructure={tableStructure}
                    selectedDb={selectedDb}
                    selectedTable={selectedTable}
                    onUpdateColumn={handleUpdateColumn}
                    onDeleteColumn={handleDeleteColumn}
                    onAddColumn={handleAddColumn}
                  />

                  {/* Indexes Table */}
                  {tableStructure.indexes && tableStructure.indexes.length > 0 && (
                    <div className="structure-section">
                      <h5>Indexes</h5>
                      <div className="structure-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Columns</th>
                              <th>Type</th>
                              <th>Unique</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tableStructure.indexes.map((index, idx) => (
                              <tr key={idx}>
                                <td><strong>{index.name}</strong></td>
                                <td>{index.columns.join(', ')}</td>
                                <td>{index.type}</td>
                                <td>{index.unique ? 'Yes' : 'No'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">⚠️</div>
                  <p>Failed to load table structure</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Database Modal */}
      <InputModal
        isOpen={showCreateDbModal}
        onClose={() => setShowCreateDbModal(false)}
        onSubmit={(name) => createDatabase(name)}
        title="Create New Database"
        placeholder="Enter database name"
        validationMessage="Database name is required"
      />

      {/* Delete Database Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteDbModal}
        onClose={() => {
          setShowDeleteDbModal(false);
          setDbToDelete(null);
        }}
        onConfirm={() => deleteDatabase(dbToDelete)}
        title="Delete Database"
        message={`Are you sure you want to delete database "${dbToDelete}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Table Creation Modal */}
      <TableCreationModal
        isOpen={showCreateTableModal}
        onClose={() => setShowCreateTableModal(false)}
        onSubmit={createTable}
        database={selectedDb}
        templates={tableTemplates}
      />
    </div>
  );
};

export default Database;
