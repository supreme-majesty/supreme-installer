import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
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

  useEffect(() => {
    if (token) {
      fetchDatabases();
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
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create database');
      }
    } catch (error) {
      setError('Failed to create database');
    } finally {
      setLoading(false);
    }
  };

  const deleteDatabase = async (dbName) => {
    if (!window.confirm(`Are you sure you want to delete database "${dbName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
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
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete database');
      }
    } catch (error) {
      setError('Failed to delete database');
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
                      onClick={() => {
                        const name = prompt('Enter database name:');
                        if (name) createDatabase(name);
                      }}
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
                                deleteDatabase(db.name);
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
                    {selectedDb && (
                      <span className="database-name">{selectedDb}</span>
                    )}
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
                  <div className="structure-header">
                    <h4>{selectedTable}</h4>
                    <span className="table-info">
                      {tableStructure.columns?.length || 0} columns, {tableStructure.indexes?.length || 0} indexes
                    </span>
                  </div>
                  
                  {/* Columns Table */}
                  <div className="structure-section">
                    <h5>Columns</h5>
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
                          </tr>
                        </thead>
                        <tbody>
                          {tableStructure.columns?.map((column, index) => (
                            <tr key={index}>
                              <td><strong>{column.name}</strong></td>
                              <td>{column.type}</td>
                              <td>{column.nullable ? 'Yes' : 'No'}</td>
                              <td>{column.key || '-'}</td>
                              <td>{column.default || '-'}</td>
                              <td>{column.extra || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

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
    </div>
  );
};

export default Database;
