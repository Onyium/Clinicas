// crear-doctor.js
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// ============================================================
// CONFIGURA AQUÍ EL USUARIO QUE QUIERES CREAR O ACTUALIZAR
// ============================================================
const USUARIO = 'dra.liseyda';
const NOMBRE = 'Dra. Liseyda Maye';
const PASSWORD_PLANO = 'medica2026'; // La contraseña en texto que usará para loguearse

async function procesarUsuario() {
  const pool = mysql.createPool(process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clinica365',
    port: process.env.DB_PORT || 3306
  });

  try {
    // 1. Generar hash seguro
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(PASSWORD_PLANO, saltRounds);

    // 2. Verificar si el usuario ya existe en tu tabla
    const [filas] = await pool.query('SELECT id FROM usuario WHERE usuario = ?', [USUARIO]);

    if (filas.length > 0) {
      // Si ya existe, actualizamos a contraseña cifrada
      await pool.query(
        'UPDATE usuario SET password = ?, nombre = ? WHERE usuario = ?',
        [passwordHash, NOMBRE, USUARIO]
      );
      console.log(`🔐 Contraseña cifrada exitosamente para el usuario: "${USUARIO}"`);
    } else {
      // Si no existe, creamos el nuevo registro
      const [resultado] = await pool.query(
        'INSERT INTO usuario (usuario, password, nombre) VALUES (?, ?, ?)',
        [USUARIO, passwordHash, NOMBRE]
      );
      console.log(`🎉 Doctor creado exitosamente con ID: ${resultado.insertId}`);
    }

    console.log(`Credenciales listas: Usuario: ${USUARIO} | Password: ${PASSWORD_PLANO}`);
  } catch (error) {
    console.error('❌ Error al procesar usuario:', error.message);
  } finally {
    await pool.end();
  }
}

procesarUsuario();