import { obtenerProductos } from "../services/productosService.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const productos = await obtenerProductos();
    console.log("Productos cargados para mayoreo:", productos);

    const productosMayoreo = filtrarYOrdenarMayoreo(productos);
    console.log("Productos filtrados y ordenados para mayoreo:", productosMayoreo);
    mostrarProductosMayoreo(productosMayoreo);
  } catch (error) {
    console.error("Error al cargar productos de mayoreo:", error);
  }
});

function filtrarYOrdenarMayoreo(productos) {
  return productos
    .filter(p => p.cantidad_disponible >= p.umbral_mayoreo)
    .sort((a, b) => a.umbral_mayoreo - b.umbral_mayoreo);
}

function mostrarProductosMayoreo(productos) {
  console.log("Mostrando productos en el grid");

  const contenedor = document.getElementById('productos-grid');
  const template = document.getElementById('producto-template');

  contenedor.innerHTML = ''; // Limpiar productos anteriores

  productos.forEach(producto => {
    if (!producto.variedades || producto.variedades.length === 0) return;

    console.log("Agregando producto:", producto.nombre);

    const variedad = producto.variedades[0];
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.producto-card');

    // Agregamos el evento de click para redirigir
    card.addEventListener('click', () => {
      window.location.href = `/producto.html?id=${producto.id}`;
    });

    const img = clone.querySelector('.producto-imagen');
    img.src = variedad.imagen_url;
    img.alt = producto.nombre;

    const nombre = clone.querySelector('.producto-nombre');
    nombre.textContent = producto.nombre;

    const precio = clone.querySelector('.producto-precio');

    const precioNormal = parseFloat(producto.precio);
    const precioMayoreo = parseFloat(producto.precio_mayoreo);

    if (isNaN(precioMayoreo)) {
      precio.textContent = "Precio no disponible";
    } else {
      precio.innerHTML = `
        <span class="precio-original tachado">$${precioNormal.toFixed(2)} MXN</span>
        <span class="precio-mayoreo precio-verde">$${precioMayoreo.toFixed(2)} MXN</span>
        <br>
        <small>a partir de ${producto.umbral_mayoreo} unidades</small>
      `;
    }

    contenedor.appendChild(clone);
    console.log("Total productos añadidos al DOM:", contenedor.children.length);
  });
}
