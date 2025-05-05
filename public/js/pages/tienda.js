// js/pages/tienda.js
// import { actualizarCarrito } from '../components/carrito.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Cargar datos iniciales
    const [productos, categorias, artesanos] = await Promise.all([
      fetch('/api/productos').then(res => res.json()),
      fetch('/api/categorias').then(res => res.json()),
      fetch('/api/artesanos').then(res => res.json())
    ]);

    // Inicializar filtros
    inicializarFiltros(categorias, artesanos, productos);
    
    // Mostrar productos
    mostrarProductos(productos);
    
    // Configurar eventos
    configurarEventos();
    
    // Actualizar carrito
    //actualizarCarrito();

  } catch (error) {
    console.error('Error al cargar la tienda:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error al cargar la tienda',
      text: 'Ocurrió un problema al obtener los productos. Intenta más tarde.',
      confirmButtonColor: '#d33'
    }); 
  }
});

function inicializarFiltros(categorias, artesanos, productos) {
  // Filtro por categoría
  const categoriasContainer = document.getElementById('filtro-categorias');
  categorias.forEach(categoria => {
    categoriasContainer.innerHTML += `
      <li>
        <label>
          <input type="checkbox" name="categoria" value="${categoria.id}">
          ${categoria.nombre}
        </label>
      </li>
    `;
  });

  // Comprobar si llegó un parámetro de categoría en la URL y marcarlo
  const params = new URLSearchParams(window.location.search);
  const categoriaParam = params.get('categoria');

  if (categoriaParam) {
    const checkbox = categoriasContainer.querySelector(`input[value="${categoriaParam}"]`);
    if (checkbox) {
      checkbox.checked = true;
      aplicarFiltros(); // Aplicar filtros automáticamente
    }
  }

  // Filtro por artesano
  const artesanosContainer = document.getElementById('filtro-artesanos');
  artesanos.forEach(artesano => {
    artesanosContainer.innerHTML += `
      <li>
        <label>
          <input type="checkbox" name="artesano" value="${artesano.id}">
          ${artesano.nombre}
        </label>
      </li>
    `;
  });

  // Filtro por color (extraer colores únicos de productos)
  const coloresContainer = document.getElementById('filtro-colores');
  const coloresUnicos = [...new Set(productos.flatMap(p => 
    p.variedades.map(v => v.codigo_hex).filter(Boolean)
  ))];
  
  coloresUnicos.forEach(color => {
    coloresContainer.innerHTML += `
      <div class="color-option" 
           style="background-color: ${color}" 
           data-color="${color}" 
           title="${color}">
      </div>
    `;
  });

  // Configurar rango de precios
  const priceSlider = document.getElementById('price-slider');
  const maxPrice = Math.max(...productos.map(p => p.precio));
  priceSlider.max = Math.ceil(maxPrice / 100) * 100;
  priceSlider.value = maxPrice;
  document.getElementById('max-price').textContent = `$${maxPrice.toLocaleString()}`;
}

function obtenerParametroBusqueda() {
  const params = new URLSearchParams(window.location.search);
  return params.get('buscar')?.toLowerCase() || '';
}

function mostrarProductos(productos) {
  const grid = document.getElementById('productos-grid');
  const template = document.getElementById('producto-template');
  const terminoBusqueda = obtenerParametroBusqueda();
  
  grid.innerHTML = '';
  
    // Si hay término, filtra antes de mostrar
    const productosFiltrados = terminoBusqueda
    ? productos.filter(p => 
        p.nombre.toLowerCase().includes(terminoBusqueda) || 
        p.descripcion?.toLowerCase().includes(terminoBusqueda)
      )
    : productos;
    
  productosFiltrados.forEach(producto => {
    if (!producto.variedades.length) return;
    
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.producto-card');
    
    // Llenar datos
    const primeraVariedad = producto.variedades[0];
    console.log('Producto:', producto);
    console.log('Variedad:', primeraVariedad);
    console.log('Imagen URL:', primeraVariedad.imagen_url);
    card.querySelector('.producto-imagen').src = primeraVariedad.imagen_url;
    card.querySelector('.producto-imagen').alt = producto.nombre;
    card.querySelector('.producto-nombre').textContent = producto.nombre;
    card.querySelector('.producto-precio').textContent = `$${parseFloat(producto.precio).toFixed(2)} MXN`;
    
    // Enlace al detalle del producto
    card.addEventListener('click', () => {
      window.location.href = `/producto.html?id=${producto.id}`;
    });
    
    grid.appendChild(clone);
  });
}

function configurarEventos() {
  // Filtros interactivos
  document.querySelectorAll('.filtros input, .color-option').forEach(element => {
    element.addEventListener('change', aplicarFiltros);
  });
  
  // Slider de precio
  const priceSlider = document.getElementById('price-slider');
  priceSlider.addEventListener('input', (e) => {
    document.getElementById('max-price').textContent = `$${parseInt(e.target.value).toLocaleString()}`;
    aplicarFiltros();
  });
}

async function aplicarFiltros() {
  try {
    // Obtener valores de los filtros
    const categorias = Array.from(document.querySelectorAll('input[name="categoria"]:checked')).map(el => el.value);
    const artesanos = Array.from(document.querySelectorAll('input[name="artesano"]:checked')).map(el => el.value);
    const precioMax = document.getElementById('price-slider').value;
    const colores = Array.from(document.querySelectorAll('.color-option.selected')).map(el => el.dataset.color);
    
    // Construir URL de filtro
    const params = new URLSearchParams();
    if (categorias.length) params.append('categoria', categorias.join(','));
    if (artesanos.length) params.append('artesano', artesanos.join(','));
    if (colores.length) params.append('color', colores.join(','));
    params.append('precio_max', precioMax);
    
    // Obtener productos filtrados
    const response = await fetch(`/api/productos?${params.toString()}`);
    const productos = await response.json();
    
    // Mostrar resultados
    mostrarProductos(productos);
    
  } catch (error) {
    console.error('Error al aplicar filtros:', error);
    Swal.fire({
      icon: 'error',
      title: 'No se pudieron aplicar los filtros',
      text: 'Verifica tu conexión o intenta nuevamente.',
      confirmButtonColor: '#d33'
    });
  }
}

// Manejar selección de colores
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('color-option')) {
    e.target.classList.toggle('selected');
    aplicarFiltros();
  }
});

