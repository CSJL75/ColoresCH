require('dotenv').config();
const express = require('express');
const pool = require('./database/connection');

const app = express();
app.use(express.json());

// Ruta para la página principal
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Asegúrate de tener esto para servir archivos estáticos
app.use(express.static('public'));

// Middleware básico de seguridad
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Health Check
app.get('/api/ping', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ message: '¡API de ColoresCH funcionando!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener todos los productos con sus variedades
app.get('/api/productos', async (req, res) => {
  try {
    const { categoria } = req.query;
    let query = `
      SELECT 
        p.id, p.nombre, p.descripcion, p.precio,
        p.precio_mayoreo, p.umbral_mayoreo, p.cantidad_disponible,
        v.id as variedad_id, v.color, v.codigo_hex, v.imagen_url
      FROM productos p
      JOIN variedades v ON p.id = v.producto_id
    `;
    
    if (categoria) {
      query += ` WHERE p.categoria_id = ${pool.escape(categoria)}`;
    }

    const [productos] = await pool.query(query);
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener detalles de un producto específico
app.get('/api/productos/:id', async (req, res) => {
  try {
    const [producto] = await pool.query('SELECT * FROM productos WHERE id = ?', [req.params.id]);
    
    if (!producto.length) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const [variedades] = await pool.query(
      'SELECT * FROM variedades WHERE producto_id = ?', 
      [req.params.id]
    );

    res.json({ ...producto[0], variedades });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manejo de carrito simplificado
app.post('/api/carrito', async (req, res) => {
  const { sesion_id, variedad_id, cantidad } = req.body;
  
  try {
    // 1. Buscar o crear carrito
    let [carrito] = await pool.query(
      'SELECT id FROM carritos WHERE sesion_id = ?', 
      [sesion_id]
    );

    if (!carrito.length) {
      [carrito] = await pool.query(
        'INSERT INTO carritos (sesion_id) VALUES (?)',
        [sesion_id]
      );
    }

    const carritoId = carrito[0]?.id || carrito.insertId;

    // 2. Añadir item al carrito
    await pool.query(
      `INSERT INTO carrito_items 
       (carrito_id, variedad_id, cantidad) 
       VALUES (?, ?, ?)`,
      [carritoId, variedad_id, cantidad]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manejo centralizado de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
});