const express = require('express');
const router = express.Router();
const pool = require('../database/connection');

const verificarSesion = require('../middlewares/verificarSesion');
const { enviarCorreo } = require('../utils/mailer.js');

router.get('/carrito/contador', async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;
    const sesionId = req.sessionID;

    if (!usuarioId && !sesionId) return res.status(401).json({ error: 'No autorizado' });

    const [carritoRows] = await pool.query(
      usuarioId
        ? 'SELECT id FROM carritos WHERE usuario_id = ?'
        : 'SELECT id FROM carritos WHERE sesion_id = ?',
      [usuarioId || sesionId]
    );

    if (carritoRows.length === 0) return res.json({ total: 0 });

    const carritoId = carritoRows[0].id;

    const [rows] = await pool.query(
      'SELECT COUNT(*) AS total FROM carrito_items WHERE carrito_id = ?',
      [carritoId]
    );

    const total = rows[0].total || 0;
    res.json({ total });
  } catch (error) {
    console.error('Error en /api/carrito/contador:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/carrito', async (req, res) => {
  try {
    const usuarioId = req.session.usuario?.id;
    const sesionId = req.sessionID;

    let [carritoRows] = await pool.query(
      usuarioId
        ? 'SELECT * FROM carritos WHERE usuario_id = ?'
        : 'SELECT * FROM carritos WHERE sesion_id = ?',
      [usuarioId || sesionId]
    );
    console.log('🔍 Buscando carrito con:', usuarioId ? `usuario_id = ${usuarioId}` : `sesion_id = ${sesionId}`);
    console.log('🧺 Carrito encontrado:', carritoRows[0]);

    const carrito = carritoRows[0];
    if (!carrito) return res.json({ carrito_id: null, items: [] });

    const [items] = await pool.query(
      `SELECT 
         ci.id AS item_id,
         p.nombre,
         v.color,
         v.imagen_url,
         ci.cantidad,
         p.precio,
         p.precio_mayoreo,
         p.umbral_mayoreo
       FROM carrito_items ci
       JOIN variedades v ON ci.variedad_id = v.id
       JOIN productos p ON v.producto_id = p.id
       WHERE ci.carrito_id = ?`,
      [carrito.id]
    );

    res.json({ carrito_id: carrito.id, items });
  } catch (error) {
    console.error('Error en /api/carrito:', error.message);
    res.status(500).json({ error: 'Error interno del servidor', message: error.message });
  }
});


  router.post('/carrito', async (req, res) => {
    const { variedad_id, producto_id, cantidad } = req.body;
  
    if (!variedad_id || !producto_id || !cantidad) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }
  
    try {
      const usuario_id = req.session.usuario?.id || null;
      const sesion_id = usuario_id ? null : req.sessionID;
  
      // Buscar o crear carrito
      let carritoId;
      const [carritoExistente] = await pool.query(
        'SELECT id FROM carritos WHERE ' + 
        (usuario_id ? 'usuario_id = ?' : 'sesion_id = ?'),
        [usuario_id || sesion_id]
      );
  
      if (carritoExistente.length > 0) {
        carritoId = carritoExistente[0].id;
      } else {
        const [insertResult] = await pool.query(
          'INSERT INTO carritos (fecha_creacion, sesion_id, usuario_id) VALUES (NOW(), ?, ?)',
          [sesion_id, usuario_id]
        );
        carritoId = insertResult.insertId;
      }
  
      // Verificar si ya existe el item
      const [itemExistente] = await pool.query(
        'SELECT id FROM carrito_items WHERE carrito_id = ? AND variedad_id = ?',
        [carritoId, variedad_id]
      );
  
      if (itemExistente.length > 0) {
        await pool.query(
          'UPDATE carrito_items SET cantidad = cantidad + ? WHERE id = ?',
          [cantidad, itemExistente[0].id]
        );
      } else {
        await pool.query(
          'INSERT INTO carrito_items (carrito_id, variedad_id, cantidad) VALUES (?, ?, ?)',
          [carritoId, variedad_id, cantidad]
        );
      }
  
      res.json({ mensaje: 'Producto agregado al carrito' });
    } catch (error) {
      console.error('Error en POST /api/carrito:', error.message);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  router.put('/carrito', async (req, res) => {
    const { item_id, cantidad } = req.body;
  
    if (!item_id || cantidad == null) {
      return res.status(400).json({ error: 'Faltan datos' });
    }
  
    try {
      await pool.query(
        `UPDATE carrito_items SET cantidad = ? WHERE id = ?`,
        [cantidad, item_id]
      );
  
      res.json({ success: true });
    } catch (err) {
      console.error('Error al actualizar cantidad:', err);
      res.status(500).json({ error: 'Error al actualizar cantidad' });
    }
  });

router.delete('/carrito/:id', async (req, res) => {
  const item_id = req.params.id;

  try {
    await pool.query(`DELETE FROM carrito_items WHERE id = ?`, [item_id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar item del carrito:', err);
    res.status(500).json({ error: 'Error al eliminar item' });
  }
});

router.post('/checkout', verificarSesion, async (req, res) => {
    const usuarioId = req.session.usuario.id;
    const { direccion_id } = req.body;

    console.log('Usuario ID:', usuarioId);
    console.log('Dirección ID recibida:', direccion_id);
  
    if (!direccion_id) {
      return res.status(400).json({ error: 'Falta dirección' });
    }
  
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
  
      // Buscar carrito por usuario
      const [[carrito]] = await connection.query(
        `SELECT id FROM carritos WHERE usuario_id = ?`, [usuarioId]
      );
  
      console.log('Carrito:', carrito);

      if (!carrito) return res.status(404).json({ error: 'Carrito no encontrado' });
  
      const carrito_id = carrito.id;
  
      // Obtener items
      const [items] = await connection.query(
        `SELECT 
           ci.variedad_id,
           ci.cantidad,
           ci.es_mayoreo,
           p.precio,
           p.precio_mayoreo
         FROM carrito_items ci
         JOIN variedades v ON ci.variedad_id = v.id
         JOIN productos p ON v.producto_id = p.id
         WHERE ci.carrito_id = ?`, 
        [carrito_id]
      );
  
      console.log('Items:', items);

      if (items.length === 0) {
        return res.status(400).json({ error: 'Carrito vacío' });
      }
      
      // 🚀 Calcular el total
      let total = 0;
      for (const item of items) {
        const precio = item.es_mayoreo ? item.precio_mayoreo : item.precio;
        total += precio * item.cantidad;
      }
      
      // Insertar pedido
      const [pedidoResult] = await connection.query(
        `INSERT INTO pedidos (carrito_id, direccion_id, fecha) VALUES (?, ?, NOW())`,
        [carrito_id, direccion_id]
      );
  
      console.log('Resultado del pedido:', pedidoResult);

      const pedidoId = pedidoResult.insertId;

      // Insertar productos en pedido_items
      for (const item of items) {
        const precio_unitario = item.es_mayoreo ? item.precio_mayoreo : item.precio;
  
        await connection.query(
          `INSERT INTO pedido_items (pedido_id, variedad_id, cantidad, es_mayoreo, precio_unitario)
           VALUES (?, ?, ?, ?, ?)`,
          [pedidoId, item.variedad_id, item.cantidad, item.es_mayoreo, precio_unitario]
        );
      }

      // Limpiar carrito
      await connection.query(`DELETE FROM carrito_items WHERE carrito_id = ?`, [carrito_id]);
      
      await connection.commit();

      // Consultar productos
      const [productos] = await pool.query(`
        SELECT pi.cantidad, pi.precio_unitario, pi.es_mayoreo, v.color, v.imagen_url, pr.nombre
        FROM pedido_items pi
        INNER JOIN variedades v ON pi.variedad_id = v.id
        INNER JOIN productos pr ON v.producto_id = pr.id
        WHERE pi.pedido_id = ?
      `, [pedidoId]);

    // Consultar dirección
    const [direccion] = await pool.query(`
      SELECT direccion, ciudad, estado, codigo_postal
      FROM direcciones
      WHERE id = ?
    `, [direccion_id]);

    let totalCompra = 0;

    // Armar resumen de productos
    const resumenProductosHTML = productos.map(producto => {
      const precio = Number(producto.precio_unitario);
      const subtotal = precio * producto.cantidad;
      totalCompra += subtotal;

      return `
        <li>
        <strong>${producto.nombre}</strong> - Color: ${producto.color}<br>
        Cantidad: ${producto.cantidad} | Precio: $${precio.toFixed(2)} | Subtotal: $${subtotal.toFixed(2)}
        </li>
        `;
      }).join('');

      // Enviar correo de confirmación
      await enviarCorreo({
        to: req.session.usuario.correo,
        subject: '✅ ¡Confirmación de tu compra en Colores de Chiapas!',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #2E7D32;">¡Hola ${req.session.usuario.nombre_usuario}!</h1>
      
            <p>Gracias por tu compra en <strong>Colores de Chiapas</strong>. Estamos encantados de que hayas elegido nuestras artesanías hechas con amor y dedicación.</p>
      
            <h2>📦 Detalles de tu pedido:</h2>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Número de pedido:</strong> #${pedidoId}</li>
              <li><strong>Fecha de compra:</strong> ${new Date().toLocaleDateString('es-MX')}</li>
              <li><strong>Dirección de envío:</strong> ${direccion[0].direccion}, ${direccion[0].ciudad}, ${direccion[0].estado}, C.P. ${direccion[0].codigo_postal}</li>
              <li><strong>Método de envío:</strong> Envío estándar</li>
            </ul>
      
            <h2>📝 Resumen de tu compra:</h2>
            <ul style="list-style: none; padding: 0;">
              ${resumenProductosHTML}
            </ul>
            <p><strong>Total de la compra: $${totalCompra.toFixed(2)}</strong></p>

            <h2>🔍 Seguimiento:</h2>
            <p>Una vez que tu pedido sea despachado, recibirás otro correo con el número de seguimiento para rastrearlo.</p>
      
            <p>¿Tienes alguna duda? Estamos aquí para ayudarte:</p>
            <ul style="list-style: none; padding: 0;">
              <li>✉️ <a href="mailto:coloreschiapas@gmail.com">coloreschiapas@gmail.com</a></li>
              <li>📞 +52 961 123 4567</li>
            </ul>
      
            <p>¡Gracias por apoyar el trabajo artesanal! Cada pieza que adquieres lleva horas de dedicación y creatividad.</p>
      
            <p style="margin-top: 30px;">Con cariño,<br>El equipo de <strong>Colores de Chiapas</strong></p>
          </div>
        `
      });

      res.json({ success: true, pedido_id: pedidoResult.insertId });
    } catch (err) {
      console.error('Error en checkout:', err);
      res.status(500).json({ error: 'Error al finalizar compra', message: err.message });
    } finally {
      if (connection) connection.release();
    }
  });

module.exports = router;