import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import flowsRouter from './interfaces/flows';
import flowStepsRouter from './interfaces/flowSteps';
import flowExecutionRouter from './interfaces/flowExecution';
import flowDetailsRouter from './interfaces/flowDetailsRouter';
import couponsRouter from './interfaces/couponsRoter';
import ticketsRouter from './interfaces/ticketsRouter';
import { motorRouter } from './interfaces/motorController';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/flows', flowsRouter);
app.use('/api/flow-steps', flowStepsRouter);
app.use('/api/flow-execution', flowExecutionRouter);
app.use('/api/flow-details', flowDetailsRouter);
app.use('/api/flow-details', flowStepsRouter);

app.use('/api/coupons', couponsRouter);
app.use('/api/tickets', ticketsRouter);

app.use('/api/flow-execution', motorRouter);

app.get('/', (_req, res) => {
  res.send('Backend CondorSoft funcionando');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
