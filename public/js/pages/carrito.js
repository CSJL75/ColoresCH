document.addEventListener('DOMContentLoaded', async () => {
  const carritoContainer = document.getElementById('carrito-items');
  const totalDiv = document.getElementById('total-precio');
  const finalizarBtn = document.getElementById('btn-comprar');

  let total = 0;
  let carritoItems = [];

  // 📦 Obtener carrito
  async function obtenerCarrito() {
    console.log('🔎 Solicitando /api/carrito...');
    const res = await fetch('/api/carrito', {
      credentials: 'include'
    });
    if (!res.ok) {
      console.error('❌ Error al obtener carrito');
      return { carrito_id: null, items: [] };
    }
    const data = await res.json();
    console.log('🧺 Carrito recibido:', data);
    return data;
  }

  // 🛒 Cargar carrito en la página
  async function cargarCarrito() {
    const data = await obtenerCarrito();
    carritoItems = data.items || [];
    total = 0;
    carritoContainer.innerHTML = '';
  
    if (carritoItems.length === 0) {
      carritoContainer.innerHTML = '<p>Tu carrito está vacío.</p>';
      finalizarBtn.disabled = true;
      return;
    }
  
    carritoItems.forEach(item => {
      const cantidad = item.cantidad;
      const precioNormal = Number(item.precio);
      const precioMayoreo = Number(item.precio_mayoreo);
      const umbralMayoreo = item.umbral_mayoreo;
  
      const aplicaMayoreo = cantidad >= umbralMayoreo;
      const precioUnitario = aplicaMayoreo ? precioMayoreo : precioNormal;
      const precioFinal = precioUnitario * cantidad;
  
      total += precioFinal;
  
      // 🔥 Mostrar ambos precios si aplica mayoreo
      let precioUnitarioHTML = '';
      if (aplicaMayoreo) {
        precioUnitarioHTML = `
          <span class="precio-unitario tachado">
            $${precioNormal.toFixed(2)}/c.u
          </span>
          <span class="precio-unitario descuento">
            $${precioMayoreo.toFixed(2)}/c.u
          </span>
        `;
      } else {
        precioUnitarioHTML = `
          <span class="precio-unitario">
            ($${precioNormal.toFixed(2)}/c.u)
          </span>
        `;
      }
  
      // 🔥 Mensaje de descuento si aplica
      const mensajeDescuento = aplicaMayoreo
        ? `<p class="mensaje-descuento">¡Precio de mayoreo aplicado!</p>`
        : '';
  
      const itemDiv = document.createElement('div');
      itemDiv.classList.add('carrito-item');
      itemDiv.innerHTML = `
        <img src="${item.imagen_url}" alt="${item.nombre}" />
        <div class="carrito-item-info">
          <h4>${item.nombre}</h4>
          <p class="precio-final">Total: $${precioFinal.toFixed(2)}</p>
          <p>${precioUnitarioHTML}</p>
          ${mensajeDescuento}
          <div class="control-cantidad">
            <button onclick="actualizarCantidad(${item.item_id}, -1)">-</button>
            <input type="text" value="${item.cantidad}" readonly />
            <button onclick="actualizarCantidad(${item.item_id}, 1)">+</button>
            <button class="btn-remover" onclick="removerItem(${item.item_id})">Remover</button>
          </div>
        </div>
      `;
      carritoContainer.appendChild(itemDiv);
    });
  
    const costoEnvio = total >= 500 ? 0 : 80;
    const totalFinal = total + costoEnvio;
  
    totalDiv.innerHTML = `
      <div class="resumen-card">
        <h3>Resumen</h3>
        <p>Productos: $${total.toFixed(2)}</p>
        <p>Envío: $${costoEnvio.toFixed(2)}</p>
        <p class="texto-promocion">
          ${costoEnvio === 0
            ? 'Promoción aplicada: -$80 (envío gratis)'
            : 'Añade más de $499.00 MXN para envío gratis'}
        </p>
        <p class="resumen-total">Total: $${totalFinal.toFixed(2)}</p>
      </div>
    `;
  
    finalizarBtn.disabled = false;
  }

  // 👤 Obtener usuario actual
  async function obtenerUsuario() {
    const res = await fetch('/api/usuario', {
      credentials: 'include'
    });
    if (res.ok) {
      return res.json();
    }
    return null;
  }

  // 📍 Obtener direcciones del usuario
  async function obtenerDirecciones(usuarioId) {
    const res = await fetch(`/api/direcciones/${usuarioId}`, {
      credentials: 'include'
    });
    if (res.ok) {
      return res.json();
    }
    return [];
  }

  // 📦 Cargar direcciones en el select
  const direccionContainer = document.getElementById('direcciones-container');
  let direccionSeleccionadaId = null; // Para saber cuál eligió el usuario
  
  async function cargarDirecciones() {
    const usuario = await obtenerUsuario();
    if (!usuario || !usuario.usuario?.id) {
      direccionContainer.innerHTML = '<p>No has iniciado sesión</p>';
      finalizarBtn.disabled = true;
      return;
    }
  
    const direcciones = await obtenerDirecciones(usuario.usuario.id);
    direccionContainer.innerHTML = '';
  
    if (!direcciones || direcciones.length === 0) {
      direccionContainer.innerHTML = '<p>No tienes direcciones registradas</p>';
      finalizarBtn.disabled = true;
      return;
    }
  
    direcciones.forEach(dir => {
      const card = document.createElement('div');
      card.classList.add('tarjeta-direccion');
      card.dataset.id = dir.id;
      card.innerHTML = `
      <div class="tarjeta-contenido">
        <div class="check-icon">✔️</div>
        <p>${dir.direccion}</p>
        <p>${dir.ciudad}, ${dir.estado}</p>
        <p>CP ${dir.codigo_postal}</p>
      </div>
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.tarjeta-direccion').forEach(c => c.classList.remove('seleccionada'));
      card.classList.add('seleccionada');
      direccionSeleccionadaId = dir.id;
    finalizarBtn.disabled = false;
    });
  
      direccionContainer.appendChild(card);
    });
  
    finalizarBtn.disabled = true; // Hasta que elija una dirección
  }

  // 🛒 Finalizar compra
  finalizarBtn.addEventListener('click', async () => {
    if (!direccionSeleccionadaId) return;
  
    const res = await fetch('/api/checkout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direccion_id: direccionSeleccionadaId })
    });
  
    const data = await res.json();
    if (res.ok) {
      alert('Compra finalizada. Revisa tu correo.');
      window.location.href = '/tienda.html';
    } else {
      alert(data.error || 'Error al finalizar la compra');
    }
  });

  // 🔄 Funciones globales para actualizar y remover
  window.actualizarCantidad = async (itemId, cambio) => {
    const item = carritoItems.find(i => i.item_id === itemId);
    if (!item) return;

    const nuevaCantidad = item.cantidad + cambio;
    if (nuevaCantidad <= 0) {
      return window.removerItem(itemId);
    }

    await fetch('/api/carrito', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, cantidad: nuevaCantidad })
    });

    await cargarCarrito();
  };

  window.removerItem = async (itemId) => {
    await fetch(`/api/carrito/${itemId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    await cargarCarrito();
    await cargarDirecciones();
  };

  // 🚀 Inicializar página
  await cargarCarrito();
  await cargarDirecciones();
});