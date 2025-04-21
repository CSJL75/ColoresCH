document.addEventListener('DOMContentLoaded', async () => {
  const contenedorCarrusel = document.getElementById('productos-destacados');

  try {
    const res = await fetch('/api/productos/destacados');
    const productos = await res.json();

    if (!productos.length) {
      contenedorCarrusel.innerHTML = '<p>No hay productos destacados disponibles.</p>';
      return;
    }

    productos.forEach(producto => {
      const variedad = producto.variedades[0]; // Tomamos la primera variedad como representativa

      const tarjeta = document.createElement('div');
      tarjeta.classList.add('tarjeta-producto');

      tarjeta.innerHTML = `
        <div class="imagen-carrusel">
          <img src="${variedad?.imagen_url || '/img/placeholder.png'}" alt="${producto.nombre}">
        </div>
        <div class="info-carrusel">
          <h3>${producto.nombre}</h3>
          <p>${producto.categoria}</p>
          <p>$${producto.precio.toFixed(2)}</p>
          <button onclick="window.location.href='/producto/${producto.id}'">Ver producto</button>
        </div>
      `;

      contenedorCarrusel.appendChild(tarjeta);
    });

  } catch (err) {
    console.error('Error cargando productos destacados:', err);
    contenedorCarrusel.innerHTML = '<p>Error al cargar productos destacados.</p>';
  }
});
