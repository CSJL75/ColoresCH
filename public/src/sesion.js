document.getElementById('form-sesion').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const correo = document.getElementById('email').value;
    const contrasena = document.getElementById('password').value;

    console.log('Cookies ANTES del login:', document.cookie);

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ correo, contrasena })
    });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Credenciales incorrectas');
      }

      const data = await res.json();
      if (!data.usuario) throw new Error('Datos de usuario no recibidos');

      localStorage.setItem('userData', JSON.stringify(data.usuario));
      window.location.href = '/?loggedIn=true';
  
    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'Error al iniciar sesión');
      localStorage.removeItem('userData');
    }
});