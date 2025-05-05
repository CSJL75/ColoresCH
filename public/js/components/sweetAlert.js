export function mostrarAlerta(titulo, texto, tipo = 'info') {
    Swal.fire({
      title: titulo,
      text: texto,
      icon: tipo,
      confirmButtonColor: '#a4243c'
    });
  }
  
  export async function mostrarConfirmacion(titulo, texto) {
    const resultado = await Swal.fire({
      title: titulo,
      text: texto,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#a4243c',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí',
      cancelButtonText: 'Cancelar'
    });
    return resultado.isConfirmed;
  }
  