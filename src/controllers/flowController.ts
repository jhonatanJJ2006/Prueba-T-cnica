import { Request, Response } from 'express';
import { pool } from '../db/connection';

export const getFlowById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const flowResult = await pool.query('SELECT * FROM flows WHERE id = $1', [id]);
    const flow = flowResult.rows[0];

    if (!flow) {
      return res.status(404).json({ message: 'Flow not found' });
    }

    const stepsResult = await pool.query(
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
      ORDER BY fs.order_index
      `,
      [id]
    );

    flow.steps = stepsResult.rows.map(row => ({
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

    res.json(flow);
  } catch (error) {
    console.error('Error al obtener el Flow:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
