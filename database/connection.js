const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '182820',
  database: process.env.DB_NAME || 'Colores BD',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  charset: 'utf8mb4',
  timezone: '+00:00',
  namedPlaceholders: true
});

// Verificación de conexión al iniciar (opcional pero útil)
pool.getConnection()
  .then(conn => {
    console.log('✅ Conexión a MySQL establecida');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error al conectar a MySQL:', err.message);
  });

module.exports = pool;