import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Projects.css';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, inactive
  const [sortBy, setSortBy] = useState('name'); // name, type, status, modified
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      fetchProjects();
    }
  }, [token]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      setProjects(data.projects || []);
      setError(null);
    } catch (error) {
      setError('Failed to fetch projects');
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectAction = async (projectName, action) => {
    try {
      const response = await fetch(`/api/projects/${projectName}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} project`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh projects list
        await fetchProjects();
      }
    } catch (error) {
      console.error(`Error ${action}ing project:`, error);
    }
  };

  const openInBrowser = (url) => {
    window.open(url, '_blank');
  };

  const openInFileManager = (path) => {
    // This would need platform-specific implementation
    alert(`Opening file manager for: ${path}`);
  };

  const getProjectTypeIcon = (type) => {
    const icons = {
      node: '🟢',
      php: '🟣',
      python: '🐍',
      static: '📄'
    };
    return icons[type] || '📁';
  };

  const getStatusBadge = (status) => {
    return status === 'active' ? '🟢 Active' : '🔴 Inactive';
  };

  const getProtocolBadge = (protocol) => {
    return protocol === 'https' ? '🔒 HTTPS' : '🔓 HTTP';
  };

  const filteredProjects = projects.filter(project => {
    if (filter === 'all') return true;
    return project.status === filter;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'type':
        return a.type.localeCompare(b.type);
      case 'status':
        return a.status.localeCompare(b.status);
      case 'modified':
        return new Date(b.modified) - new Date(a.modified);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="projects-loading">
        <div className="loading-spinner"></div>
        <p>Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="projects-error">
        <div className="error-icon">⚠️</div>
        <h3>Error Loading Projects</h3>
        <p>{error}</p>
        <button onClick={fetchProjects} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="projects">
      <div className="page-header">
        <h1 className="page-title">Projects Overview</h1>
        <p className="page-subtitle">Manage your local development projects</p>
      </div>

      {/* Stats Cards */}
      <div className="projects-stats">
        <div className="stat-card">
          <div className="stat-value">{projects.length}</div>
          <div className="stat-label">Total Projects</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{projects.filter(p => p.status === 'active').length}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{projects.filter(p => p.status === 'inactive').length}</div>
          <div className="stat-label">Inactive</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{projects.filter(p => p.protocol === 'https').length}</div>
          <div className="stat-label">HTTPS</div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="projects-controls">
        <div className="filters">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Projects</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="name">Sort by Name</option>
            <option value="type">Sort by Type</option>
            <option value="status">Sort by Status</option>
            <option value="modified">Sort by Modified</option>
          </select>
        </div>

        <button 
          onClick={fetchProjects} 
          className="btn btn-secondary refresh-btn"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Projects Grid */}
      <div className="projects-grid">
        {sortedProjects.length === 0 ? (
          <div className="no-projects">
            <div className="no-projects-icon">📁</div>
            <h3>No Projects Found</h3>
            <p>Create your first project using the Supreme CLI or add existing projects to your webroot.</p>
            <button className="btn btn-primary">
              🚀 Create New Project
            </button>
          </div>
        ) : (
          sortedProjects.map((project) => (
            <div key={project.name} className="project-card">
              <div className="project-header">
                <div className="project-icon">
                  {getProjectTypeIcon(project.type)}
                </div>
                <div className="project-info">
                  <h3 className="project-name">{project.name}</h3>
                  <p className="project-type">{project.type.toUpperCase()}</p>
                </div>
                <div className="project-status">
                  <span className={`status-badge ${project.status}`}>
                    {getStatusBadge(project.status)}
                  </span>
                </div>
              </div>

              <div className="project-details">
                <div className="project-url">
                  <span className="url-label">URL:</span>
                  <span className="url-value">{project.url}</span>
                  <span className={`protocol-badge ${project.protocol}`}>
                    {getProtocolBadge(project.protocol)}
                  </span>
                </div>
                
                <div className="project-meta">
                  <div className="meta-item">
                    <span className="meta-label">Size:</span>
                    <span className="meta-value">{project.size}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Modified:</span>
                    <span className="meta-value">
                      {new Date(project.modified).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="project-actions">
                <button 
                  onClick={() => openInBrowser(project.url)}
                  className="btn btn-primary btn-sm"
                  title="Open in Browser"
                >
                  🌐 Open
                </button>
                
                <button 
                  onClick={() => openInFileManager(project.path)}
                  className="btn btn-secondary btn-sm"
                  title="Open in File Manager"
                >
                  📁 Folder
                </button>

                {project.status === 'active' ? (
                  <button 
                    onClick={() => handleProjectAction(project.name, 'stop')}
                    className="btn btn-danger btn-sm"
                    title="Stop Project"
                  >
                    ⏹️ Stop
                  </button>
                ) : (
                  <button 
                    onClick={() => handleProjectAction(project.name, 'start')}
                    className="btn btn-success btn-sm"
                    title="Start Project"
                  >
                    ▶️ Start
                  </button>
                )}

                <button 
                  onClick={() => handleProjectAction(project.name, 'status')}
                  className="btn btn-info btn-sm"
                  title="View Status"
                >
                  ℹ️ Status
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Projects;
