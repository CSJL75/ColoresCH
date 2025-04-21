// productosService.js

// Función para obtener los productos desde la API
export function obtenerProductos() {
    return fetch('/api/productos')
      .then(res => res.json())
      .catch(error => {
        console.error('Error al obtener productos:', error);
        throw error;
      });
  }
  
  // Función para obtener productos específicos para mayoreo
  export function obtenerProductosMayoreo() {
    return fetch('/api/productos/mayoreo')
      .then(res => res.json())
      .catch(error => {
        console.error('Error al obtener productos de mayoreo:', error);
        throw error;
      });
  }
  