import { useState, useEffect } from 'react';
import { api } from '../api.js';
import './BinHistory.css';

export default function BinHistory({ binId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.bins.history(binId).then(h => { setHistory(h); setLoading(false); });
  }, [binId]);

  if (loading) return <div className="history-loading">Loading…</div>;
  if (history.length === 0) return <div className="history-empty">No history yet.</div>;

  return (
    <div className="bin-history">
      {history.map(entry => (
        <div key={entry.id} className="history-entry">
          <div className="history-meta">
            <span className="history-time">{new Date(entry.created_at).toLocaleString()}</span>
            {entry.stage_name && (
              <span className="history-stage" style={{ color: entry.stage_color }}>
                {entry.stage_name}
              </span>
            )}
          </div>
          <div className="history-detail">
            {entry.quantity != null && (
              <span>{entry.quantity} {entry.unit_abbreviation || ''}</span>
            )}
            {entry.note && <span className="history-note">{entry.note}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
