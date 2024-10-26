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