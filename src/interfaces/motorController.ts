import express from 'express';
import { pool } from '../db/connection';

export const motorRouter = express.Router();

async function sendEmail(userIdOrEmail: string, config: any) {
  console.log(`Email a ${userIdOrEmail}:`, config);
  return true;
}

function canStepAdvance(type: string) {
  return [
    "popup_form",
    "popup_coupon",
    "ticket",
    "redemption",
    "show_redemption",
    "send_email",
    "expiration",
    "show_expiration"
  ].includes(type);
}

export async function processCurrentStep(executionId: string, userInput?: any) {
  const { rows: execRows } = await pool.query('SELECT * FROM flow_executions WHERE id = $1', [executionId]);
  const exec = execRows[0];
  if (!exec) throw new Error("Execution not found");

  const { rows: stepsRows } = await pool.query(
    'SELECT * FROM flow_steps WHERE flow_id = $1 ORDER BY order_index',
    [exec.flow_id]
  );
  const steps = stepsRows;
  const step = steps[exec.current_step_index];
  if (!step) return { action: "end" };

  console.log(`\n---\n[processCurrentStep] INDEX: ${exec.current_step_index} TYPE: "${step.type}"\n---`);

  switch (step.type) {
    case "popup_form":
      console.log("Step: popup_form (mostrar formulario)");
      return { action: "show_form", data: step.config };

    case "email":
      console.log("Step: email (enviando email y avanzando)");
      await sendEmail(exec.user_id, step.config);
      await pool.query(
        'UPDATE flow_executions SET current_step_index = current_step_index + 1, updated_at = NOW() WHERE id = $1',
        [executionId]
      );

      return await processCurrentStep(executionId);

    case "ticket":
      console.log("Step: ticket (mostrar ticket)");
      return { action: "show_ticket", data: { code: "TICKET456", qr_url: "https://example.com/qr/ticket" } };

    case "popup_coupon":
      console.log("Step: popup_coupon (mostrar cupón)");
      return { action: "show_coupon", data: { code: "CUPON123", qr_url: "https://example.com/qr/cupon" } };

    case "redemption":
    case "show_redemption":
      console.log("Step: redemption (mostrar redención)");
      return { action: "show_redemption", data: { message: "Redime tu cupón con el staff" } };

    case "expiration":
    case "show_expiration":
      console.log("Step: expiration (mostrar expiración)");
      return { action: "show_expiration" };

    default:
      // Log si algún type no está en el switch
      console.log(`⛔️ Step desconocido: "${step.type}" -> Avanzando automáticamente`);
      await pool.query(
        'UPDATE flow_executions SET current_step_index = current_step_index + 1, updated_at = NOW() WHERE id = $1',
        [executionId]
      );
      return await processCurrentStep(executionId);
  }
}

motorRouter.post('/start', async (req, res) => {
  const { flowId, userId } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO flow_executions (id, flow_id, user_id, current_step_index, state, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, 0, $3, NOW(), NOW()) RETURNING id',
      [flowId, userId, 'running']
    );
    const executionId = rows[0].id;
    const result = await processCurrentStep(executionId);
    res.json({ executionId, ...result });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ message: e.message || "Error iniciando ejecución del flow" });
  }
});

motorRouter.post('/next', async (req, res) => {
  const { executionId, userInput } = req.body;
  try {
    const { rows: execRows } = await pool.query('SELECT * FROM flow_executions WHERE id = $1', [executionId]);
    const exec = execRows[0];
    const { rows: stepsRows } = await pool.query('SELECT * FROM flow_steps WHERE flow_id = $1 ORDER BY order_index', [exec.flow_id]);
    const steps = stepsRows;
    const step = steps[exec.current_step_index];

    console.log(`\n[POST /next] current_step_index: ${exec.current_step_index}, type: "${step?.type}"`);

    if (step?.type === "popup_form" && userInput) {
      console.log("Guardando respuesta de formulario");
      await pool.query(
        'INSERT INTO form_responses (execution_id, step_id, response, created_at) VALUES ($1, $2, $3, NOW())',
        [executionId, step.id, JSON.stringify(userInput)]
      );
    }

    if (canStepAdvance(step?.type)) {
      console.log("Puede avanzar este tipo, sumando +1");
      await pool.query(
        'UPDATE flow_executions SET current_step_index = current_step_index + 1, updated_at = NOW() WHERE id = $1',
        [executionId]
      );
    }

    const result = await processCurrentStep(executionId);
    res.json(result);

  } catch (e: any) {
    console.error(e);
    res.status(500).json({ message: e.message || "Error avanzando el flow" });
  }
});
