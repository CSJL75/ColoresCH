require('dotenv').config();
const express = require('express');
const session = require('express-session');
const app = express();
const pool = require('./database/connection');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');

// Configura CORS PRIMERO
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  exposedHeaders: ['set-cookie']
}));

// Sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  name: 'node.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    domain: 'localhost',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 día
  }
}));

// Middleware de seguridad
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

const carritoRoutes = require('./routes/carrito.routes');
const pedidoRoutes = require('./routes/pedido.routes');
app.use('/api', carritoRoutes);
app.use('/api', pedidoRoutes);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/partials', express.static(path.join(__dirname, 'public/partials')));

// --- Middleware de verificación de sesión
function verificarSesion(req, res, next) {
  if (req.session && req.session.usuario) {
    return next(); // Si hay sesión, continúa
  } else {
    return res.status(401).json({ mensaje: 'No autorizado' }); // Si no hay sesión, bloquea acceso
  }
}
// --- RUTAS API PARA FRONTEND --
app.get('/api/usuario', (req, res) => {
  console.log('✅ Ruta /api/usuario alcanzada'); // 👈 Nuevo log
  console.log('Cookies recibidas:', req.headers.cookie);
  console.log('Sesión:', req.session);
  
  if (req.session.usuario) {
    res.json({ usuario: req.session.usuario });
  } else {
    res.status(401).json({ error: 'No autenticado' });
  }
});

app.get('/sesion.html', (req, res) => {
  if (req.session.usuario) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public/sesion.html'));
});

// Registro (/api/registro)
const { enviarCorreo } = require('./utils/mailer.js');

app.post('/api/registro', async (req, res) => {
  const { nombre_usuario, correo, contrasena } = req.body;

  if (!nombre_usuario || !correo || !contrasena) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(contrasena, saltRounds);

    await pool.query(`
      INSERT INTO usuarios (nombre_usuario, correo, contrasena)
      VALUES (?, ?, ?)`, [nombre_usuario, correo, hash]);

    // 📧 Enviar correo de bienvenida
    await enviarCorreo({
      to: correo,
      subject: '¡Bienvenido a Colores de Chiapas!',
      html: `
        <h1>Hola, ${nombre_usuario}</h1>
        <p>Gracias por registrarte en nuestra plataforma de artesanías.</p>
        <p>¡Estamos encantados de que te unas a nuestra comunidad!</p>
        <p>Saludos,<br>El equipo de Artesanías MX</p>
      `
    });

    // Respuesta de éxito
    res.status(201).json({ success: true, message: 'Usuario registrado correctamente' });
  } catch (err) {
    console.error('Error al registrar usuario:', err.message);
    res.status(500).json({ error: 'Error al registrar usuario', message: err.message });
  }
});


//Login (/api/login)
app.post('/api/login', async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const [usuarios] = await pool.query(
      'SELECT * FROM usuarios WHERE correo = ?', [correo]);
      
    const usuario = usuarios[0];
    if (!usuario) return res.status(401).json({ error: 'Usuario no encontrado' });

    const coincide = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!coincide) return res.status(401).json({ error: 'Contraseña incorrecta' });
    
    // 💾 Guarda usuario en la sesión
    req.session.usuario = {
      id: usuario.id,
      nombre_usuario: usuario.nombre_usuario,
      correo: usuario.correo
    };
    console.log('Sesión después de login:', req.session);

    // Asociar el carrito existente con el usuario que acaba de iniciar sesión
    await pool.query(`
    UPDATE carritos
    SET usuario_id = ?
    WHERE sesion_id = ? AND usuario_id IS NULL
  `, [usuario.id, req.sessionID]);

    res.json({ success: true, usuario: req.session.usuario });
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar sesión', message: err.message });
  }
});

// Direcciones por usuario (/api/direcciones)
app.post('/api/direcciones', async (req, res) => {
  const usuario = req.session.usuario;
  if (!usuario) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const { direccion, ciudad, estado, codigo_postal } = req.body;
  console.log("Body recibido:", req.body);
  try {
    await pool.query(
      'INSERT INTO direcciones (usuario_id, direccion, ciudad, estado, codigo_postal) VALUES (?, ?, ?, ?, ?)',
      [usuario.id, direccion, ciudad, estado, codigo_postal]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error al guardar dirección:", error);
    res.status(500).json({ success: false });
  }
});

app.get('/api/direcciones/:usuario_id', async (req, res) => {
  try {
    const [direcciones] = await pool.query('SELECT * FROM direcciones WHERE usuario_id = ?', [req.params.usuario_id]);
    res.json(direcciones);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener direcciones' });
  }
});

app.delete('/api/direcciones/:id', async (req, res) => {
  const usuario = req.session.usuario;
  if (!usuario) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const [result] = await pool.query(
      'DELETE FROM direcciones WHERE id = ? AND usuario_id = ?',
      [req.params.id, usuario.id]
    );
    res.json({ success: result.affectedRows > 0 });
  } catch (error) {
    console.error("Error al eliminar dirección:", error);
    res.status(500).json({ success: false });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ mensaje: 'Error al cerrar sesión' });
    res.json({ mensaje: 'Sesión cerrada' });
  });
});

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