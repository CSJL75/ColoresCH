export async function cargarHeader() {
  const headerRes = await fetch('http://localhost:3000/partials/header.html');
  const headerHTML = await headerRes.text();
  document.getElementById('header-container').innerHTML = headerHTML;
  console.log("Iniciando carga de header"); // 👈 1
  await actualizarContadorCarrito();
  try {
    console.log("Consultando /api/usuario"); // 👈 2
    const usuarioRes = await fetch('http://localhost:3000/api/usuario', { // 👈 URL absoluta
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Cookies enviadas:', document.cookie); // 👈 Verifica cookies
    console.log('Response status:', usuarioRes.status);
    console.log("Respuesta recibida:", usuarioRes.status); // 👈 3
    if (usuarioRes.ok) {
      console.log("Usuario autenticado"); // 👈 4
      const userIcon = document.getElementById('usuario-icono');
      const linkIcono = userIcon.querySelector('#icono-usuario-link');
      if (linkIcono) linkIcono.remove();
      const data = await usuarioRes.json();
      const nombreUsuario = data.usuario.nombre_usuario;
    
      if (userIcon) {
        userIcon.innerHTML = `
        <div class="usuario-logueado">
          <img src="/assets/icons/user.png" alt="Usuario" style="width: 24px; height: 24px;">
          <span class="usuario-nombre">${nombreUsuario}</span>
          <div class="menu-usuario oculto">
            <a href="/direcciones.html">Direcciones</a>
            <a href="/pedidos.html">Pedidos</a>
            <a href="#" id="cerrar-sesion">Cerrar sesión</a>
          </div>
        </div>
      `;
      
        const nombreSpan = userIcon.querySelector('.usuario-nombre');
        const menu = userIcon.querySelector('.menu-usuario');
      
        nombreSpan.addEventListener('click', () => {
          menu.classList.toggle('oculto');
        });
      
        const cerrarBtn = document.getElementById('cerrar-sesion');
        cerrarBtn.addEventListener('click', (e) => {
          e.preventDefault();
          cerrarSesion();
        });
      
        document.addEventListener('click', (e) => {
          if (!userIcon.contains(e.target)) {
            menu.classList.add('oculto');
          }
        });
      }
    } else if (usuarioRes.status === 401) {
      console.log('No autorizado: Redirigir a login si es necesario');
      // Opcional: Mostrar botón de login o redirigir
    }
  } catch (error) {
console.error("Error completo:", error); // 👈 5
    const userIcon = document.getElementById('usuario-icono');
    if (userIcon) userIcon.style.display = 'none'; // Oculta ícono si hay error
  }
}

export async function actualizarContadorCarrito() {
  try {
    const res = await fetch('/api/carrito/contador', { credentials: 'include' });

    if (res.status === 401) {
      console.log('Usuario no logueado. No se actualiza el contador del carrito.');
      return;
    }

    const data = await res.json();
    const contador = data.total || 0;
    const spanContador = document.querySelector('#carrito-contador');

    if (spanContador) {
      spanContador.textContent = contador;
      spanContador.style.display = contador > 0 ? 'inline-block' : 'none';

      spanContador.classList.remove('bounce');
      void spanContador.offsetWidth;
      spanContador.classList.add('bounce');
    }
  } catch (error) {
    console.error('actualizarContadorCarrito Error:', error);
  }
}


// Resto del código (cargarFooter, cerrarSesion)

export async function cargarFooter() {
  const footerRes = await fetch('http://localhost:3000/partials/footer.html');
  const footerHTML = await footerRes.text();
  document.getElementById('footer-container').innerHTML = footerHTML;
}

export async function cerrarSesion() {
  const res = await fetch('/api/logout', {
    method: 'POST',
    credentials: 'include'
  });

  if (res.ok) {
    window.location.href = '/sesion.html';
  }
}

window.cerrarSesion = cerrarSesion;