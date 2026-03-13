import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/stages
router.get('/', (req, res) => {
  const stages = db.prepare('SELECT * FROM stages ORDER BY sort_order, id').all();
  res.json(stages);
});

// POST /api/stages
router.post('/', (req, res) => {
  const { name, color = '#6366f1' } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM stages').get().m ?? -1;
  const result = db.prepare('INSERT INTO stages (name, color, sort_order) VALUES (?, ?, ?)').run(name, color, maxOrder + 1);
  const stage = db.prepare('SELECT * FROM stages WHERE id = ?').get(result.lastInsertRowid);

  req.io.emit('stage:created', stage);
  res.status(201).json(stage);
});

// PATCH /api/stages/:id
router.patch('/:id', (req, res) => {
  const { name, color, sort_order } = req.body;
  const id = req.params.id;

  const existing = db.prepare('SELECT * FROM stages WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Stage not found' });

  db.prepare('UPDATE stages SET name=?, color=?, sort_order=? WHERE id=?').run(
    name ?? existing.name,
    color ?? existing.color,
    sort_order ?? existing.sort_order,
    id
  );

  const stage = db.prepare('SELECT * FROM stages WHERE id = ?').get(id);
  req.io.emit('stage:updated', stage);
  res.json(stage);
});

// DELETE /api/stages/:id
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  const existing = db.prepare('SELECT * FROM stages WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Stage not found' });

  db.prepare('UPDATE bins SET stage_id=NULL WHERE stage_id=?').run(id);
  db.prepare('DELETE FROM stages WHERE id=?').run(id);

  req.io.emit('stage:deleted', { id: Number(id) });
  res.json({ ok: true });
});

export default router;
