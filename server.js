require('dotenv').config();
const express = require('express');
const pool = require('./database/connection');
const path = require('path');
const cors = require('cors');

const app = express();

// Middlewares esenciales
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Ruta absoluta para archivos estáticos

// Middleware de seguridad
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// --- RUTAS API PARA FRONTEND ---

// Endpoint para obtener categorías (necesario para filtros)
app.get('/api/categorias', async (req, res) => {
  try {
    const [categorias] = await pool.query('SELECT * FROM categorias');
    res.json(categorias);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para obtener artesanos (necesario para filtros)
app.get('/api/artesanos', async (req, res) => {
  try {
    const [artesanos] = await pool.query('SELECT id, nombre FROM artesanos');
    res.json(artesanos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint optimizado para obtener productos
app.get('/api/productos', async (req, res) => {
  try {
    // Consulta base mejorada
    let baseQuery = `
      SELECT 
        p.id, p.nombre, p.descripcion, p.precio,
        p.precio_mayoreo, p.umbral_mayoreo,
        p.cantidad_disponible,
        c.nombre as categoria_nombre,
        a.nombre as artesano_nombre,
        v.id as variedad_id, v.color, v.codigo_hex, v.imagen_url
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN artesanos a ON p.artesano_id = a.id
      LEFT JOIN variedades v ON p.id = v.producto_id
    `;

    // Construcción dinámica de WHERE
    const whereClauses = [];
    const params = [];

    if (req.query.categoria) {
      whereClauses.push('p.categoria_id IN (?)');
      params.push(req.query.categoria.split(','));
    }

    if (req.query.artesano) {
      whereClauses.push('p.artesano_id IN (?)');
      params.push(req.query.artesano.split(','));
    }

    if (req.query.precio_max) {
      whereClauses.push('p.precio <= ?');
      params.push(parseFloat(req.query.precio_max));
    }

    if (req.query.color) {
      whereClauses.push('v.codigo_hex IN (?)');
      params.push(req.query.color.split(','));
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const query = `${baseQuery} ${where} ORDER BY p.nombre`;

    const [productos] = await pool.query(query, params.flat());

    // Agrupar productos con sus variedades
    const productosMap = new Map();
    
    productos.forEach(row => {
      if (!productosMap.has(row.id)) {
        productosMap.set(row.id, {
          id: row.id,
          nombre: row.nombre,
          descripcion: row.descripcion,
          precio: row.precio,
          precio_mayoreo: row.precio_mayoreo,
          umbral_mayoreo: row.umbral_mayoreo,
          cantidad_disponible: row.cantidad_disponible,
          categoria: row.categoria_nombre,
          artesano: row.artesano_nombre,
          variedades: []
        });
      }

      if (row.variedad_id) {
        productosMap.get(row.id).variedades.push({
          id: row.variedad_id,
          color: row.color,
          codigo_hex: row.codigo_hex,
          imagen_url: row.imagen_url
        });
      }
    });

    res.json([...productosMap.values()]);
    
  } catch (err) {
    console.error('Error en /api/productos:', err);
    res.status(500).json({ 
      error: err.message,
      sqlMessage: err.sqlMessage 
    });
  }
});

// Obtener detalles de un producto - Versión optimizada
app.get('/api/productos/:id', async (req, res) => {
  try {
    const [productoResult] = await pool.query(`
      SELECT p.id, p.nombre, p.descripcion, p.precio, p.precio_mayoreo, p.umbral_mayoreo, 
             p.cantidad_disponible,
             c.nombre AS categoria, 
             a.nombre AS artesano, 
             a.biografia AS artesano_biografia 
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN artesanos a ON p.artesano_id = a.id
      WHERE p.id = ?`, 
      [req.params.id]
    );

    if (!productoResult.length) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const producto = productoResult[0];

    const [variedades] = await pool.query(`
      SELECT id, color, codigo_hex, imagen_url 
      FROM variedades 
      WHERE producto_id = ?`, 
      [req.params.id]
    );

    res.json({ 
      ...producto,
      precio: producto.precio ? parseFloat(producto.precio) : null,
      precio_mayoreo: producto.precio_mayoreo ? parseFloat(producto.precio_mayoreo) : null,
      variedades: variedades || [] 
    });
  } catch (err) {
    console.error('Error en /api/productos/:id:', err); // 👈 LOG IMPORTANTE
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para productos destacados
// Endpoint para productos destacados
app.get('/api/productos/destacados', async (req, res) => {
  try {
    const [productos] = await pool.query(`  // Cambié connection.query por pool.query
      SELECT 
        p.id, p.nombre, p.descripcion, p.categoria, p.precio, 
        v.imagen_url, v.color_hex 
      FROM productos p
      JOIN variedades v ON p.id = v.producto_id
      GROUP BY p.id
      ORDER BY RAND()
      LIMIT 5
    `);

    res.json(productos);
  } catch (err) {
    console.error('Error al obtener productos destacados:', err);
    res.status(500).json({ error: 'Error al obtener productos destacados' });
  }
});


// Manejo del carrito - Versión mejorada
app.post('/api/carrito', async (req, res) => {
  const { sesion_id, variedad_id, cantidad } = req.body;
  
  if (!sesion_id || !variedad_id || !cantidad) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    
    // 1. Buscar o crear carrito en una sola consulta
    const [carrito] = await connection.query(
      `INSERT INTO carritos (sesion_id) 
       VALUES (?) 
       ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      [sesion_id]
    );

    const carritoId = carrito.insertId;

    // 2. Añadir item al carrito
    await connection.query(
      `INSERT INTO carrito_items 
       (carrito_id, variedad_id, cantidad) 
       VALUES (?, ?, ?)`,
      [carritoId, variedad_id, cantidad]
    );

    res.json({ success: true, carritoId });
  } catch (err) {
    console.error('Error en /api/carrito:', err);
    res.status(500).json({ 
      error: err.message,
      sqlMessage: err.sqlMessage 
    });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta para páginas - Versión mejorada
const allowedPages = ['', 'tienda', 'producto', 'carrito', 'quienes-somos', 'mayoreo'];
app.get(['/', ...allowedPages.map(page => `/${page}`), '/producto/:id'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de errores centralizado
app.use((err, req, res, next) => {
  console.error('Error global:', err.stack);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
  console.log(`📌 Ruta de productos: http://localhost:${PORT}/api/productos`);
});