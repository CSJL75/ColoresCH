import { cargarHeader, cargarFooter } from '/js/components/cargarHeader.js';

document.addEventListener("DOMContentLoaded", async () => {
  await cargarHeader();
  await cargarFooter();

  const resUsuario = await fetch('/api/usuario', {
    method: 'GET',
    credentials: 'include'
  });

  if (!resUsuario.ok) {
    Swal.fire({
      icon: 'warning',
      title: 'Acceso restringido',
      text: 'Debes iniciar sesión para ver tus direcciones.',
      confirmButtonColor: '#3085d6'
    }).then(() => {
      window.location.href = "sesion.html";
    });
    return;
  }

  const { usuario } = await resUsuario.json();

  const listaDirecciones = document.getElementById("lista-direcciones");
  const form = document.getElementById("form-direccion");

  async function cargarDirecciones() {
    try {
      const res = await fetch(`/api/direcciones/${usuario.id}`, {
        method: 'GET',
        credentials: 'include'
      });

      const direcciones = await res.json();
      listaDirecciones.innerHTML = "";

      if (direcciones.length === 0) {
        listaDirecciones.innerHTML = "<p>No tienes direcciones registradas aún.</p>";
        return;
      }

      // Renderizar direcciones con botones de eliminar
      direcciones.forEach(dir => {
        const div = document.createElement("div");
        div.classList.add("direccion-card");
        div.innerHTML = `
          <p><strong>${dir.direccion}</strong></p>
          <p>${dir.ciudad}, ${dir.estado}, CP ${dir.codigo_postal}</p>
          <button class="eliminar-btn" data-id="${dir.id}">Eliminar</button>
        `;
        listaDirecciones.appendChild(div);
      });

      // Agregar listeners a los nuevos botones de eliminar
      document.querySelectorAll(".eliminar-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
      
          Swal.fire({
            title: '¿Eliminar dirección?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#aaa',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
          }).then(async (result) => {
            if (result.isConfirmed) {
              try {
                const res = await fetch(`/api/direcciones/${id}`, {
                  method: "DELETE",
                  credentials: 'include'
                });
      
                const data = await res.json();
      
                if (data.success) {
                  Swal.fire({
                    toast: true,
                    position: 'top',
                    icon: 'success',
                    title: 'Dirección eliminada',
                    showConfirmButton: false,
                    timer: 1500
                  });
                  cargarDirecciones(); // Recargar la lista después de eliminar
                } else {
                  Swal.fire({
                    icon: 'error',
                    title: 'No se pudo eliminar la dirección',
                    text: 'La dirección está vinculada a pedidos en proceso y no puede eliminarse.',
                    confirmButtonColor: '#d33'
                  });
                }
              } catch (err) {
                console.error("Error al eliminar dirección:", err);
                Swal.fire({
                  icon: 'error',
                  title: 'Error de red',
                  text: 'No se pudo conectar al servidor.',
                  confirmButtonColor: '#d33'
                });
              }
            }
          });
        });
      });

    } catch (err) {
      console.error("Error al cargar direcciones:", err);
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    const nuevaDireccion = {
      direccion: formData.get("direccion"),
      ciudad: formData.get("ciudad"),
      estado: formData.get("estado"),
      codigo_postal: formData.get("codigo_postal")
    };

    if (Object.values(nuevaDireccion).some(val => val.trim() === "")) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor, completa todos los campos.',
        confirmButtonColor: '#f39c12'
      });
      return;
    }

    console.log("Enviando dirección:", nuevaDireccion);
    try {
      const res = await fetch("/api/direcciones", {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevaDireccion)
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire({
          toast: true,
          position: 'top',
          icon: 'success',
          title: 'Dirección guardada',
          showConfirmButton: false,
          timer: 1500
        });
        form.reset();
        cargarDirecciones();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'No se pudo guardar',
          text: 'Hubo un problema al guardar la dirección. Intenta de nuevo.',
          confirmButtonColor: '#d33'
        });
      }
    } catch (err) {
      console.error("Error al enviar dirección:", err);
    }
  });

  cargarDirecciones();
});