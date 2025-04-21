// busqueda.js (sin DOMContentLoaded)
console.log('✅ Script de búsqueda cargado');

const btnBusqueda = document.getElementById('btn-busqueda');
const contenedor = document.getElementById('busqueda-container');
const input = document.getElementById('input-busqueda');
const lista = document.getElementById('resultados-busqueda');

if (!btnBusqueda || !contenedor || !input || !lista) {
  console.warn('❌ Elementos de búsqueda no encontrados');
} else {
  let visible = false;

  btnBusqueda.addEventListener('click', (e) => {
    e.stopPropagation(); // Evita que se dispare el click global
    visible = !visible;
    input.style.display = visible ? 'inline-block' : 'none';
    lista.style.display = 'none';
    if (visible) {
      input.focus();
    }
  });
  

  // Cargar productos una sola vez
  fetch('/api/productos')
    .then(res => res.json())
    .then(productos => {
      input.addEventListener('input', () => {
        const termino = input.value.toLowerCase().trim();
        lista.innerHTML = '';

        if (!termino) {
          lista.style.display = 'none';
          return;
        }

        const resultados = productos.filter(p =>
          p.nombre.toLowerCase().includes(termino) ||
          (p.descripcion && p.descripcion.toLowerCase().includes(termino))
        );

        resultados.forEach(p => {
          const li = document.createElement('li');
          li.textContent = p.nombre;
          li.addEventListener('click', () => {
            sessionStorage.setItem('origen', 'tienda');
            window.location.href = `/producto.html?id=${p.id}`;
          });
          lista.appendChild(li);
        });

        lista.style.display = resultados.length ? 'block' : 'none';
      });
    });

  // Ocultar resultados si se hace clic fuera
  document.addEventListener('click', (e) => {
    if (!contenedor.contains(e.target)) {
      input.style.display = 'none';
      lista.style.display = 'none';
      visible = false;
    }
  });  
}
