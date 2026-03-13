import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/units
router.get('/', (req, res) => {
  const units = db.prepare('SELECT * FROM units ORDER BY name').all();
  res.json(units);
});

// POST /api/units
router.post('/', (req, res) => {
  const { name, abbreviation } = req.body;
  if (!name || !abbreviation) return res.status(400).json({ error: 'name and abbreviation are required' });

  const result = db.prepare('INSERT INTO units (name, abbreviation) VALUES (?, ?)').run(name, abbreviation);
  const unit = db.prepare('SELECT * FROM units WHERE id = ?').get(result.lastInsertRowid);

  req.io.emit('unit:created', unit);
  res.status(201).json(unit);
});

// PATCH /api/units/:id
router.patch('/:id', (req, res) => {
  const { name, abbreviation } = req.body;
  const id = req.params.id;

  const existing = db.prepare('SELECT * FROM units WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Unit not found' });

  db.prepare('UPDATE units SET name=?, abbreviation=? WHERE id=?').run(
    name ?? existing.name,
    abbreviation ?? existing.abbreviation,
    id
  );

  const unit = db.prepare('SELECT * FROM units WHERE id = ?').get(id);
  req.io.emit('unit:updated', unit);
  res.json(unit);
});

// DELETE /api/units/:id
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  const existing = db.prepare('SELECT * FROM units WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Unit not found' });

  db.prepare('UPDATE bins SET unit_id=NULL WHERE unit_id=?').run(id);
  db.prepare('UPDATE bin_history SET unit_id=NULL WHERE unit_id=?').run(id);
  db.prepare('DELETE FROM units WHERE id=?').run(id);
  req.io.emit('unit:deleted', { id: Number(id) });
  res.json({ ok: true });
});

export default router;
