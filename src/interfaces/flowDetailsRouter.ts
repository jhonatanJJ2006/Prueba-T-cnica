import express from 'express';
import { getFlowById } from '../controllers/flowController';

const router = express.Router();

router.get('/:id', getFlowById);

export default router;
