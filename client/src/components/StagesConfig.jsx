import { useState } from 'react';
import { api } from '../api.js';
import './StagesConfig.css';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#10b981', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#ec4899', '#64748b', '#ffffff',
];

function ColorPicker({ value, onChange }) {
  return (
    <div className="color-picker">
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          type="button"
          className={`color-swatch ${c === value ? 'selected' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

function StageRow({ stage, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: stage.name, color: stage.color });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(stage.id, form);
    setEditing(false);
    setSaving(false);
  }

  if (editing) {
    return (
      <div className="stage-row editing">
        <div className="stage-edit-fields">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <ColorPicker value={form.color} onChange={color => setForm(f => ({ ...f, color }))} />
        </div>
        <div className="stage-row-actions">
          <button className="delete-btn" onClick={() => onDelete(stage.id)}>Delete</button>
          <button className="cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
          <button className="save-btn" onClick={save} disabled={saving}>
            {saving ? '…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stage-row" onClick={() => setEditing(true)}>
      <span className="stage-dot" style={{ background: stage.color }} />
      <span className="stage-name">{stage.name}</span>
      <span className="stage-edit-hint">tap to edit</span>
    </div>
  );
}

export default function StagesConfig({ stages }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [adding, setAdding] = useState(false);

  async function addStage(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    await api.stages.create({ name: newName.trim(), color: newColor });
    setNewName('');
    setNewColor('#6366f1');
    setShowAdd(false);
    setAdding(false);
  }

  async function saveStage(id, data) {
    await api.stages.update(id, data);
  }

  async function deleteStage(id) {
    if (!confirm('Delete this stage? Bins using it will lose their stage.')) return;
    await api.stages.delete(id);
  }

  return (
    <div className="stages-config">
      <div className="config-header">
        <h2>Stages</h2>
        <button className="add-btn" onClick={() => setShowAdd(v => !v)}>+ Add Stage</button>
      </div>

      {showAdd && (
        <form className="add-stage-form" onSubmit={addStage}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Stage name"
          />
          <ColorPicker value={newColor} onChange={setNewColor} />
          <div className="add-form-actions">
            <button type="button" className="cancel-btn" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="save-btn" disabled={adding}>
              {adding ? '…' : 'Add'}
            </button>
          </div>
        </form>
      )}

      <div className="stages-list">
        {stages.map(stage => (
          <StageRow key={stage.id} stage={stage} onSave={saveStage} onDelete={deleteStage} />
        ))}
      </div>
    </div>
  );
}
