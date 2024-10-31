// Módulo cliente de la API de MercadoLibre
const URL_BASE_API = 'https://mercado-scraping.shop'; // Reemplaza con tu dominio real de la API

class ClienteMercadoLibre {
    /**
     * Busca productos en MercadoLibre
     * @param {string} producto - Nombre del producto a buscar
     * @returns {Promise} Promesa con los resultados de la búsqueda
     */
    static async buscarProductos(producto) {
        try {
            const respuesta = await fetch(`${URL_BASE_API}/mercadolibre`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ producto })
            });

            if (!respuesta.ok) {
                const datosError = await respuesta.json();
                throw new Error(datosError.error || 'Error al buscar productos');
            }

            return await respuesta.json();
        } catch (error) {
            console.error('Error al buscar productos:', error);
            throw error;
        }
    }

    /**
     * Descarga los resultados de búsqueda como archivo Excel
     * @param {Object} datos - Datos de los resultados de búsqueda
     * @returns {Promise} Promesa que representa la descarga del archivo
     */
    static async descargarExcel(datos) {
        try {
            // Crear FormData
            const formData = new FormData();
            formData.append('data', JSON.stringify(datos));

            const respuesta = await fetch(`${URL_BASE_API}/descargarExcel`, {
                method: 'POST',
                body: formData
            });

            if (!respuesta.ok) {
                const datosError = await respuesta.json();
                throw new Error(datosError.error || 'Error al descargar el archivo Excel');
            }

            // Crear blob desde la respuesta
            const blob = await respuesta.blob();
            
            // Crear enlace de descarga
            const url = window.URL.createObjectURL(blob);
            const enlaceDescarga = document.createElement('a');
            enlaceDescarga.href = url;
            enlaceDescarga.download = 'productos_mercadolibre.xlsx';
            
            // Iniciar descarga
            document.body.appendChild(enlaceDescarga);
            enlaceDescarga.click();
            
            // Limpieza
            window.URL.revokeObjectURL(url);
            document.body.removeChild(enlaceDescarga);
        } catch (error) {
            console.error('Error al descargar Excel:', error);
            throw error;
        }
    }
}

// Ejemplo de uso con async/await
async function ejemplo() {
    try {
        // Buscar productos
        const resultadosBusqueda = await ClienteMercadoLibre.buscarProductos('laptop');
        console.log('Resultados de búsqueda:', resultadosBusqueda);
        
        // Descargar resultados como Excel
        if (resultadosBusqueda.datos && resultadosBusqueda.datos.length > 0) {
            await ClienteMercadoLibre.descargarExcel(resultadosBusqueda);
            console.log('Archivo Excel descargado exitosamente');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Ejemplo de uso con promesas
function ejemploConPromesas() {
    ClienteMercadoLibre.buscarProductos('smartphone')
        .then(resultados => {
            console.log('Resultados de búsqueda:', resultados);
            if (resultados.datos && resultados.datos.length > 0) {
                return ClienteMercadoLibre.descargarExcel(resultados);
            }
        })
        .then(() => {
            console.log('Archivo Excel descargado exitosamente');
        })
        .catch(error => {
            console.error('Error:', error.message);
        });
}

export default ClienteMercadoLibre;