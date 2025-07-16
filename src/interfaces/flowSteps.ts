import express from 'express';
import { pool } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

const router = express.Router();

router.get('/:flowId/steps', async (req, res) => {
  const { flowId } = req.params;

  try {
    const { rows } = await pool.query(
      `
      SELECT
        fs.id as step_id,
        fs.type,
        fs.order_index,
        fs.config,
        c.id as coupon_id,
        c.code as coupon_code,
        c.type as coupon_type,
        c.value as coupon_value,
        c.qr_code_url as coupon_qr_code_url
      FROM flow_steps fs
      LEFT JOIN coupons c ON c.step_id = fs.id
      WHERE fs.flow_id = $1
      ORDER BY fs.order_index ASC
      `,
      [flowId]
    );

    const steps = rows.map(row => ({
      id: row.step_id,
      type: row.type,
      order_index: row.order_index,
      config: row.config,
      coupon: row.coupon_id
        ? {
          id: row.coupon_id,
          code: row.coupon_code,
          type: row.coupon_type,
          value: row.coupon_value,
          qr_code_url: row.coupon_qr_code_url
        }
        : null
    }));

    res.json(steps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los steps del Flow' });
  }
});

router.post('/:flowId/steps', async (req, res) => {
  const { flowId } = req.params;
  const { steps } = req.body;

  const createdSteps = [];

  try {
    for (const step of steps) {
      const stepId = uuidv4();

      await pool.query(
        'INSERT INTO flow_steps (id, flow_id, type, order_index, config) VALUES ($1, $2, $3, $4, $5)',
        [stepId, flowId, step.type, step.order_index, JSON.stringify(step.config)]
      );

      let couponData = null;
      let ticketData = null;

      if (step.type === "popup_coupon") {
        const couponId = uuidv4();
        const code = couponId;
        const qrValue = `https://tusitio.com/redeem?code=${code}`;
        const qrCodeUrl = await QRCode.toDataURL(qrValue);

        let value = null;
        let type = "fixed";

        if (step.config?.benefitType === "fixed") {
          value = Number(step.config.fixedAmount) || 0;
          type = "fixed";
        }
        if (step.config?.benefitType === "percent") {
          value = Number(step.config.percentAmount) || 0;
          type = "percent";
        }
        if (step.config?.benefitType === "free_product") {
          value = step.config.freeProducts || null;
          type = "free_product";
        }

        await pool.query(
          `INSERT INTO coupons (id, step_id, code, type, value, qr_code_url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            couponId,
            stepId,
            code,
            type,
            value,
            qrCodeUrl
          ]
        );

        couponData = {
          id: couponId,
          code,
          type,
          value,
          qr_code_url: qrCodeUrl
        };
      }

      if (step.type === "ticket" || step.type === "popup_ticket") {
        const ticketId = uuidv4();
        const code = ticketId;
        const qrValue = `https://tusitio.com/redeem-ticket?code=${code}`;
        const qrCodeUrl = await QRCode.toDataURL(qrValue);

        await pool.query(
          `INSERT INTO tickets (id, step_id, code, status, qr_code_url)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            ticketId,
            stepId,
            code,
            'unused',
            qrCodeUrl
          ]
        );

        ticketData = {
          id: ticketId,
          code,
          status: 'unused',
          qr_code_url: qrCodeUrl
        };
      }

      createdSteps.push({
        id: stepId,
        type: step.type,
        order_index: step.order_index,
        config: step.config,
        coupon: couponData,
        ticket: ticketData
      });
    }

    res.status(201).json({
      message: 'Steps (cupones/tickets si aplica) creados',
      steps: createdSteps
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear Steps' });
  }
});

router.put('/:flowId/reorder', async (req, res) => {
  const { flowId } = req.params;
  const { steps } = req.body;

  if (!Array.isArray(steps)) {
    return res.status(400).json({ error: 'Missing steps' });
  }

  try {
    const updatePromises = steps.map((step: any) =>
      pool.query(
        'UPDATE flow_steps SET order_index = $1 WHERE id = $2 AND flow_id = $3',
        [step.order_index, step.id, flowId]
      )
    );
    await Promise.all(updatePromises);
    res.json({ message: 'Steps reordered' });
  } catch (err) {
    console.error('Error updating steps order:', err);
    res.status(500).json({ error: 'Error updating order' });
  }
});

router.put('/:flowId/steps/:stepId', async (req, res) => {

  const { flowId, stepId } = req.params;
  const { config } = req.body;

  try {
    await pool.query(
      'UPDATE flow_steps SET config = $1 WHERE id = $2 AND flow_id = $3',
      [config, stepId, flowId]
    );
    res.status(200).json({ message: 'Step actualizado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el Step' });
  }
});

router.delete('/:flowId/steps', async (req, res) => {
  const { flowId } = req.params;

  try {
    await pool.query(
      'DELETE FROM flow_steps WHERE id = $1',
      [flowId]
    );
    res.json({ message: 'All steps deleted' });
  } catch (err) {
    console.error('Error deleting all steps:', err);
    res.status(500).json({ error: 'Error deleting steps' });
  }
});

router.post('/', async (req, res) => {
  const { code, redeemed_by } = req.body;

  try {
    const { rows } = await pool.query(
      'SELECT * FROM coupons WHERE code = $1',
      [code]
    );
    const coupon = rows[0];

    if (!coupon) {
      return res.status(404).json({ message: 'Cupón no encontrado' });
    }
    if (coupon.redeemed_at && coupon.is_redeemed) {
      return res.status(400).json({ message: 'Cupón ya fue redimido', redeemed_at: coupon.redeemed_at });
    }

    const redeemedAt = new Date();
    await pool.query(
      'UPDATE coupons SET redeemed_at = $1, redeemed_by = $2, is_redeemed = $3 WHERE id = $4',
      [redeemedAt, redeemed_by || null, true, coupon.id]
    );

    return res.json({
      message: 'Cupón redimido exitosamente',
      coupon: {
        ...coupon,
        redeemed_at: redeemedAt,
        redeemed_by: redeemed_by || null
      }
    });
  } catch (error) {
    console.error('Error al redimir cupón:', error);
    res.status(500).json({ message: 'Error interno al redimir cupón' });
  }
});

export default router;