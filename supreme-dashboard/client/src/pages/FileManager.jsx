import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './FileManager.css';

const FileManager = () => {
  const { token } = useAuth();
  const [currentPath, setCurrentPath] = useState('/var/www/html');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('browser');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // list or grid

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath]);

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
        setError(errorData.error || 'Failed to fetch files');
      }
    } catch (error) {
      setError('Failed to fetch files');
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
        return { success: false, error: errorData.error || 'Failed to create file' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to create file' };
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (filePath) => {
    if (!window.confirm('Are you sure you want to delete this file/folder?')) {
      return;
    }

    try {
      setLoading(true);
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
        return { success: false, error: errorData.error || 'Failed to delete file' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to delete file' };
    } finally {
      setLoading(false);
    }
  };

  const navigateToPath = (path) => {
    setCurrentPath(path);
    setSelectedFile(null);
    setFileContent('');
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
                    
                    <input
                      type="text"
                      placeholder="Search files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                    
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        const name = prompt('Enter file name:');
                        if (name) createFile(name, false);
                      }}
                    >
                      + File
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        const name = prompt('Enter folder name:');
                        if (name) createFile(name, true);
                      }}
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
                              deleteFile(file.path);
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
            <div className="dashboard-card">
              <h3>Search Files</h3>
              <div className="search-content">
                <p>File search functionality will be implemented here.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileManager;
