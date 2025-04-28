const express = require('express');
const router = express.Router();
const pool = require('../database/connection');

// Middleware para proteger la ruta (si quieres)
const verificarSesion = require('../middlewares/verificarSesion');

// Obtener todos los pedidos del usuario
router.get('/pedidos', verificarSesion, async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;

    // Traer todos los pedidos del usuario
    const [pedidos] = await pool.query(`
        SELECT p.id, p.fecha 
        FROM pedidos p
        INNER JOIN carritos c ON p.carrito_id = c.id
        WHERE c.usuario_id = ?
        ORDER BY p.fecha DESC
      `, [usuarioId]);
      
      // 👉 Formatear la fecha de cada pedido:
      const pedidosFormateados = pedidos.map(pedido => ({
        ...pedido,
        fecha: new Date(pedido.fecha).toLocaleDateString('es-MX', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      }));
      
    res.json(pedidosFormateados);
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// Obtener detalles de un pedido específico
router.get('/pedidos/:pedidoId', verificarSesion, async (req, res) => {
  try {
    const pedidoId = req.params.pedidoId;
    const usuarioId = req.session.usuario.id; // 👈 Para seguridad

    // Verificar que el pedido le pertenezca al usuario
    const [verificar] = await pool.query(`
      SELECT p.id 
      FROM pedidos p
      INNER JOIN carritos c ON p.carrito_id = c.id
      WHERE p.id = ? AND c.usuario_id = ?
    `, [pedidoId, usuarioId]);

    if (verificar.length === 0) {
      return res.status(403).json({ error: 'Pedido no encontrado o no autorizado' });
    }

    // Obtener productos del pedido
    const [productos] = await pool.query(`
        SELECT pi.cantidad, pi.precio_unitario, pi.es_mayoreo, v.color, v.imagen_url, pr.nombre
        FROM pedido_items pi
        INNER JOIN variedades v ON pi.variedad_id = v.id
        INNER JOIN productos pr ON v.producto_id = pr.id
        WHERE pi.pedido_id = ?
      `, [pedidoId]);
      

    // Obtener dirección de envío Y fecha
    const [datosPedido] = await pool.query(`
        SELECT d.direccion, d.ciudad, d.estado, d.codigo_postal, p.fecha
        FROM pedidos p
        INNER JOIN direcciones d ON p.direccion_id = d.id
        WHERE p.id = ?
      `, [pedidoId]);
  
      // Armar el objeto completo
      const pedidoDetalle = {
        productos,
        direccion: {
          direccion: datosPedido[0].direccion,
          ciudad: datosPedido[0].ciudad,
          estado: datosPedido[0].estado,
          codigo_postal: datosPedido[0].codigo_postal,
        },
        fecha: new Date(datosPedido[0].fecha).toLocaleDateString('es-MX'), // Aquí formateamos la fecha
      };
  
      res.json(pedidoDetalle);
  
    } catch (error) {
      console.error('Error al obtener detalles del pedido:', error);
      res.status(500).json({ error: 'Error al obtener detalles del pedido' });
    }
  });

module.exports = router;
