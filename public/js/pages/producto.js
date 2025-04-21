document.body.classList.add('cargando');
let producto;
let esDesdeMayoreo = false;

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (params.has('origen')) {
    esDesdeMayoreo = params.get('origen') === 'mayoreo';
  } else {
    esDesdeMayoreo = sessionStorage.getItem('origen') === 'mayoreo';
  }
  console.log("¿Es desde mayoreo?", esDesdeMayoreo);
  if (!id) {
    alert('Producto no especificado');
    return;
  }

  try {
    const res = await fetch(`/api/productos/${id}`);
    producto = await res.json();

    // Rellenar contenido
    document.querySelector('h1').textContent = producto.nombre;
    document.querySelector('.producto-etiqueta').textContent = producto.categoria;

    const imagen = document.querySelector('.producto-imagen img');
    if (producto.variedades.length > 0 && producto.variedades[0].imagen_url) {
      imagen.src = producto.variedades[0].imagen_url;
    } else {
      imagen.src = 'https://via.placeholder.com/400x400?text=Sin+imagen'; // imagen de respaldo
    }
    imagen.alt = `Imagen de ${producto.nombre}`;

    const contenedorColores = document.querySelector('.selector-colores');
    producto.variedades.forEach(variedad => {
      const circulo = document.createElement('div');
      circulo.classList.add('color-circulo');
      circulo.style.backgroundColor = variedad.codigo_hex;
      circulo.dataset.variedadId = variedad.id;
      circulo.title = variedad.color;

      // Guardamos la imagen_url también en el elemento
      circulo.dataset.imagenUrl = variedad.imagen_url;
      contenedorColores.appendChild(circulo);
    });

    contenedorColores.addEventListener('click', (e) => {
      if (e.target.classList.contains('color-circulo')) {
        // Remover selección anterior
        document.querySelectorAll('.color-circulo').forEach(c => c.classList.remove('selected'));
        e.target.classList.add('selected');

        // Cambiar imagen principal
        const nuevaImagen = e.target.dataset.imagenUrl;
        const imagenPrincipal = document.querySelector('.producto-imagen img');
        imagenPrincipal.src = nuevaImagen;
        imagenPrincipal.alt = `Imagen de ${producto.nombre} - ${e.target.title}`;

        // No necesitamos el precio de la variedad, solo usamos el precio base del producto
        // Guardar el precio base del producto
        precioVariedadSeleccionada = parseFloat(producto.precio);

        // Actualizar precio con la variedad seleccionada
        actualizarPrecio();
      }
    });

    const inputCantidad = document.getElementById('cantidad');
    const precioSpan = document.querySelector('.precio');
    const precioOriginalEls = document.querySelectorAll('.precio-original');
    const precioMayoreoEls = document.querySelectorAll('.precio-mayoreo');

    function actualizarPrecio() {
      const cantidad = parseInt(inputCantidad.value);
      if (isNaN(cantidad) || cantidad <= 0) return;

      const precioNormal = parseFloat(producto.precio);
      const precioMayoreo = parseFloat(producto.precio_mayoreo);

      // Si viene desde mayoreo.html, mostrar el precio con descuento
      const usaMayoreo = cantidad >= producto.umbral_mayoreo;
      // Si viene desde mayoreo, preseleccionamos cantidad mínima
      if (esDesdeMayoreo && inputCantidad.value < producto.umbral_mayoreo) {
       inputCantidad.value = producto.umbral_mayoreo;
      }
      const precioUnitario = usaMayoreo ? precioMayoreo : precioNormal;

      // Actualiza el total
      precioSpan.textContent = `$${(precioUnitario * cantidad).toFixed(2)}`;

      // Actualiza precios individuales
      precioOriginalEls.forEach(el => {
        el.textContent = `$${precioNormal.toFixed(2)} MXN`;
        el.classList.toggle('tachado', esDesdeMayoreo && cantidad >= producto.umbral_mayoreo);
        console.log(`precioOriginal ${el.textContent}, tachado: ${el.classList.contains('tachado')}`);
      });
      
      precioMayoreoEls.forEach(el => {
        el.textContent = `$${precioMayoreo.toFixed(2)} MXN`;
        el.style.display = (esDesdeMayoreo && usaMayoreo) ? 'inline' : 'none';
        console.log(`precioMayoreo ${el.textContent}, visible: ${el.style.display}`);
      });
      
      

      // Si es desde mayoreo, indicar la cantidad mínima
      if (usaMayoreo) {
        precioMayoreoEls.forEach(el => {
          el.innerHTML += `<br><small>a partir de ${producto.umbral_mayoreo} unidades</small>`;
        });
      }

      // Si viene de mayoreo, ajustar la cantidad mínima
      if (esDesdeMayoreo && inputCantidad.value < producto.umbral_mayoreo) {
        inputCantidad.value = producto.umbral_mayoreo;
      }
    }

    console.log('Producto cargado:', producto);
    console.log('Precio:', producto.precio);
    console.log('Precio Mayoreo:', producto.precio_mayoreo);

    // Escuchamos cambios en cantidad
    inputCantidad.addEventListener('input', actualizarPrecio);

    // Llamamos a actualizarPrecio aquí para calcular los precios al principio
    actualizarPrecio();

    // Descripción y artesano
    document.querySelectorAll('.seccion-extra')[0].querySelector('p').textContent = producto.descripcion;
    document.querySelectorAll('.seccion-extra')[1].querySelector('p').textContent = `${producto.artesano}: ${producto.artesano_biografia}`;

  } catch (err) {
    console.error('Error al cargar producto:', err);
    alert('No se pudo cargar el producto');
  }
  document.body.classList.remove('cargando');
});
