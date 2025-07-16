import express from 'express';
import { pool } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM flows ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener Flows' });
  }
});

router.post('/', async (req, res) => {
  const { name, status, end_date } = req.body;

  try {
    const id = uuidv4();
    console.log(id);
    await pool.query(
      'INSERT INTO flows (id, name, status, end_date) VALUES ($1, $2, $3, $4)',
      [id, name, status ?? 'active', end_date]
    );
    res.status(201).json({ id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear Flow' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Si tienes ON DELETE CASCADE en la base, esto es suficiente:
    await pool.query('DELETE FROM flows WHERE id = $1', [id]);
    res.status(200).json({ message: 'Flow eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el Flow' });
  }
});

export default router;
