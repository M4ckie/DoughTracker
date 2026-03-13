import { useState } from 'react';
import { api } from '../api.js';
import BinCard from './BinCard.jsx';
import AddBin from './AddBin.jsx';
import './BinDashboard.css';

export default function BinDashboard({ bins, stages, units }) {
  const [showAdd, setShowAdd] = useState(false);
  const [filterStage, setFilterStage] = useState('all');

  const filtered = filterStage === 'all'
    ? bins
    : bins.filter(b => String(b.stage_id) === filterStage);

  return (
    <div className="bin-dashboard">
      <div className="dashboard-toolbar">
        <div className="filter-row">
          <button
            className={`filter-btn ${filterStage === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStage('all')}
          >
            All ({bins.length})
          </button>
          {stages.map(s => (
            <button
              key={s.id}
              className={`filter-btn ${filterStage === String(s.id) ? 'active' : ''}`}
              style={{ '--stage-color': s.color }}
              onClick={() => setFilterStage(String(s.id))}
            >
              <span className="filter-dot" />
              {s.name} ({bins.filter(b => b.stage_id === s.id).length})
            </button>
          ))}
        </div>
        <button className="add-btn" onClick={() => setShowAdd(true)}>+ New Bin</button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No bins yet. Tap <strong>+ New Bin</strong> to get started.</p>
        </div>
      ) : (
        <div className="bin-grid">
          {filtered.map(bin => (
            <BinCard key={bin.id} bin={bin} stages={stages} units={units} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddBin stages={stages} units={units} onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}
