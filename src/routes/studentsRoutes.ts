import express from 'express';
import { createStudents, getStudents, getStudentById, updateStudent, deleteStudent } from '../controllers/studentController';

const router = express.Router();

router.get('/', getStudents);
router.get('/students/:id', getStudentById);

router.post('/', createStudents);

router.put('/students/:id', updateStudent);

router.delete('/students/:id', deleteStudent);

export default router;