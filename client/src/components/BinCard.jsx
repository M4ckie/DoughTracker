import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import BinHistory from './BinHistory.jsx';
import './BinCard.css';

export default function BinCard({ bin, stages, units }) {
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [form, setForm] = useState({
    label: bin.label,
    stage_id: bin.stage_id ?? '',
    quantity: bin.quantity,
    unit_id: bin.unit_id ?? '',
    location: bin.location,
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const editingRef = useRef(editing);
  editingRef.current = editing;

  // Keep form fresh when bin updates from another terminal
  useEffect(() => {
    if (editingRef.current) {
      setConflict(true);
    } else {
      setForm({
        label: bin.label,
        stage_id: bin.stage_id ?? '',
        quantity: bin.quantity,
        unit_id: bin.unit_id ?? '',
        location: bin.location,
        note: '',
      });
    }
  }, [bin]);

  function startEdit() {
    setForm({
      label: bin.label,
      stage_id: bin.stage_id ?? '',
      quantity: bin.quantity,
      unit_id: bin.unit_id ?? '',
      location: bin.location,
      note: '',
    });
    setConflict(false);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      await api.bins.update(bin.id, {
        ...form,
        stage_id: form.stage_id || null,
        unit_id: form.unit_id || null,
        quantity: parseFloat(form.quantity) || 0,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!confirm(`Archive bin "${bin.label}"?`)) return;
    await api.bins.archive(bin.id);
  }

  const stageColor = bin.stage_color || '#444';

  if (editing) {
    return (
      <div className="bin-card editing">
        <div className="card-edit-header">
          <span className="edit-title">Edit Bin</span>
          <button className="icon-btn" onClick={() => setEditing(false)}>✕</button>
        </div>
        {conflict && (
          <div className="conflict-banner">
            ⚠️ This bin was updated on another terminal. <button className="conflict-reload" onClick={startEdit}>Reload latest</button>
          </div>
        )}

        <div className="edit-fields">
          <label>Label
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
          </label>
          <label>Stage
            <select value={form.stage_id} onChange={e => setForm(f => ({ ...f, stage_id: e.target.value }))}>
              <option value="">— no stage —</option>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <div className="edit-row">
            <label>Quantity
              <input type="number" min="0" step="0.1" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </label>
            <label>Unit
              <select value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}>
                <option value="">—</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.abbreviation}</option>)}
              </select>
            </label>
          </div>
          <label>Location
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. rack 2, shelf B" />
          </label>
          <label>Note (optional)
            <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. moved to proofing" />
          </label>
        </div>

        <div className="edit-actions">
          <button className="archive-btn" onClick={archive}>Archive</button>
          <button className="save-btn" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bin-card" style={{ '--stage-color': stageColor }} onClick={startEdit}>
      <div className="card-stage-bar" />
      <div className="card-body">
        <div className="card-header">
          <span className="card-label">{bin.label}</span>
          {bin.stage_name && (
            <span className="card-stage-badge" style={{ background: stageColor + '33', color: stageColor }}>
              {bin.stage_name}
            </span>
          )}
        </div>

        <div className="card-qty">
          <span className="qty-value">{bin.quantity}</span>
          <span className="qty-unit">{bin.unit_abbreviation || ''}</span>
        </div>

        {bin.location && (
          <div className="card-location">📍 {bin.location}</div>
        )}

        <button
          className="history-btn"
          onClick={e => { e.stopPropagation(); setShowHistory(v => !v); }}
        >
          {showHistory ? 'Hide history' : 'Show history'}
        </button>

        {showHistory && <BinHistory binId={bin.id} />}
      </div>
    </div>
  );
}
