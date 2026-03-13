import { Router } from 'express';
import db from '../db.js';

const router = Router();

// POST /api/admin/archive-all
// Soft-archives all active bins
router.post('/archive-all', (req, res) => {
  const active = db.prepare('SELECT * FROM bins WHERE archived = 0').all();
  if (active.length === 0) return res.json({ archived: 0 });

  const archiveBin = db.prepare("UPDATE bins SET archived=1, updated_at=datetime('now') WHERE id=?");
  const logHistory = db.prepare('INSERT INTO bin_history (bin_id, stage_id, quantity, unit_id, note) VALUES (?, ?, ?, ?, ?)');

  const archiveAll = db.transaction(() => {
    for (const bin of active) {
      archiveBin.run(bin.id);
      logHistory.run(bin.id, bin.stage_id, bin.quantity, bin.unit_id, 'Archived via admin panel');
    }
  });

  archiveAll();

  req.io.emit('bins:updated');
  res.json({ archived: active.length });
});

// POST /api/admin/clear-data
// Hard-deletes all bins and history, stages/units untouched
router.post('/clear-data', (req, res) => {
  const clearAll = db.transaction(() => {
    db.prepare('DELETE FROM bin_history').run();
    db.prepare('DELETE FROM bins').run();
  });

  clearAll();

  req.io.emit('bins:updated');
  res.json({ ok: true });
});

// POST /api/admin/factory-reset
// Wipes all data and re-seeds default stages and units
router.post('/factory-reset', (req, res) => {
  const reset = db.transaction(() => {
    db.prepare('DELETE FROM bin_history').run();
    db.prepare('DELETE FROM bins').run();
    db.prepare('DELETE FROM stages').run();
    db.prepare('DELETE FROM units').run();

    const insertStage = db.prepare('INSERT INTO stages (name, color, sort_order) VALUES (?, ?, ?)');
    [
      ['Raw Dough', '#f59e0b', 0],
      ['Proofing', '#3b82f6', 1],
      ['Frying', '#ef4444', 2],
      ['Cooling', '#10b981', 3],
      ['Finished', '#6366f1', 4],
    ].forEach(([name, color, sort_order]) => insertStage.run(name, color, sort_order));

    const insertUnit = db.prepare('INSERT INTO units (name, abbreviation) VALUES (?, ?)');
    [
      ['Kilograms', 'kg'],
      ['Pounds', 'lbs'],
      ['Grams', 'g'],
      ['Dozens', 'doz'],
      ['Each', 'ea'],
    ].forEach(([name, abbreviation]) => insertUnit.run(name, abbreviation));
  });

  reset();

  req.io.emit('bins:updated');
  req.io.emit('stages:updated');
  req.io.emit('units:updated');
  res.json({ ok: true });
});

export default router;
