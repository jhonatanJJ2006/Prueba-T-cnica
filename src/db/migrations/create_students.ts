import { pool } from '../connection';

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        age INTEGER NOT NULL,
        average DOUBLE PRECISION NOT NULL,
        state BOOLEAN NOT NULL
      );
    `);

    console.log('✅ Tabla "students" creada correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando la tabla:', error);
    process.exit(1);
  }
})();
