import { cargarHeader } from '/js/components/cargarHeader.js';
cargarHeader();

document.getElementById('formRegistro').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const nombre_usuario = document.getElementById('nombre_usuario').value;
    const correo = document.getElementById('correo').value;
    const contrasena = document.getElementById('contrasena').value;
    const confirmar = document.getElementById('confirmarContrasena').value;
  
    if (contrasena !== confirmar) {
      return Swal.fire({
        icon: 'warning',
        title: 'Las contraseñas no coinciden',
        confirmButtonColor: '#d33'
      });
    }
  
    try {
      const res = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_usuario, correo, contrasena })
      });
  
      const data = await res.json();
  
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Registro exitoso',
          text: 'Revisa tu correo para confirmar tu cuenta.',
          confirmButtonColor: '#3085d6'
        }).then(() => {
          window.location.href = '/sesion.html';
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al registrarse',
          text: data.error || 'Hubo un problema al procesar tu registro.',
          confirmButtonColor: '#d33'
        });
      }
    } catch (error) {
      console.error('Error de red:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error de red',
        text: 'No se pudo conectar con el servidor.',
        confirmButtonColor: '#d33'
      });
    }
  });
