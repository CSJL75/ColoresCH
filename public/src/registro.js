import { cargarHeader } from './components/cargarHeader.js';
cargarHeader();

document.getElementById('formRegistro').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const nombre_usuario = document.getElementById('nombre_usuario').value;
    const correo = document.getElementById('correo').value;
    const contrasena = document.getElementById('contrasena').value;
    const confirmar = document.getElementById('confirmarContrasena').value;
  
    if (contrasena !== confirmar) {
      return alert('Las contraseñas no coinciden');
    }
  
    try {
      const res = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_usuario, correo, contrasena })
      });
  
      const data = await res.json();
  
      if (res.ok) {
        alert('Registro exitoso. Revisa tu correo.');
        window.location.href = '/sesion.html';
      } else {
        alert(data.error || 'Error al registrarse');
      }
    } catch (error) {
      console.error('Error de red:', error);
      alert('Hubo un error al registrar');
    }
  });
