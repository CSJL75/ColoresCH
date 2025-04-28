import { actualizarContadorCarrito } from '/js/components/cargarHeader.js';
document.addEventListener('DOMContentLoaded', async () => {
  let producto;
  let esDesdeMayoreo = false;
  async function obtenerUsuario() {
    const res = await fetch('/api/usuario', {
      credentials: 'include'
    });
  
    if (res.ok) return res.json();
    return null;
  }  
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  esDesdeMayoreo = params.get('origen') === 'mayoreo' || sessionStorage.getItem('origen') === 'mayoreo';

  console.log("¿Es desde mayoreo?", esDesdeMayoreo);

  if (!id) {
    alert('Producto no especificado');
    return;
  }

  try {
    const res = await fetch(`/api/productos/${id}`);
    if (!res.ok) throw new Error('Producto no encontrado');
    producto = await res.json();
    console.log(producto);

    // Asignar valores básicos
    document.querySelector('h1').textContent = producto.nombre;
    document.querySelector('.producto-etiqueta').textContent = producto.categoria;
    document.querySelector('.seccion-extra:nth-of-type(1) p').textContent = producto.descripcion;
    document.querySelector('.seccion-extra:nth-of-type(2) p').textContent = `${producto.artesano}: ${producto.artesano_biografia}`;

    // Mostrar precios en la sección de precio fijo
    document.querySelector('.precio-original').textContent = `$${producto.precio.toFixed(2)} MXN`;
    document.querySelector('.precio-mayoreo').textContent = `$${producto.precio_mayoreo.toFixed(2)} MXN`;

    // Manejo de cantidades
    const inputCantidad = document.getElementById('cantidad');
    inputCantidad.min = esDesdeMayoreo ? producto.umbral_mayoreo : 1;
    inputCantidad.value = inputCantidad.min;

    // Cargar variedades
    const imagen = document.getElementById('producto-imagen');
    const contenedorColores = document.querySelector('.selector-colores');
    contenedorColores.innerHTML = '';

    producto.variedades.forEach((variedad, index) => {
      const circulo = document.createElement('div');
      circulo.classList.add('color-circulo');
      circulo.style.backgroundColor = variedad.codigo_hex;
      circulo.dataset.variedadId = variedad.id;
      circulo.title = variedad.color;
      circulo.dataset.imagenUrl = variedad.imagen_url;
      if (index === 0) circulo.classList.add('selected');
      contenedorColores.appendChild(circulo);

      if (index === 0) {
        imagen.src = variedad.imagen_url;
        imagen.alt = `Imagen de ${producto.nombre} - ${variedad.color}`;
      }
    });

    // Escuchar clicks en selección de variedad
    contenedorColores.addEventListener('click', (e) => {
      if (e.target.classList.contains('color-circulo')) {
        document.querySelectorAll('.color-circulo').forEach(c => c.classList.remove('selected'));
        e.target.classList.add('selected');
        imagen.src = e.target.dataset.imagenUrl;
        actualizarPrecio();
      }
    });

    // Leyenda de mayoreo
    const precioContenedor = document.querySelector('.selector .precio');
    const leyendaMayoreo = document.createElement('div');
    leyendaMayoreo.className = 'leyenda-mayoreo';
    leyendaMayoreo.style.fontSize = '0.9em';
    leyendaMayoreo.style.color = '#555';
    leyendaMayoreo.style.marginTop = '0.3em';
    precioContenedor.parentElement.appendChild(leyendaMayoreo);

    function actualizarPrecio() {
      const cantidad = parseInt(inputCantidad.value);
      const aplicaMayoreo = esDesdeMayoreo || cantidad >= producto.umbral_mayoreo;

      const precioUnitario = aplicaMayoreo ? producto.precio_mayoreo : producto.precio;
      const total = precioUnitario * cantidad;
      precioContenedor.textContent = `$${total.toFixed(2)} MXN`;

      // Mostrar u ocultar leyenda y precio tachado
      const precioOriginal = document.querySelector('.precio-original');
      const precioMayoreo = document.querySelector('.precio-mayoreo');

      if (aplicaMayoreo) {
        precioOriginal.style.textDecoration = 'line-through';
        precioMayoreo.style.display = 'inline';
        leyendaMayoreo.textContent = `Precio especial a partir de ${producto.umbral_mayoreo} unidades`;
        leyendaMayoreo.style.display = 'block';
      } else {
        precioOriginal.style.textDecoration = 'none';
        precioMayoreo.style.display = 'none';
        leyendaMayoreo.style.display = 'none';
      }
    }

    inputCantidad.addEventListener('input', () => {
      if (esDesdeMayoreo && parseInt(inputCantidad.value) < producto.umbral_mayoreo) {
        inputCantidad.value = producto.umbral_mayoreo;
      }
      actualizarPrecio();
    });

    actualizarPrecio();

    // Agregar al carrito
    const btnAgregar = document.querySelector('.btn-comprar');
    btnAgregar.addEventListener('click', async () => {
      const cantidad = parseInt(inputCantidad.value);
      const variedadSeleccionada = document.querySelector('.color-circulo.selected');
    
      if (!variedadSeleccionada) {
        alert('Por favor selecciona un color');
        return;
      }
    
      if (!cantidad || cantidad < 1) {
        alert('Cantidad inválida');
        return;
      }
    
      const usuario = await obtenerUsuario();
      if (!usuario) {
        alert('Debes iniciar sesión para agregar productos al carrito.');
        return;
      }
      
      const datos = {
        variedad_id: variedadSeleccionada?.dataset?.variedadId,
        producto_id: producto?.id,
        cantidad
      };
      
      console.log("Datos enviados al carrito:", datos);
      
      try {
        const res = await fetch('/api/carrito', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(datos)
        });
      
        const data = await res.json();
        if (res.ok) {
          alert('Producto agregado al carrito');
          actualizarContadorCarrito();
        } else {
          alert(data.error || 'Error al agregar al carrito');
        }
      } catch (err) {
        console.error('Error:', err);
        alert('No se pudo conectar con el servidor');
      }
      
    });
    

  } catch (err) {
    console.error('Error al cargar producto:', err);
    alert('No se pudo cargar el producto');
  }

  document.body.classList.remove('cargando');
});