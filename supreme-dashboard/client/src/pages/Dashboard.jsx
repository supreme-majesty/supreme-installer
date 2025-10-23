import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      fetchDashboardStats();
    }
  }, [token]);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Failed to fetch dashboard stats:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Chart data for performance metrics
  const performanceData = {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    datasets: [
      {
        label: 'Response Time (ms)',
        data: [45, 52, 38, 65, 42, 58],
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'CPU Usage (%)',
        data: [25, 35, 28, 45, 32, 38],
        borderColor: '#7c3aed',
        backgroundColor: 'rgba(124, 58, 237, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  };

  const performanceOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: 'System Performance (24h)',
        color: 'white',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      }
    }
  };

  // Doughnut chart data for project status
  const projectStatusData = {
    labels: ['Active', 'Inactive'],
    datasets: [
      {
        data: stats ? [stats.projects.active, stats.projects.inactive] : [8, 4],
        backgroundColor: ['#10b981', '#ef4444'],
        borderColor: ['#10b981', '#ef4444'],
        borderWidth: 2,
      }
    ]
  };

  const projectStatusOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: 'Project Status',
        color: 'white',
        font: {
          size: 14,
          weight: 'bold'
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="page-subtitle">Welcome to your Supreme Development Environment</p>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-grid">
        <div className="dashboard-card stat-card">
          <div className="stat-value">{stats?.projects.total || 12}</div>
          <div className="stat-label">Total Projects</div>
          <div className="stat-change positive">
            <span>↗</span>
            <span>+2 this week</span>
          </div>
        </div>

        <div className="dashboard-card stat-card">
          <div className="stat-value">{stats?.projects.active || 8}</div>
          <div className="stat-label">Active Projects</div>
          <div className="stat-change positive">
            <span>↗</span>
            <span>+1 today</span>
          </div>
        </div>

        <div className="dashboard-card stat-card">
          <div className="stat-value">{Math.round(stats?.system.cpu || 45)}%</div>
          <div className="stat-label">CPU Usage</div>
          <div className="stat-change negative">
            <span>↘</span>
            <span>-5% from yesterday</span>
          </div>
        </div>

        <div className="dashboard-card stat-card">
          <div className="stat-value">{Math.round(stats?.system.memory || 68)}%</div>
          <div className="stat-label">Memory Usage</div>
          <div className="stat-change positive">
            <span>↗</span>
            <span>+2% from yesterday</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-row">
          <div className="chart-container-wrapper">
            <div className="dashboard-card">
              <div className="chart-container">
                <Line data={performanceData} options={performanceOptions} />
              </div>
            </div>
          </div>
          
          <div className="chart-container-wrapper">
            <div className="dashboard-card">
              <div className="chart-container">
                <Doughnut data={projectStatusData} options={projectStatusOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <div className="dashboard-card">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button className="btn btn-primary" onClick={() => window.location.href = '/projects'}>
              <span>🏠</span>
              <span>Manage Projects</span>
            </button>
            <button className="btn btn-secondary" onClick={() => window.location.href = '/certificates'}>
              <span>🔐</span>
              <span>SSL Certificates</span>
            </button>
            <button className="btn btn-secondary" onClick={() => window.location.href = '/logs'}>
              <span>📜</span>
              <span>View Logs</span>
            </button>
            <button className="btn btn-secondary" onClick={() => window.location.href = '/system'}>
              <span>💻</span>
              <span>System Info</span>
            </button>
            <button className="btn btn-secondary" onClick={() => window.location.href = '/settings'}>
              <span>⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
