import { useState, useEffect } from 'react';
import { socket } from './socket.js';
import { api } from './api.js';
import BinDashboard from './components/BinDashboard.jsx';
import StagesConfig from './components/StagesConfig.jsx';
import './App.css';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [bins, setBins] = useState([]);
  const [stages, setStages] = useState([]);
  const [units, setUnits] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    // Load initial data
    Promise.all([api.bins.list(), api.stages.list(), api.units.list()])
      .then(([b, s, u]) => { setBins(b); setStages(s); setUnits(u); })
      .catch(() => setLoadError('Could not connect to server. Is it running?'));

    // Socket events
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('bin:created', (bin) => setBins(prev => [bin, ...prev]));
    socket.on('bin:updated', (bin) => setBins(prev => prev.map(b => b.id === bin.id ? bin : b)));
    socket.on('bin:archived', ({ id }) => setBins(prev => prev.filter(b => b.id !== id)));

    socket.on('stage:created', (stage) => setStages(prev => [...prev, stage]));
    socket.on('stage:updated', (stage) => setStages(prev => prev.map(s => s.id === stage.id ? stage : s)));
    socket.on('stage:deleted', ({ id }) => setStages(prev => prev.filter(s => s.id !== id)));

    socket.on('unit:created', (unit) => setUnits(prev => [...prev, unit]));
    socket.on('unit:updated', (unit) => setUnits(prev => prev.map(u => u.id === unit.id ? unit : u)));
    socket.on('unit:deleted', ({ id }) => setUnits(prev => prev.filter(u => u.id !== id)));

    return () => socket.removeAllListeners();
  }, []);

  return (
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
        </nav>
        <span className={`connection-dot ${connected ? 'connected' : 'disconnected'}`} title={connected ? 'Connected' : 'Disconnected'} />
      </header>

      <main className="app-main">
        {loadError && <div className="load-error">{loadError}</div>}
        {view === 'dashboard' && (
          <BinDashboard bins={bins} stages={stages} units={units} />
        )}
        {view === 'stages' && (
          <StagesConfig stages={stages} />
        )}
      </main>
    </div>
  );
}
