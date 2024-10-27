// // Cliente API MercadoLibre
// class MercadoLibreAPI {
//     constructor(baseURL = 'http://localhost:5000') {
//         this.baseURL = baseURL;
//     }

//     /**
//      * Buscar productos en MercadoLibre
//      * @param {string} producto - Nombre del producto a buscar
//      * @returns {Promise} - Promesa con los resultados de la búsqueda
//      */
//     async buscarProductos(producto) {
//         try {
//             const respuesta = await fetch(`${this.baseURL}/mercadolibre`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({ producto })
//             });

//             if (!respuesta.ok) {
//                 throw new Error(`¡Error HTTP! estado: ${respuesta.status}`);
//             }

//             const datos = await respuesta.json();
//             return datos;
//         } catch (error) {
//             console.error('Error al buscar productos:', error);
//             throw error;
//         }
//     }

//     /**
//      * Descargar datos de productos como archivo Excel
//      * @param {Object} datos - Datos de productos para exportar
//      * @returns {Promise} - Promesa que se resuelve cuando comienza la descarga del archivo
//      */
//     async descargarExcel(datos) {
//         try {
//             const formData = new FormData();
//             formData.append('data', JSON.stringify(datos));

//             const respuesta = await fetch(`${this.baseURL}/descargarExcel`, {
//                 method: 'POST',
//                 body: formData
//             });

//             if (!respuesta.ok) {
//                 throw new Error(`¡Error HTTP! estado: ${respuesta.status}`);
//             }

//             // Crear un blob desde la respuesta y descargarlo
//             const blob = await respuesta.blob();
//             const url = window.URL.createObjectURL(blob);
//             const a = document.createElement('a');
//             a.style.display = 'none';
//             a.href = url;
//             a.download = 'productos_mercadolibre.xlsx';
//             document.body.appendChild(a);
//             a.click();
//             window.URL.revokeObjectURL(url);
//             a.remove();
//         } catch (error) {
//             console.error('Error al descargar Excel:', error);
//             throw error;
//         }
//     }
// }

// // Ejemplo de uso con async/await
// const api = new MercadoLibreAPI();

// // Función de ejemplo para buscar y mostrar productos
// async function buscarYMostrarProductos(nombreProducto) {
//     try {
//         // Mostrar estado de carga
//         console.log('Buscando productos...');
        
//         // Buscar productos
//         const resultado = await api.buscarProductos(nombreProducto);
        
//         // Mostrar resultados
//         console.log(`Se encontraron ${resultado.num_products} productos`);
//         console.log('Productos:', resultado.datos);
        
//         // Descargar Excel si es necesario
//         const descargarExcel = confirm('¿Desea descargar los resultados en Excel?');
//         if (descargarExcel) {
//             await api.descargarExcel(resultado.datos);
//         }
//     } catch (error) {
//         console.error('Error:', error);
//     }
// }

// // Función de ejemplo para descargar Excel directamente
// async function descargarProductosExcel(datosProductos) {
//     try {
//         await api.descargarExcel(datosProductos);
//         console.log('Archivo Excel descargado exitosamente');
//     } catch (error) {
//         console.error('Error al descargar Excel:', error);
//     }
// }

// Constants for API endpoints
const API_BASE_URL = 'http://localhost:5000';
const SEARCH_ENDPOINT = `${API_BASE_URL}/mercadolibre`;
const DOWNLOAD_ENDPOINT = `${API_BASE_URL}/descargarExcel`;

class MercadoLibreAPI {
    /**
     * Search for products in MercadoLibre
     * @param {string} productName - Name of the product to search
     * @returns {Promise} Promise object with search results
     */
    static async searchProducts(productName) {
        try {
            const response = await fetch(SEARCH_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ producto: productName })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error searching products:', error);
            throw error;
        }
    }

    /**
     * Download search results as Excel file
     * @param {Object} searchData - Data returned from searchProducts
     * @returns {Promise} Promise object representing the Excel file download
     */
    static async downloadExcel(searchData) {
        try {
            const formData = new FormData();
            formData.append('data', JSON.stringify(searchData));

            const response = await fetch(DOWNLOAD_ENDPOINT, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Create blob from response and download it
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'productos_mercadolibre.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading Excel:', error);
            throw error;
        }
    }
}

// Example usage:
async function searchAndDownload() {
    try {
        // Show loading state
        const loadingElement = document.getElementById('loading');
        if (loadingElement) loadingElement.style.display = 'block';

        // Search for products
        const searchResults = await MercadoLibreAPI.searchProducts('laptop');
        console.log('Search results:', searchResults);

        // Update UI with results
        const resultsElement = document.getElementById('results');
        if (resultsElement) {
            resultsElement.innerHTML = searchResults.datos
                .map(product => `
                    <div class="product">
                        <h3>${product.titulo}</h3>
                        <p>Precio: ${product.precio_con_descuento}</p>
                        <p>Vendedor: ${product.vendedor}</p>
                        ${product.imagenes !== 'N/A' ? 
                            `<img src="${product.imagenes}" alt="${product.titulo}" style="max-width: 200px;">` : 
                            ''}
                    </div>
                `).join('');
        }

        // Download results
        await MercadoLibreAPI.downloadExcel(searchResults);

    } catch (error) {
        console.error('Error in search and download process:', error);
        // Update UI to show error
        const errorElement = document.getElementById('error');
        if (errorElement) errorElement.textContent = `Error: ${error.message}`;
    } finally {
        // Hide loading state
        const loadingElement = document.getElementById('loading');
        if (loadingElement) loadingElement.style.display = 'none';
    }
}