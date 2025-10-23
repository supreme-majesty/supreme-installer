import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './Terminal.css';

const Terminal = () => {
  const { token } = useAuth();
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [currentDirectory, setCurrentDirectory] = useState('/var/www/html');
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([{ id: 1, name: 'Terminal 1', active: true }]);
  const [activeSession, setActiveSession] = useState(1);
  const terminalRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Initialize terminal with welcome message
    addToHistory('Welcome to Supreme Dashboard Terminal', 'system');
    addToHistory(`Current directory: ${currentDirectory}`, 'info');
    addToHistory('Type "help" for available commands', 'info');
  }, []);

  useEffect(() => {
    // Focus input when terminal is clicked
    if (terminalRef.current) {
      terminalRef.current.focus();
    }
  }, []);

  const addToHistory = (text, type = 'output', command = '') => {
    const entry = {
      id: Date.now() + Math.random(),
      text,
      type,
      command,
      timestamp: new Date(),
      sessionId: activeSession
    };
    
    setHistory(prev => [...prev, entry]);
  };

  const executeCommand = async (cmd) => {
    if (!cmd.trim()) return;

    setIsExecuting(true);
    setError(null);
    
    // Add command to history
    addToHistory(cmd, 'command');
    
    try {
      const response = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          command: cmd,
          directory: currentDirectory,
          sessionId: activeSession
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.output) {
          addToHistory(data.output, 'output', cmd);
        }
        if (data.error) {
          addToHistory(data.error, 'error', cmd);
        }
        if (data.directory) {
          setCurrentDirectory(data.directory);
        }
      } else {
        addToHistory(data.error || 'Command execution failed', 'error', cmd);
      }
    } catch (error) {
      addToHistory('Failed to execute command', 'error', cmd);
      console.error('Error executing command:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (command.trim() && !isExecuting) {
      executeCommand(command.trim());
      setCommand('');
    }
  };

  const handleKeyDown = (e) => {
    // Handle command history navigation
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Navigate up in command history
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Navigate down in command history
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Handle tab completion
    }
  };

  const createNewSession = () => {
    const newSession = {
      id: Date.now(),
      name: `Terminal ${sessions.length + 1}`,
      active: false
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSession(newSession.id);
    addToHistory(`New terminal session created: ${newSession.name}`, 'system');
  };

  const switchSession = (sessionId) => {
    setActiveSession(sessionId);
    setSessions(prev => prev.map(s => ({ ...s, active: s.id === sessionId })));
  };

  const closeSession = (sessionId) => {
    if (sessions.length <= 1) return;
    
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSession === sessionId) {
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      setActiveSession(remainingSessions[0].id);
    }
  };

  const clearTerminal = () => {
    setHistory(prev => prev.filter(entry => entry.type === 'system'));
  };

  const getPrompt = () => {
    const user = 'supreme';
    const host = 'dashboard';
    const dir = currentDirectory.split('/').pop() || '/';
    return `${user}@${host}:${dir}$`;
  };

  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString();
  };

  const getHistoryForSession = () => {
    return history.filter(entry => entry.sessionId === activeSession);
  };

  return (
    <div className="terminal">
      <div className="page-header">
        <h1 className="page-title">Terminal</h1>
        <p className="page-subtitle">Execute commands and manage your development environment</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      <div className="terminal-container">
        {/* Terminal Sessions */}
        <div className="terminal-sessions">
          <div className="dashboard-card">
            <div className="sessions-header">
              <h3>Terminal Sessions</h3>
              <button 
                className="btn btn-primary btn-sm"
                onClick={createNewSession}
              >
                + New
              </button>
            </div>
            
            <div className="sessions-list">
              {sessions.map(session => (
                <div 
                  key={session.id} 
                  className={`session-item ${session.active ? 'active' : ''}`}
                  onClick={() => switchSession(session.id)}
                >
                  <span className="session-name">{session.name}</span>
                  {sessions.length > 1 && (
                    <button 
                      className="session-close"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeSession(session.id);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Terminal Output */}
        <div className="terminal-output">
          <div className="dashboard-card">
            <div className="terminal-header">
              <h3>Terminal Output</h3>
              <div className="terminal-controls">
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={clearTerminal}
                >
                  🗑️ Clear
                </button>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (inputRef.current) {
                      inputRef.current.focus();
                    }
                  }}
                >
                  📝 Focus
                </button>
              </div>
            </div>
            
            <div 
              className="terminal-display"
              ref={terminalRef}
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.focus();
                }
              }}
            >
              {getHistoryForSession().map(entry => (
                <div key={entry.id} className={`terminal-line ${entry.type}`}>
                  {entry.type === 'command' && (
                    <span className="terminal-prompt">{getPrompt()}</span>
                  )}
                  {entry.type === 'output' && entry.command && (
                    <span className="terminal-prompt">{getPrompt()}</span>
                  )}
                  <span className="terminal-text">{entry.text}</span>
                  {entry.type === 'command' && (
                    <span className="terminal-timestamp">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  )}
                </div>
              ))}
              
              {isExecuting && (
                <div className="terminal-line executing">
                  <span className="terminal-prompt">{getPrompt()}</span>
                  <span className="terminal-text">{command}</span>
                  <LoadingSpinner size="small" text="" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Command Input */}
        <div className="terminal-input">
          <div className="dashboard-card">
            <form onSubmit={handleSubmit} className="command-form">
              <div className="input-group">
                <span className="input-prompt">{getPrompt()}</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="command-input"
                  placeholder="Enter command..."
                  disabled={isExecuting}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!command.trim() || isExecuting}
                >
                  {isExecuting ? <LoadingSpinner size="small" text="" /> : '▶️'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Quick Commands */}
        <div className="quick-commands">
          <div className="dashboard-card">
            <h3>Quick Commands</h3>
            <div className="commands-grid">
              <button 
                className="quick-command"
                onClick={() => executeCommand('ls -la')}
                disabled={isExecuting}
              >
                📋 List Files
              </button>
              <button 
                className="quick-command"
                onClick={() => executeCommand('pwd')}
                disabled={isExecuting}
              >
                📍 Current Directory
              </button>
              <button 
                className="quick-command"
                onClick={() => executeCommand('supreme status')}
                disabled={isExecuting}
              >
                ⚡ Supreme Status
              </button>
              <button 
                className="quick-command"
                onClick={() => executeCommand('supreme doctor')}
                disabled={isExecuting}
              >
                🩺 System Check
              </button>
              <button 
                className="quick-command"
                onClick={() => executeCommand('git status')}
                disabled={isExecuting}
              >
                🔄 Git Status
              </button>
              <button 
                className="quick-command"
                onClick={() => executeCommand('npm list')}
                disabled={isExecuting}
              >
                📦 NPM Packages
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
