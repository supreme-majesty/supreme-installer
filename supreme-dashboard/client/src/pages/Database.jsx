import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import InputModal from '../components/InputModal';
import ConfirmModal from '../components/ConfirmModal';
import TableCreationModal from '../components/TableCreationModal';
import AddColumnModal from '../components/AddColumnModal';
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
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [dbToDelete, setDbToDelete] = useState(null);
  const [tableTemplates, setTableTemplates] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    searchIn: 'all', // all, tables, data
    dataType: 'all', // all, text, number, date
    caseSensitive: false
  });
  const [inlineSearchQuery, setInlineSearchQuery] = useState('');
  const [filteredDatabases, setFilteredDatabases] = useState([]);
  const [filteredTables, setFilteredTables] = useState([]);
  const [treeView, setTreeView] = useState({});
  const [expandedNodes, setExpandedNodes] = useState({});
  const [tableData, setTableData] = useState(null);
  const [tableDataLoading, setTableDataLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Create tree structure from databases
  const createTreeStructure = (databases) => {
    const tree = {};
    const groups = {};
    const standalone = [];
    
    databases.forEach(db => {
      const name = db.name;
      const parts = name.split('_');
      
      if (parts.length > 1) {
        // Has prefix, add to group
        const prefix = parts[0];
        if (!groups[prefix]) {
          groups[prefix] = [];
        }
        groups[prefix].push(db);
      } else {
        // Standalone database
        standalone.push(db);
      }
    });
    
    // Add groups to tree (only if 2 or more databases with same prefix)
    Object.entries(groups).forEach(([prefix, dbs]) => {
      if (dbs.length >= 2) {
        // Create group for 2+ databases
        tree[prefix] = {
          type: 'group',
          name: prefix,
          children: dbs.map(db => ({
            type: 'database',
            name: db.name,
            data: db
          })),
          expanded: false
        };
      } else {
        // Add single database as standalone
        dbs.forEach(db => {
          tree[db.name] = {
            type: 'database',
            name: db.name,
            data: db
          };
        });
      }
    });
    
    // Add standalone databases to tree
    standalone.forEach(db => {
      tree[db.name] = {
        type: 'database',
        name: db.name,
        data: db
      };
    });
    
    return tree;
  };

  useEffect(() => {
    if (token) {
      fetchDatabases();
      fetchTableTemplates();
    }
  }, [token]);

  // Initialize filtered states and tree view
  useEffect(() => {
    setFilteredDatabases(databases);
    setFilteredTables(tables);
    
    if (databases.length > 0) {
      const tree = createTreeStructure(databases);
      setTreeView(tree);
      
      // Only initialize expanded state if it's empty (first load)
      setExpandedNodes(prev => {
        if (Object.keys(prev).length === 0) {
          const expanded = {};
          Object.keys(tree).forEach(key => {
            if (tree[key].type === 'group') {
              expanded[key] = false;
            }
          });
          return expanded;
        }
        return prev;
      });
    }
  }, [databases, tables]);

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
      
      // Find which group this database belongs to
      let selectedGroup = null;
      Object.entries(treeView).forEach(([key, node]) => {
        if (node.type === 'group') {
          const hasSelectedDb = node.children.some(child => child.name === dbName);
          if (hasSelectedDb) {
            selectedGroup = key;
          }
        }
      });
      
      // Update expanded state: collapse all groups except the one containing the selected database
      setExpandedNodes(prev => {
        const newExpanded = {};
        Object.keys(treeView).forEach(key => {
          if (treeView[key].type === 'group') {
            // Only expand the group containing the selected database
            newExpanded[key] = key === selectedGroup;
          }
        });
        return newExpanded;
      });
    }
  };

  // Handle group header click (expand/collapse)
  const handleGroupClick = (groupKey) => {
    // Toggle the clicked group and collapse all others
    setExpandedNodes(prev => {
      const newExpanded = {};
      const isCollapsingSameGroup = prev[groupKey] === true;
      
      Object.keys(treeView).forEach(key => {
        if (treeView[key].type === 'group') {
          if (key === groupKey) {
            // Toggle the clicked group
            newExpanded[key] = !prev[key];
          } else {
            // Collapse all other groups
            newExpanded[key] = false;
          }
        }
      });
      
      // Only clear selection when clicking on a different group AND no database is currently selected
      if (!isCollapsingSameGroup && !selectedDb) {
        // Clear selection when clicking on a different group and no database is selected
        setSelectedDb('');
        setSelectedTable('');
        setTables([]);
      }
      // When collapsing the same group or when a database is already selected, keep the current selection and tables
      
      return newExpanded;
    });
  };

  const handleTableSelect = (tableName) => {
    setSelectedTable(tableName);
    setQuery(`SELECT * FROM ${tableName} LIMIT 100;`);
    // Fetch table data for browsing
    fetchTableData(tableName, 1);
  };

  const fetchTableData = async (tableName, page = 1) => {
    if (!selectedDb || !tableName) return;
    
    try {
      setTableDataLoading(true);
      const response = await fetch(`/api/database/table-data/${selectedDb}/${tableName}?page=${page}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        setTableData(data.data);
        setPagination(data.pagination);
        setCurrentPage(page);
      } else {
        setError(data.error || 'Failed to fetch table data');
      }
    } catch (error) {
      setError('Failed to fetch table data');
      console.error('Error fetching table data:', error);
    } finally {
      setTableDataLoading(false);
    }
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
    setShowAddColumnModal(true);
  };

  const addColumn = async (database, table, columnData) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Adding column:', { database, table, columnData });
      
      const response = await fetch(`/api/database/table/add-column`, {
        method: 'POST',
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
      
      console.log('Add column response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Add column success:', data);
        // Refresh table structure
        await getTableStructure(selectedTable);
        return { success: true };
      } else {
        const data = await response.json();
        console.error('Add column failed:', data);
        setError(data.error || 'Failed to add column');
        return { success: false, error: data.error };
      }
    } catch (error) {
      setError('Network error: Failed to add column');
      return { success: false, error: 'Network error' };
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim() || !selectedDb) {
      setError('Please enter a search query and select a database');
      return;
    }

    try {
      setSearchLoading(true);
      setError(null);
      
      const response = await fetch('/api/database/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          database: selectedDb,
          query: searchQuery.trim(),
          filters: searchFilters
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        const data = await response.json();
        setError(data.error || 'Search failed');
      }
    } catch (error) {
      setError('Network error: Search failed');
      console.error('Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Toggle tree node expansion
  const toggleNode = (nodeKey) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }));
  };

  // Filter databases and tables based on search query
  useEffect(() => {
    if (!inlineSearchQuery.trim()) {
      setFilteredDatabases(databases || []);
      setFilteredTables(tables || []);
      
      // Update tree view when no search
      if (databases.length > 0) {
        const tree = createTreeStructure(databases);
        setTreeView(tree);
      }
      return;
    }

    const query = inlineSearchQuery.toLowerCase();
    
    // Filter databases
    const filteredDbs = (databases || []).filter(db => 
      db.name && db.name.toLowerCase().includes(query)
    );
    setFilteredDatabases(filteredDbs);
    
    // Filter tables
    const filteredTbls = (tables || []).filter(table => 
      table.name && table.name.toLowerCase().includes(query)
    );
    setFilteredTables(filteredTbls);
    
    // Update tree view with filtered results
    if (filteredDbs.length > 0) {
      const tree = createTreeStructure(filteredDbs);
      setTreeView(tree);
      
      // Preserve expanded state for existing groups
      setExpandedNodes(prev => {
        const newExpanded = {};
        Object.keys(tree).forEach(key => {
          if (tree[key].type === 'group') {
            newExpanded[key] = prev[key] || false;
          }
        });
        return newExpanded;
      });
    }
  }, [inlineSearchQuery, databases, tables]);

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
    { id: 'structure', label: 'Table Structure', icon: '📊' },
    { id: 'data', label: 'Table Data', icon: '📋' },
    { id: 'search', label: 'Search', icon: '🔍' }
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
                    <div className="section-actions">
                      <div className="inline-search">
                        <input
                          type="text"
                          value={inlineSearchQuery}
                          onChange={(e) => setInlineSearchQuery(e.target.value)}
                          placeholder="Search databases..."
                          className="form-input search-input-inline"
                        />
                      </div>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowCreateDbModal(true)}
                      >
                        + New
                      </button>
                    </div>
                  </div>
                  
                  <div className="database-tree">
                    {loading ? (
                      <LoadingSpinner size="small" text="Loading databases..." />
                    ) : Object.keys(treeView).length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">🗄️</div>
                        <p>{inlineSearchQuery.trim() ? `No databases found matching "${inlineSearchQuery}"` : 'No databases found'}</p>
                      </div>
                    ) : (
                      Object.entries(treeView).map(([key, node]) => (
                        <div key={key} className="tree-node">
                          {node.type === 'group' ? (
                            <div className="tree-group">
                              <div 
                                className="group-header"
                                onClick={() => handleGroupClick(key)}
                              >
                                <div className="group-controls">
                                  <span className="expand-icon">
                                    {expandedNodes[key] ? '−' : '+'}
                                  </span>
                                  <span className="group-icon">🏢</span>
                                </div>
                                <span className="group-name">{node.name} ({node.children.length})</span>
                              </div>
                              
                              {expandedNodes[key] && (
                                <div className="group-children">
                                  {node.children.map((child, index) => (
                                    <div 
                                      key={`${key}-${index}`}
                                      className={`tree-database ${selectedDb === child.name ? 'selected' : ''}`}
                                      onClick={() => handleDatabaseSelect(child.name)}
                                    >
                                      <div className="database-controls">
                                        <span className="database-icon">🗃️</span>
                                      </div>
                                      <div className="database-info">
                                        <span className="database-name">{child.name}</span>
                                        <span className="database-size">{child.data.size || 'Unknown'}</span>
                                      </div>
                                      <div className="database-actions">
                                        <button 
                                          className="btn btn-danger btn-sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteDatabase(child.name);
                                          }}
                                          title="Delete database"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div 
                              className={`tree-database ${selectedDb === node.name ? 'selected' : ''}`}
                              onClick={() => handleDatabaseSelect(node.name)}
                            >
                              <div className="database-controls">
                                <span className="database-icon">🗃️</span>
                              </div>
                              <div className="database-info">
                                <span className="database-name">{node.name}</span>
                                <span className="database-size">{node.data.size || 'Unknown'}</span>
                              </div>
                              <div className="database-actions">
                                <button 
                                  className="btn btn-danger btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDatabase(node.name);
                                  }}
                                  title="Delete database"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          )}
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
                    ) : filteredTables.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <p>{inlineSearchQuery.trim() ? `No tables found matching "${inlineSearchQuery}"` : 'No tables found'}</p>
                      </div>
                    ) : (
                      filteredTables.map(table => (
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

        {/* Table Data Tab */}
        {activeTab === 'data' && (
          <div className="table-data-section">
            <div className="dashboard-card">
              <h3>Table Data</h3>
              {!selectedDb || !selectedTable ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <p>Select a database and table to view data</p>
                </div>
              ) : tableDataLoading ? (
                <LoadingSpinner size="small" text="Loading table data..." />
              ) : tableData && tableData.length > 0 ? (
                <div className="table-data-content">
                  <div className="data-header">
                    <h4>{selectedTable} Data</h4>
                    <div className="data-info">
                      <span>Total Rows: {pagination?.totalRows || 0}</span>
                      <span>Page {pagination?.currentPage || 1} of {pagination?.totalPages || 1}</span>
                    </div>
                  </div>
                  
                  <div className="data-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {Object.keys(tableData[0]).map(column => (
                            <th key={column}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value, i) => (
                              <td key={i}>{String(value || '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {pagination && pagination.totalPages > 1 && (
                    <div className="pagination">
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => fetchTableData(selectedTable, currentPage - 1)}
                        disabled={!pagination.hasPrev}
                      >
                        ← Previous
                      </button>
                      
                      <span className="pagination-info">
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </span>
                      
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => fetchTableData(selectedTable, currentPage + 1)}
                        disabled={!pagination.hasNext}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <p>No data found in this table</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="search-section">
            <div className="dashboard-card">
              <div className="search-header">
                <h3>Database Search</h3>
                <div className="search-controls">
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
                </div>
              </div>

              <div className="search-form">
                <div className="search-input-group">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter search term..."
                    className="form-input search-input"
                    onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={performSearch}
                    disabled={!searchQuery.trim() || !selectedDb || searchLoading}
                  >
                    {searchLoading ? <LoadingSpinner size="small" text="" /> : '🔍 Search'}
                  </button>
                </div>

                <div className="search-filters">
                  <div className="filter-group">
                    <label>Search In:</label>
                    <select
                      value={searchFilters.searchIn}
                      onChange={(e) => setSearchFilters({...searchFilters, searchIn: e.target.value})}
                      className="form-input"
                    >
                      <option value="all">All Tables & Data</option>
                      <option value="tables">Table Names Only</option>
                      <option value="data">Data Content Only</option>
                    </select>
                  </div>
                  
                  <div className="filter-group">
                    <label>Data Type:</label>
                    <select
                      value={searchFilters.dataType}
                      onChange={(e) => setSearchFilters({...searchFilters, dataType: e.target.value})}
                      className="form-input"
                    >
                      <option value="all">All Types</option>
                      <option value="text">Text Fields</option>
                      <option value="number">Numbers</option>
                      <option value="date">Dates</option>
                    </select>
                  </div>
                  
                  <div className="filter-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={searchFilters.caseSensitive}
                        onChange={(e) => setSearchFilters({...searchFilters, caseSensitive: e.target.checked})}
                      />
                      Case Sensitive
                    </label>
                  </div>
                </div>
              </div>

              {searchResults && (
                <div className="search-results">
                  <div className="results-header">
                    <h4>Search Results</h4>
                    <div className="results-info">
                      <span>Found {searchResults.totalResults || 0} results</span>
                      <span>Execution time: {searchResults.executionTime || 0}ms</span>
                    </div>
                  </div>
                  
                  {searchResults.results && searchResults.results.length > 0 ? (
                    <div className="results-list">
                      {searchResults.results.map((result, index) => (
                        <div key={index} className="result-item">
                          <div className="result-header">
                            <span className="result-table">{result.table}</span>
                            <span className="result-column">{result.column}</span>
                            <span className="result-type">{result.type}</span>
                          </div>
                          <div className="result-content">
                            <div className="result-row">
                              <strong>Row {result.row}:</strong> {result.value}
                            </div>
                            {result.context && (
                              <div className="result-context">
                                <small>Context: {result.context}</small>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-results">
                      <div className="empty-icon">🔍</div>
                      <p>No results found for "{searchQuery}"</p>
                    </div>
                  )}
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

      {/* Add Column Modal */}
      <AddColumnModal
        isOpen={showAddColumnModal}
        onClose={() => setShowAddColumnModal(false)}
        onSubmit={addColumn}
        database={selectedDb}
        table={selectedTable}
      />
    </div>
  );
};

export default Database;
