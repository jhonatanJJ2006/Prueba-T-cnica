import { Router } from 'express';
import { pool } from '../db/connection';

const router = Router();

router.post('/redeem', async (req, res) => {
  const { code } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM coupons WHERE code = $1', [code]);
    const coupon = rows[0];
    if (!coupon) return res.status(404).json({ message: "Cupón no encontrado" });
    if (coupon.is_redeemed) return res.status(400).json({ message: "Cupón ya redimido" });

    await pool.query(
      'UPDATE coupons SET is_redeemed = true, redeemed_at = now() WHERE id = $1',
      [coupon.id]
    );

    res.json({ message: "Cupón redimido exitosamente", coupon: { ...coupon, is_redeemed: true, redeemed_at: new Date() } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error interno al redimir cupón" });
  }
});

export default router;
