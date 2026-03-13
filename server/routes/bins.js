import { Router } from 'express';
import db from '../db.js';

const router = Router();

const BIN_SELECT = `
  SELECT b.*, s.name as stage_name, s.color as stage_color,
         u.name as unit_name, u.abbreviation as unit_abbreviation
  FROM bins b
  LEFT JOIN stages s ON b.stage_id = s.id
  LEFT JOIN units u ON b.unit_id = u.id
  WHERE b.archived = 0
  ORDER BY b.updated_at DESC
`;

const HISTORY_SELECT = `
  SELECT h.*, s.name as stage_name, s.color as stage_color,
         u.name as unit_name, u.abbreviation as unit_abbreviation
  FROM bin_history h
  LEFT JOIN stages s ON h.stage_id = s.id
  LEFT JOIN units u ON h.unit_id = u.id
  WHERE h.bin_id = ?
  ORDER BY h.created_at DESC, h.id DESC
`;

// GET /api/bins
router.get('/', (req, res) => {
  const bins = db.prepare(BIN_SELECT).all();
  res.json(bins);
});

// GET /api/bins/:id/history
router.get('/:id/history', (req, res) => {
  const history = db.prepare(HISTORY_SELECT).all(req.params.id);
  res.json(history);
});

// POST /api/bins
router.post('/', (req, res) => {
  const { label, stage_id, quantity, unit_id, location = '' } = req.body;
  if (!label) return res.status(400).json({ error: 'label is required' });

  const result = db.prepare(
    'INSERT INTO bins (label, stage_id, quantity, unit_id, location) VALUES (?, ?, ?, ?, ?)'
  ).run(label, stage_id || null, quantity || 0, unit_id || null, location);

  const bin = db.prepare('SELECT b.*, s.name as stage_name, s.color as stage_color, u.name as unit_name, u.abbreviation as unit_abbreviation FROM bins b LEFT JOIN stages s ON b.stage_id = s.id LEFT JOIN units u ON b.unit_id = u.id WHERE b.id = ?').get(result.lastInsertRowid);

  // Log history
  db.prepare('INSERT INTO bin_history (bin_id, stage_id, quantity, unit_id, note) VALUES (?, ?, ?, ?, ?)').run(
    bin.id, bin.stage_id, bin.quantity, bin.unit_id, 'Bin created'
  );

  req.io.emit('bin:created', bin);
  res.status(201).json(bin);
});

// PATCH /api/bins/:id
router.patch('/:id', (req, res) => {
  const { label, stage_id, quantity, unit_id, location, note = '' } = req.body;
  const id = req.params.id;

  const existing = db.prepare('SELECT * FROM bins WHERE id = ? AND archived = 0').get(id);
  if (!existing) return res.status(404).json({ error: 'Bin not found' });

  const updated = {
    label: label ?? existing.label,
    stage_id: stage_id !== undefined ? stage_id : existing.stage_id,
    quantity: quantity !== undefined ? quantity : existing.quantity,
    unit_id: unit_id !== undefined ? unit_id : existing.unit_id,
    location: location ?? existing.location,
  };

  db.prepare(
    "UPDATE bins SET label=?, stage_id=?, quantity=?, unit_id=?, location=?, updated_at=datetime('now') WHERE id=?"
  ).run(updated.label, updated.stage_id, updated.quantity, updated.unit_id, updated.location, id);

  // Log history
  db.prepare('INSERT INTO bin_history (bin_id, stage_id, quantity, unit_id, note) VALUES (?, ?, ?, ?, ?)').run(
    id, updated.stage_id, updated.quantity, updated.unit_id, note
  );

  const bin = db.prepare('SELECT b.*, s.name as stage_name, s.color as stage_color, u.name as unit_name, u.abbreviation as unit_abbreviation FROM bins b LEFT JOIN stages s ON b.stage_id = s.id LEFT JOIN units u ON b.unit_id = u.id WHERE b.id = ?').get(id);

  req.io.emit('bin:updated', bin);
  res.json(bin);
});

// DELETE /api/bins/:id (archive)
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  const existing = db.prepare('SELECT * FROM bins WHERE id = ? AND archived = 0').get(id);
  if (!existing) return res.status(404).json({ error: 'Bin not found' });

  db.prepare("UPDATE bins SET archived=1, updated_at=datetime('now') WHERE id=?").run(id);
  db.prepare('INSERT INTO bin_history (bin_id, stage_id, quantity, unit_id, note) VALUES (?, ?, ?, ?, ?)').run(
    id, existing.stage_id, existing.quantity, existing.unit_id, 'Bin archived'
  );

  req.io.emit('bin:archived', { id: Number(id) });
  res.json({ ok: true });
});

export default router;
