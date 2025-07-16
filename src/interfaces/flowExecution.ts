import express from 'express';
import { pool } from '../db/connection';

const router = express.Router();

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

router.post('/:flowId/execute', async (req, res) => {
  const { flowId } = req.params;

  try {
    const { rows: steps } = await pool.query(
      'SELECT type, order_index, config FROM flow_steps WHERE flow_id = $1 ORDER BY order_index ASC',
      [flowId]
    );

    if (steps.length === 0) {
      return res.status(404).json({ message: 'No hay pasos para este Flow' });
    }

    console.log(`➡️ Iniciando ejecución del Flow [${flowId}] con ${steps.length} pasos`);

    for (const step of steps) {
      console.log(`➡️ Ejecutando paso [${step.type}] (orden ${step.order_index})`);

      switch (step.type) {
        case 'delay':
          const delay = step.config.duration || 1000;
          console.log(`⏱️ Esperando ${delay} ms`);
          await sleep(delay);
          break;

        case 'popup_text':
          console.log(`📢 Popup: ${step.config.title} - ${step.config.description}`);
          break;

        case 'email':
          console.log(`✉️ Enviando email simulado a: ${step.config.to}`);
          break;

        case 'popup_form':
          console.log(`📝 Mostrando formulario con campos definidos`);
          break;

        case 'popup_coupon':
          console.log(`🏷️ Mostrando cupón: ${step.config.couponCode || 'XXXX-XXXX'}`);
          break;

        case 'ticket':
          console.log(`🎟️ Mostrando paso para comprar ticket`);
          break;

        default:
          console.log(`⚠️ Paso desconocido: ${step.type}`);
      }

      console.log('---');
    }

    console.log(`✅ Finalizado Flow ${flowId}`);
    res.json({ message: 'Ejecución simulada completa', steps_executed: steps.length });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al ejecutar Flow' });
  }
});

export default router;