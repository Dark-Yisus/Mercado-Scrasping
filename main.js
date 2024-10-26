// const api = new MercadoLibreAPI();
// let datosActuales = null;
// let ordenActual = {
//     columna: null,
//     ascendente: true
// };

// async function realizarBusqueda() {
//     const searchTerm = document.getElementById('searchInput').value.trim();
//     if (!searchTerm) {
//         alert('Por favor, ingrese un término de búsqueda');
//         return;
//     }

//     mostrarCargando(true);
//     try {
//         const resultado = await api.buscarProductos(searchTerm);
//         datosActuales = resultado.datos;
//         mostrarResultados(datosActuales);
//         document.getElementById('btnDescargar').disabled = false;
//     } catch (error) {
//         console.error('Error en la búsqueda:', error);
//         alert('Error al realizar la búsqueda. Por favor, intente nuevamente.');
//     } finally {
//         mostrarCargando(false);
//     }
// }

// function mostrarResultados(datos) {
//     const tbody = document.getElementById('resultsTable');
//     tbody.innerHTML = '';

//     if (!datos.titulos || datos.titulos.length === 0) {
//         tbody.innerHTML = '<tr><td colspan="9" class="text-center">No se encontraron resultados</td></tr>';
//         return;
//     }

//     for (let i = 0; i < datos.titulos.length; i++) {
//         const row = document.createElement('tr');
//         row.innerHTML = `
//             <td><img src="${datos.imagenes[i]}" class="product-image" alt="Producto"></td>
//             <td>${datos.titulos[i]}</td>
//             <td>${datos.vendedor[i]}</td>
//             <td>${datos.precio_original[i]}</td>
//             <td>${datos.precio_con_descuento[i]}</td>
//             <td>${datos.descuentos[i]}</td>
//             <td>${datos.cuotas_container[i]}</td>
//             <td>${datos.envio[i]}</td>
//             <td>${datos.cantidades[i]}</td>
//         `;
//         tbody.appendChild(row);
//     }
// }

// function ordenarTabla(columna) {
//     if (!datosActuales) return;

//     if (ordenActual.columna === columna) {
//         ordenActual.ascendente = !ordenActual.ascendente;
//     } else {
//         ordenActual.columna = columna;
//         ordenActual.ascendente = true;
//     }

//     const indices = Array.from(Array(datosActuales.titulos.length).keys());
    
//     indices.sort((a, b) => {
//         let valorA, valorB;
        
//         switch(columna) {
//             case 'titulo':
//                 valorA = datosActuales.titulos[a];
//                 valorB = datosActuales.titulos[b];
//                 break;
//             case 'vendedor':
//                 valorA = datosActuales.vendedor[a];
//                 valorB = datosActuales.vendedor[b];
//                 break;
//             case 'precio':
//                 valorA = convertirPrecio(datosActuales.precio_original[a]);
//                 valorB = convertirPrecio(datosActuales.precio_original[b]);
//                 break;
//             case 'precioDescuento':
//                 valorA = convertirPrecio(datosActuales.precio_con_descuento[a]);
//                 valorB = convertirPrecio(datosActuales.precio_con_descuento[b]);
//                 break;
//             case 'vendidos':
//                 valorA = parseInt(datosActuales.cantidades[a]) || 0;
//                 valorB = parseInt(datosActuales.cantidades[b]) || 0;
//                 break;
//         }

//         if (valorA < valorB) return ordenActual.ascendente ? -1 : 1;
//         if (valorA > valorB) return ordenActual.ascendente ? 1 : -1;
//         return 0;
//     });

//     const datosOrdenados = {
//         titulos: indices.map(i => datosActuales.titulos[i]),
//         vendedor: indices.map(i => datosActuales.vendedor[i]),
//         urls: indices.map(i => datosActuales.urls[i]),
//         precio_original: indices.map(i => datosActuales.precio_original[i]),
//         precio_con_descuento: indices.map(i => datosActuales.precio_con_descuento[i]),
//         descuentos: indices.map(i => datosActuales.descuentos[i]),
//         cuotas_container: indices.map(i => datosActuales.cuotas_container[i]),
//         envio: indices.map(i => datosActuales.envio[i]),
//         cantidades: indices.map(i => datosActuales.cantidades[i]),
//         imagenes: indices.map(i => datosActuales.imagenes[i])
//     };

//     mostrarResultados(datosOrdenados);
// }

// function convertirPrecio(precio) {
//     if (typeof precio !== 'string') return 0;
//     const numero = precio.replace(/[^\d.,]/g, '').replace(',', '.');
//     return parseFloat(numero) || 0;
// }

// async function descargarExcelActual() {
//     if (!datosActuales) {
//         alert('No hay datos para descargar');
//         return;
//     }

//     mostrarCargando(true);
//     try {
//         await api.descargarExcel(datosActuales);
//     } catch (error) {
//         console.error('Error al descargar Excel:', error);
//         alert('Error al descargar el archivo Excel');
//     } finally {
//         mostrarCargando(false);
//     }
// }

// function mostrarCargando(mostrar) {
//     const loading = document.getElementById('loadingIndicator');
//     loading.style.display = mostrar ? 'flex' : 'none';
// }