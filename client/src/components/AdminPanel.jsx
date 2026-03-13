import { useState } from 'react';
import { api } from '../api.js';
import './AdminPanel.css';

const ACTIONS = [
  {
    key: 'archive-all',
    title: 'Archive Active Bins',
    description: 'Moves all current bins off the board. History is preserved and bins can still be viewed in records. Use this at the end of a shift to clear the board.',
    buttonLabel: 'Archive All Bins',
    buttonClass: 'admin-btn-warning',
    confirm: { type: 'button', message: 'This will archive all active bins. The board will be cleared.' },
    run: () => api.admin.archiveAll(),
    successMsg: (r) => `${r.archived} bin${r.archived !== 1 ? 's' : ''} archived.`,
  },
  {
    key: 'clear-data',
    title: 'Clear All Production Data',
    description: 'Permanently deletes all bins and their history. Stages and units are kept. This cannot be undone.',
    buttonLabel: 'Clear Production Data',
    buttonClass: 'admin-btn-danger',
    confirm: { type: 'button', message: 'This will permanently delete all bins and history. Stages and units will remain.' },
    run: () => api.admin.clearData(),
    successMsg: () => 'All production data deleted.',
  },
  {
    key: 'factory-reset',
    title: 'Factory Reset',
    description: 'Wipes everything — all bins, history, stages, and units — and restores the original default stages and units. Use with caution.',
    buttonLabel: 'Factory Reset',
    buttonClass: 'admin-btn-danger',
    confirm: { type: 'type-reset', message: 'This will wipe all data and restore defaults. Type RESET to confirm.' },
    run: () => api.admin.factoryReset(),
    successMsg: () => 'Factory reset complete. Defaults restored.',
  },
];

function ActionCard({ action }) {
  const [phase, setPhase] = useState('idle'); // idle | confirm | running | done | error
  const [resetInput, setResetInput] = useState('');
  const [message, setMessage] = useState('');

  function startConfirm() {
    setPhase('confirm');
    setResetInput('');
    setMessage('');
  }

  function cancel() {
    setPhase('idle');
    setResetInput('');
    setMessage('');
  }

  async function execute() {
    setPhase('running');
    try {
      const result = await action.run();
      setMessage(action.successMsg(result));
      setPhase('done');
    } catch (err) {
      setMessage(err.message || 'Something went wrong.');
      setPhase('error');
    }
  }

  const canExecute = action.confirm.type === 'button' || resetInput === 'RESET';

  return (
    <div className={`admin-card ${phase === 'done' ? 'admin-card-done' : ''}`}>
      <div className="admin-card-body">
        <h3>{action.title}</h3>
        <p>{action.description}</p>
      </div>

      {phase === 'idle' && (
        <button className={`admin-btn ${action.buttonClass}`} onClick={startConfirm}>
          {action.buttonLabel}
        </button>
      )}

      {phase === 'confirm' && (
        <div className="admin-confirm">
          <p className="admin-confirm-message">{action.confirm.message}</p>
          {action.confirm.type === 'type-reset' && (
            <input
              autoFocus
              value={resetInput}
              onChange={e => setResetInput(e.target.value)}
              placeholder="Type RESET"
              className="admin-reset-input"
            />
          )}
          <div className="admin-confirm-actions">
            <button className="admin-btn admin-btn-ghost" onClick={cancel}>Cancel</button>
            <button
              className={`admin-btn ${action.buttonClass}`}
              onClick={execute}
              disabled={!canExecute}
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {phase === 'running' && (
        <button className="admin-btn admin-btn-ghost" disabled>Running…</button>
      )}

      {(phase === 'done' || phase === 'error') && (
        <div className="admin-result">
          <span className={phase === 'done' ? 'admin-result-ok' : 'admin-result-err'}>{message}</span>
          <button className="admin-btn admin-btn-ghost" onClick={cancel}>Dismiss</button>
        </div>
      )}
    </div>
  );
}

export default function AdminPanel() {
  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>Admin</h2>
        <p>Manage and reset production data. These actions affect all connected devices.</p>
      </div>
      <div className="admin-cards">
        {ACTIONS.map(action => (
          <ActionCard key={action.key} action={action} />
        ))}
      </div>
    </div>
  );
}
