import { Router } from 'express';
import { pool } from '../db/connection';

const router = Router();

router.post('/redeem', async (req, res) => {
  const { code } = req.body;
  try {

    const { rows } = await pool.query('SELECT * FROM tickets WHERE code = $1', [code]);
    const ticket = rows[0];

    if (!ticket) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }
    if (ticket.status === 'used') {
      return res.status(400).json({ message: "Ticket ya redimido" });
    }

    await pool.query(
      'UPDATE tickets SET status = $1, redeemed_at = now() WHERE id = $2',
      ['used', ticket.id]
    );

    const { rows: updatedRows } = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticket.id]);
    const updatedTicket = updatedRows[0];

    res.json({ message: "Ticket redimido exitosamente", ticket: updatedTicket });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error interno al redimir ticket" });
  }
});

export default router;
