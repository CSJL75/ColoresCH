console.log('Pedidos.js cargado correctamente');

const contenedorPedidos = document.querySelector('.contenedor-pedidos');
const contenedorMensaje = document.querySelector('.mensaje-sin-pedidos');
const contenedorDetalles = document.querySelector('.contenedor-detalles-pedido');

// Función para obtener pedidos del servidor
async function obtenerPedidos() {
  try {
    const respuesta = await fetch('/api/pedidos');
    if (!respuesta.ok) throw new Error('Error al cargar pedidos');

    const pedidos = await respuesta.json();
    mostrarPedidos(pedidos);
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
  }
}

// Función para mostrar pedidos
function mostrarPedidos(pedidos) {
  contenedorPedidos.innerHTML = ''; // Limpiar antes de insertar

  if (pedidos.length === 0) {
    contenedorMensaje.style.display = 'block';
    contenedorPedidos.style.display = 'none';
  } else {
    contenedorMensaje.style.display = 'none';
    contenedorPedidos.style.display = 'flex';

    pedidos.forEach(pedido => {
      const tarjeta = document.createElement('div');
      tarjeta.classList.add('tarjeta-pedido');

      tarjeta.innerHTML = `
        <div class="tarjeta-pedido-info">
          <h4>Pedido #${pedido.id}</h4>
          <p>Fecha: ${pedido.fecha}</p>
        </div>
        <button class="btn-revisar" data-id="${pedido.id}">Revisar</button>
      `;

      contenedorPedidos.appendChild(tarjeta);
    });

    asignarEventosBotones();
  }
}

// Función para mostrar detalles de un pedido
async function mostrarDetallesPedido(pedidoId) {
  try {
    const respuesta = await fetch(`/api/pedidos/${pedidoId}`);
    if (!respuesta.ok) throw new Error('Error al cargar detalles del pedido');

    const data = await respuesta.json();

    // Limpiar contenedor
    contenedorDetalles.innerHTML = '';

    // Crear contenido de detalles
    const detalleHTML = `
      <div class="detalle-pedido">
        <h3>Detalles del Pedido #${pedidoId}</h3>
        <p><strong>Fecha de compra:</strong> ${data.fecha}</p>

        <h4>📦 Productos:</h4>
        <div class="productos-lista">
        ${data.productos.map(prod => {
            const precio = Number(prod.precio_unitario);
            return `
              <div class="producto-item">
                <p><strong>${prod.nombre}</strong> - Color: ${prod.color}</p>
                <p>Cantidad: ${prod.cantidad} | Precio: $${precio.toFixed(2)} | Subtotal: $${(precio * prod.cantidad).toFixed(2)}</p>
              </div>
            `;
          }).join('')}
        </div>

        <h4>📍 Dirección de envío:</h4>
        <p>${data.direccion.direccion}</p>
        <p>${data.direccion.ciudad}, ${data.direccion.estado}, C.P. ${data.direccion.codigo_postal}</p>

        <button id="cerrar-detalles">Cerrar</button>
      </div>
    `;

    contenedorDetalles.innerHTML = detalleHTML;
    contenedorDetalles.style.display = 'block';


    document.getElementById('cerrar-detalles').addEventListener('click', () => {
      contenedorDetalles.style.display = 'none';
    });

  } catch (error) {
    console.error('Error obteniendo detalles del pedido:', error);
    alert('No se pudo cargar el pedido.');
  }
}

// Función para asignar eventos a los botones "Revisar"
function asignarEventosBotones() {
  const botonesRevisar = document.querySelectorAll('.btn-revisar');
  botonesRevisar.forEach(boton => {
    boton.addEventListener('click', (e) => {
      const pedidoId = e.target.getAttribute('data-id');
      mostrarDetallesPedido(pedidoId);
    });
  });
}
// 🚀 Llamar a obtenerPedidos al cargar
obtenerPedidos();