import { useState, useEffect } from 'react';
import { socket } from './socket.js';
import { api } from './api.js';
import BinDashboard from './components/BinDashboard.jsx';
import StagesConfig from './components/StagesConfig.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import './App.css';

function getInitialTheme() {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [theme, setTheme] = useState(getInitialTheme);
  const [view, setView] = useState('dashboard');
  const [bins, setBins] = useState([]);
  const [stages, setStages] = useState([]);
  const [units, setUnits] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Load initial data
    Promise.all([api.bins.list(), api.stages.list(), api.units.list()])
      .then(([b, s, u]) => { setBins(b); setStages(s); setUnits(u); })
      .catch(() => setLoadError('Could not connect to server. Is it running?'));

    // Socket events
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Deduplicate: socket may arrive after optimistic add from API response
    socket.on('bin:created', (bin) => setBins(prev =>
      prev.some(b => b.id === bin.id) ? prev : [bin, ...prev]
    ));
    socket.on('bin:updated', (bin) => setBins(prev => prev.map(b => b.id === bin.id ? bin : b)));
    socket.on('bin:archived', ({ id }) => setBins(prev => prev.filter(b => b.id !== id)));

    socket.on('stage:created', (stage) => setStages(prev => [...prev, stage]));
    socket.on('stage:updated', (stage) => setStages(prev => prev.map(s => s.id === stage.id ? stage : s)));
    socket.on('stage:deleted', ({ id }) => setStages(prev => prev.filter(s => s.id !== id)));

    socket.on('unit:created', (unit) => setUnits(prev => [...prev, unit]));
    socket.on('unit:updated', (unit) => setUnits(prev => prev.map(u => u.id === unit.id ? unit : u)));
    socket.on('unit:deleted', ({ id }) => setUnits(prev => prev.filter(u => u.id !== id)));

    // Bulk refresh events emitted by admin operations
    socket.on('bins:updated', () => api.bins.list().then(setBins).catch(() => {}));
    socket.on('stages:updated', () => api.stages.list().then(setStages).catch(() => {}));
    socket.on('units:updated', () => api.units.list().then(setUnits).catch(() => {}));

    return () => socket.removeAllListeners();
  }, []);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <div className="app">
        <header className="app-header">
          <span className="app-logo">🍩 DoughTracker</span>
          <nav className="app-nav">
            <button
              className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`}
              onClick={() => setView('dashboard')}
            >
              Bins
            </button>
            <button
              className={`nav-btn ${view === 'stages' ? 'active' : ''}`}
              onClick={() => setView('stages')}
            >
              Stages
            </button>
            <button
              className={`nav-btn ${view === 'admin' ? 'active' : ''}`}
              onClick={() => setView('admin')}
            >
              Admin
            </button>
          </nav>
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? '☀' : '☽'}
          </button>
          <span className={`connection-dot ${connected ? 'connected' : 'disconnected'}`} title={connected ? 'Connected' : 'Disconnected'} />
        </header>

        <main className="app-main">
          {loadError && <div className="load-error">{loadError}</div>}
          {view === 'dashboard' && (
            <BinDashboard
              bins={bins}
              stages={stages}
              units={units}
              onBinCreated={(bin) => setBins(prev =>
                prev.some(b => b.id === bin.id) ? prev : [bin, ...prev]
              )}
            />
          )}
          {view === 'stages' && (
            <StagesConfig stages={stages} />
          )}
          {view === 'admin' && (
            <AdminPanel />
          )}
        </main>
      </div>
    </>
  );
}
