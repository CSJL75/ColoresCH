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
    Swal.fire({
      icon: 'error',
      title: 'Producto no especificado',
      confirmButtonColor: '#d33'
    });
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
        Swal.fire({
          icon: 'warning',
          title: 'Selecciona una variedad',
          text: 'Por favor selecciona un color antes de continuar.',
          confirmButtonColor: '#f39c12'
        });
        return;
      }
    
      if (!cantidad || cantidad < 1) {
        Swal.fire({
          icon: 'warning',
          title: 'Cantidad inválida',
          text: 'Introduce una cantidad válida.',
          confirmButtonColor: '#f39c12'
        });
        return;
      }
    
      const usuario = await obtenerUsuario();
      if (!usuario) {
        Swal.fire({
          icon: 'info',
          title: 'Inicia sesión',
          text: 'Debes iniciar sesión para agregar productos al carrito.',
          confirmButtonColor: '#3085d6'
        });
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
          Swal.fire({
            icon: 'success',
            title: 'Producto agregado al carrito',
            showConfirmButton: false,
            timer: 1500
          });
          actualizarContadorCarrito();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'No se pudo agregar el producto',
            text: data.error || 'Ocurrió un error inesperado.',
            confirmButtonColor: '#d33'
          });
        }
      } catch (err) {
        console.error('Error:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error de red',
          text: 'No se pudo conectar con el servidor. Intenta más tarde.',
          confirmButtonColor: '#d33'
        }); 
      } 
    });
    

  } catch (err) {
    console.error('Error al cargar producto:', err);
    Swal.fire({
      icon: 'error',
      title: 'Error al cargar el producto',
      text: 'Revisa tu conexión o intenta más tarde.',
      confirmButtonColor: '#d33'
    });
  }

  document.body.classList.remove('cargando');
});