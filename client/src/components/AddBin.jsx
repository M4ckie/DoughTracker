import { useState } from 'react';
import { api } from '../api.js';
import './AddBin.css';

export default function AddBin({ stages, units, onClose }) {
  const [form, setForm] = useState({
    label: '',
    stage_id: stages[0]?.id ?? '',
    quantity: '',
    unit_id: units[0]?.id ?? '',
    location: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!form.label.trim()) { setError('Label is required'); return; }
    setSaving(true);
    setError('');
    try {
      await api.bins.create({
        ...form,
        stage_id: form.stage_id || null,
        unit_id: form.unit_id || null,
        quantity: parseFloat(form.quantity) || 0,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">New Bin</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} className="modal-form">
          <label>Label *
            <input
              autoFocus
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Batch A"
            />
          </label>

          <label>Stage
            <select value={form.stage_id} onChange={e => setForm(f => ({ ...f, stage_id: e.target.value }))}>
              <option value="">— no stage —</option>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>

          <div className="form-row">
            <label>Quantity
              <input type="number" min="0" step="0.1" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                placeholder="0" />
            </label>
            <label>Unit
              <select value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}>
                <option value="">—</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.abbreviation}</option>)}
              </select>
            </label>
          </div>

          <label>Location
            <input value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. rack 2, shelf B" />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? 'Adding…' : 'Add Bin'}
          </button>
        </form>
      </div>
    </div>
  );
}
