import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import InputModal from '../components/InputModal';
import ConfirmModal from '../components/ConfirmModal';
import './FileManager.css';

const FileManager = () => {
  const { token } = useAuth();
  const [currentPath, setCurrentPath] = useState('/opt/lampp/htdocs/codes');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('browser');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // list or grid
  const [showCreateFileModal, setShowCreateFileModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showDeleteFileModal, setShowDeleteFileModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [platformConfig, setPlatformConfig] = useState(null);
  
  // Search functionality state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPath, setSearchPath] = useState('/home/supreme-majesty');
  const [searchOptions, setSearchOptions] = useState({
    fileTypes: [],
    searchContent: false,
    caseSensitive: false,
    maxResults: 100
  });
  const [searchCache, setSearchCache] = useState(new Map());
  const [lastSearchTime, setLastSearchTime] = useState(0);
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    fetchPlatformConfig();
  }, []);

  useEffect(() => {
    if (platformConfig?.webroot) {
      setCurrentPath(platformConfig.webroot);
    }
  }, [platformConfig]);

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath]);

  // Trigger search when search options change
  useEffect(() => {
    if (searchQuery.trim()) {
      debouncedSearch(searchQuery);
    }
  }, [searchPath, searchOptions]);

  const fetchPlatformConfig = async () => {
    try {
      const response = await fetch('/api/platform', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const config = await response.json();
        setPlatformConfig(config);
        console.log('Platform config loaded:', config);
      } else {
        console.error('Failed to fetch platform config');
      }
    } catch (error) {
      console.error('Error fetching platform config:', error);
    }
  };

  const fetchFiles = async (path) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to fetch files';
        
        // If the default path doesn't exist, try fallback paths
        if (response.status === 404 && path === platformConfig?.webroot) {
          console.log('Webroot path not found, trying fallback paths...');
          const fallbackPaths = [
            platformConfig?.baseWebroot || '/opt/lampp/htdocs',
            '/home/supreme-majesty',
            '/var/www/html',
            '/var/www'
          ];
          
          for (const fallbackPath of fallbackPaths) {
            try {
              const fallbackResponse = await fetch(`/api/files?path=${encodeURIComponent(fallbackPath)}`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                setFiles(fallbackData.files || []);
                setCurrentPath(fallbackPath);
                console.log(`Successfully loaded files from fallback path: ${fallbackPath}`);
                return;
              }
            } catch (fallbackError) {
              console.log(`Fallback path ${fallbackPath} also failed:`, fallbackError);
            }
          }
        }
        
        setError(errorMessage);
      }
    } catch (error) {
      setError('Network error: Failed to fetch files');
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFileContent = async (filePath) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFileContent(data.content || '');
        setSelectedFile(filePath);
        setActiveTab('editor');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch file content');
      }
    } catch (error) {
      setError('Failed to fetch file content');
    } finally {
      setLoading(false);
    }
  };

  const saveFile = async (filePath, content) => {
    try {
      setLoading(true);
      const response = await fetch('/api/files/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          path: filePath,
          content: content
        })
      });
      
      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Failed to save file' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to save file' };
    } finally {
      setLoading(false);
    }
  };

  const createFile = async (fileName, isDirectory = false) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/files/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          path: currentPath,
          name: fileName,
          isDirectory
        })
      });
      
      if (response.ok) {
        await fetchFiles(currentPath);
        return { success: true };
      } else {
        const errorData = await response.json();
        let errorMessage = errorData.error || 'Failed to create file';
        
        // Provide more specific error messages
        if (response.status === 403) {
          errorMessage = 'Permission denied: You don\'t have write access to this directory. Try using your home directory instead.';
        } else if (response.status === 400 && errorMessage.includes('Invalid name')) {
          errorMessage = 'Invalid file/folder name. Only use letters, numbers, dots, underscores, and hyphens.';
        } else if (response.status === 409) {
          errorMessage = 'A file or folder with this name already exists.';
        } else if (response.status === 400 && errorMessage.includes('Parent directory')) {
          errorMessage = 'The parent directory does not exist. Please navigate to a valid directory first.';
        }
        
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = 'Network error: Failed to create file';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = (filePath) => {
    setFileToDelete(filePath);
    setShowDeleteFileModal(true);
  };

  const deleteFile = async (filePath) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/files/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ path: filePath })
      });
      
      if (response.ok) {
        await fetchFiles(currentPath);
        if (selectedFile === filePath) {
          setSelectedFile(null);
          setFileContent('');
        }
        return { success: true };
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to delete file';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = 'Network error: Failed to delete file';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const navigateToPath = (path) => {
    setCurrentPath(path);
    setSelectedFile(null);
    setFileContent('');
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    // Create cache key
    const cacheKey = `${searchQuery}-${searchPath}-${JSON.stringify(searchOptions)}`;
    
    // Check cache first (cache valid for 5 minutes)
    const now = Date.now();
    if (searchCache.has(cacheKey) && (now - lastSearchTime) < 300000) {
      const cachedResult = searchCache.get(cacheKey);
      setSearchResults(cachedResult.results);
      setLastSearchTime(cachedResult.timestamp);
      return;
    }

    try {
      setSearchLoading(true);
      setError(null);
      
      const response = await fetch('/api/files/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: searchQuery,
          path: searchPath,
          ...searchOptions
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        
        // Cache the results
        const cacheData = {
          results: data.results || [],
          timestamp: now
        };
        setSearchCache(prev => new Map(prev).set(cacheKey, cacheData));
        setLastSearchTime(now);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Search failed');
      }
    } catch (error) {
      setError('Network error: Search failed');
      console.error('Error performing search:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchResultClick = (result) => {
    if (result.matchType === 'filename') {
      // Navigate to the file's directory and select the file
      const dirPath = result.path.split('/').slice(0, -1).join('/');
      setCurrentPath(dirPath);
      setActiveTab('browser');
      // The file will be highlighted in the browser
    } else {
      // Open the file in the editor
      fetchFileContent(result.path);
    }
  };

  const debouncedSearch = (query) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (query.trim()) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 500); // 500ms delay
    
    setSearchTimeout(timeout);
  };

  const clearSearchCache = () => {
    setSearchCache(new Map());
    setLastSearchTime(0);
  };

  const handleSearchQueryChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const getFileIcon = (file) => {
    if (file.isDirectory) {
      return '📁';
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    const iconMap = {
      'js': '📄',
      'jsx': '⚛️',
      'ts': '📘',
      'tsx': '⚛️',
      'css': '🎨',
      'html': '🌐',
      'php': '🐘',
      'py': '🐍',
      'json': '📋',
      'md': '📝',
      'txt': '📄',
      'png': '🖼️',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'gif': '🖼️',
      'svg': '🖼️',
      'pdf': '📕',
      'zip': '📦',
      'tar': '📦',
      'gz': '📦'
    };
    
    return iconMap[ext] || '📄';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { id: 'browser', label: 'File Browser', icon: '📁' },
    { id: 'editor', label: 'Code Editor', icon: '✏️' },
    { id: 'search', label: 'Search Files', icon: '🔍' }
  ];

  return (
    <div className="file-manager">
      <div className="page-header">
        <h1 className="page-title">File Manager</h1>
        <p className="page-subtitle">Browse and edit project files</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
          <button onClick={() => setError(null)} className="error-close">×</button>
          {(error.includes('Path not allowed') || error.includes('Permission denied')) && (
            <div style={{ marginTop: '10px', fontSize: '0.9em', opacity: 0.8 }}>
              <p>Try accessing one of these accessible paths:</p>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                <li>{platformConfig?.webroot || '/opt/lampp/htdocs/codes'} (Webroot - recommended for projects)</li>
                <li>{platformConfig?.baseWebroot || '/opt/lampp/htdocs'} (Base webroot)</li>
                <li>/home/supreme-majesty (Your home directory)</li>
                <li>/var/www/html</li>
                <li>/var/www</li>
              </ul>
              <p style={{ marginTop: '10px', fontStyle: 'italic' }}>
                💡 Tip: The webroot directory is where your web projects are stored and has full access.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="file-manager-container">
        {/* File Manager Tabs */}
        <div className="file-manager-tabs">
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

        {/* File Browser Tab */}
        {activeTab === 'browser' && (
          <div className="file-browser">
            <div className="browser-toolbar">
              <div className="dashboard-card">
                <div className="toolbar-content">
                  <div className="path-navigation">
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
                        navigateToPath(parentPath);
                      }}
                      disabled={currentPath === '/'}
                    >
                      ⬆️ Up
                    </button>
                    <div className="current-path">
                      <span className="path-text">{currentPath}</span>
                    </div>
                  </div>
                  
                  <div className="toolbar-actions">
                    <div className="view-controls">
                      <button 
                        className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                        title="List view"
                      >
                        ☰
                      </button>
                      <button 
                        className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => setViewMode('grid')}
                        title="Grid view"
                      >
                        ⊞
                      </button>
                    </div>
                    
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigateToPath(platformConfig?.webroot || '/opt/lampp/htdocs/codes')}
                      title="Go to webroot directory"
                    >
                      🌐 Webroot
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigateToPath('/home/supreme-majesty')}
                      title="Go to home directory"
                    >
                      🏠 Home
                    </button>
                    
                    <input
                      type="text"
                      placeholder="Search files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                    
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowCreateFileModal(true)}
                    >
                      + File
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowCreateFolderModal(true)}
                    >
                      + Folder
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="file-list-container">
              <div className="dashboard-card">
                {loading ? (
                  <LoadingSpinner text="Loading files..." />
                ) : filteredFiles.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📁</div>
                    <p>No files found</p>
                  </div>
                ) : (
                  <div className={`file-list ${viewMode}`}>
                    {filteredFiles.map(file => (
                      <div 
                        key={file.path} 
                        className={`file-item ${selectedFile === file.path ? 'selected' : ''}`}
                        onClick={() => {
                          if (file.isDirectory) {
                            navigateToPath(file.path);
                          } else {
                            fetchFileContent(file.path);
                          }
                        }}
                        onDoubleClick={() => {
                          if (file.isDirectory) {
                            navigateToPath(file.path);
                          } else {
                            fetchFileContent(file.path);
                          }
                        }}
                      >
                        <div className="file-icon">
                          {getFileIcon(file)}
                        </div>
                        <div className="file-info">
                          <div className="file-name">{file.name}</div>
                          <div className="file-details">
                            {file.isDirectory ? 'Folder' : formatFileSize(file.size)}
                            <span className="file-date">
                              {new Date(file.modified).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="file-actions">
                          {!file.isDirectory && (
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchFileContent(file.path);
                              }}
                              title="Edit file"
                            >
                              ✏️
                            </button>
                          )}
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(file.path);
                            }}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Code Editor Tab */}
        {activeTab === 'editor' && (
          <div className="code-editor">
            <div className="dashboard-card">
              <div className="editor-header">
                <h3>Code Editor</h3>
                {selectedFile && (
                  <div className="file-info">
                    <span className="file-path">{selectedFile}</span>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={async () => {
                        const result = await saveFile(selectedFile, fileContent);
                        if (result.success) {
                          alert('File saved successfully!');
                        } else {
                          alert(`Failed to save file: ${result.error}`);
                        }
                      }}
                    >
                      💾 Save
                    </button>
                  </div>
                )}
              </div>
              
              {selectedFile ? (
                <div className="editor-content">
                  <textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    className="code-textarea"
                    placeholder="File content will appear here..."
                    spellCheck={false}
                  />
                </div>
              ) : (
                <div className="empty-editor">
                  <div className="empty-icon">✏️</div>
                  <p>Select a file to edit</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="file-search">
            <div className="search-header">
              <div className="dashboard-card">
                <div className="search-form">
                  <div className="search-input-group">
                    <input
                      type="text"
                      placeholder="Enter search query..."
                      value={searchQuery}
                      onChange={handleSearchQueryChange}
                      className="search-query-input"
                      onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                    />
                    <button 
                      className="btn btn-primary"
                      onClick={performSearch}
                      disabled={searchLoading || !searchQuery.trim()}
                    >
                      {searchLoading ? '🔍 Searching...' : '🔍 Search'}
                    </button>
                    <button 
                      className="btn btn-secondary"
                      onClick={clearSearchCache}
                      title="Clear search cache"
                    >
                      🗑️ Clear Cache
                    </button>
                  </div>
                  
                  <div className="search-options">
                    <div className="search-path">
                      <label>Search Path:</label>
                      <select 
                        value={searchPath} 
                        onChange={(e) => setSearchPath(e.target.value)}
                        className="path-select"
                      >
                        <option value="/home/supreme-majesty">🏠 Home Directory</option>
                        <option value={platformConfig?.webroot || '/opt/lampp/htdocs/codes'}>🌐 Webroot</option>
                        <option value={platformConfig?.baseWebroot || '/opt/lampp/htdocs'}>📁 Base Webroot</option>
                        <option value="/var/www/html">🌍 System Web Root</option>
                        <option value="/var/www">📂 System Web</option>
                      </select>
                    </div>
                    
                    <div className="search-filters">
                      <label>
                        <input
                          type="checkbox"
                          checked={searchOptions.searchContent}
                          onChange={(e) => setSearchOptions(prev => ({ ...prev, searchContent: e.target.checked }))}
                        />
                        Search file contents
                      </label>
                      
                      <label>
                        <input
                          type="checkbox"
                          checked={searchOptions.caseSensitive}
                          onChange={(e) => setSearchOptions(prev => ({ ...prev, caseSensitive: e.target.checked }))}
                        />
                        Case sensitive
                      </label>
                    </div>
                    
                    <div className="file-type-filters">
                      <label>File Types:</label>
                      <div className="file-type-buttons">
                        {['js', 'jsx', 'ts', 'tsx', 'css', 'html', 'php', 'py', 'json', 'md', 'txt'].map(type => (
                          <button
                            key={type}
                            className={`file-type-btn ${searchOptions.fileTypes.includes(type) ? 'active' : ''}`}
                            onClick={() => {
                              setSearchOptions(prev => ({
                                ...prev,
                                fileTypes: prev.fileTypes.includes(type)
                                  ? prev.fileTypes.filter(t => t !== type)
                                  : [...prev.fileTypes, type]
                              }));
                            }}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="search-results">
              <div className="dashboard-card">
                {searchLoading ? (
                  <LoadingSpinner text="Searching files..." />
                ) : searchResults.length > 0 ? (
                  <div className="search-results-list">
                    <div className="results-header">
                      <h3>Search Results ({searchResults.length})</h3>
                      <div className="results-info">
                        <span>Query: "{searchQuery}"</span>
                        <span>Path: {searchPath}</span>
                      </div>
                    </div>
                    
                    <div className="results-list">
                      {searchResults.map((result, index) => (
                        <div 
                          key={index}
                          className="search-result-item"
                          onClick={() => handleSearchResultClick(result)}
                        >
                          <div className="result-icon">
                            {getFileIcon({ name: result.name, isDirectory: false })}
                          </div>
                          <div className="result-info">
                            <div className="result-name">{result.name}</div>
                            <div className="result-path">{result.path}</div>
                            <div className="result-details">
                              <span className={`match-type ${result.matchType}`}>
                                {result.matchType === 'filename' ? '📄 Filename' : '📝 Content'}
                              </span>
                              <span className="file-size">{formatFileSize(result.size)}</span>
                              <span className="file-date">
                                {new Date(result.modified).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="result-actions">
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchFileContent(result.path);
                              }}
                              title="Open in editor"
                            >
                              ✏️
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const dirPath = result.path.split('/').slice(0, -1).join('/');
                                setCurrentPath(dirPath);
                                setActiveTab('browser');
                              }}
                              title="Show in browser"
                            >
                              📁
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : searchQuery ? (
                  <div className="empty-search">
                    <div className="empty-icon">🔍</div>
                    <p>No files found matching "{searchQuery}"</p>
                    <p className="search-tips">
                      Try adjusting your search terms or enabling content search
                    </p>
                  </div>
                ) : (
                  <div className="search-placeholder">
                    <div className="placeholder-icon">🔍</div>
                    <h3>File Search</h3>
                    <p>Search for files by name or content across your project directories</p>
                    <div className="search-features">
                      <div className="feature">
                        <span className="feature-icon">📄</span>
                        <span>Search by filename</span>
                      </div>
                      <div className="feature">
                        <span className="feature-icon">📝</span>
                        <span>Search file contents</span>
                      </div>
                      <div className="feature">
                        <span className="feature-icon">🎯</span>
                        <span>Filter by file type</span>
                      </div>
                      <div className="feature">
                        <span className="feature-icon">⚡</span>
                        <span>Fast recursive search</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create File Modal */}
      <InputModal
        isOpen={showCreateFileModal}
        onClose={() => setShowCreateFileModal(false)}
        onSubmit={(name) => createFile(name, false)}
        title="Create New File"
        placeholder="Enter file name"
        validationMessage="File name is required"
      />

      {/* Create Folder Modal */}
      <InputModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onSubmit={(name) => createFile(name, true)}
        title="Create New Folder"
        placeholder="Enter folder name"
        validationMessage="Folder name is required"
      />

      {/* Delete File Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteFileModal}
        onClose={() => {
          setShowDeleteFileModal(false);
          setFileToDelete(null);
        }}
        onConfirm={() => deleteFile(fileToDelete)}
        title="Delete File/Folder"
        message="Are you sure you want to delete this file/folder? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default FileManager;
