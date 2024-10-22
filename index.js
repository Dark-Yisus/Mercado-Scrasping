class ClienteMercadoLibre {
    constructor(urlBase = 'http://localhost:5000') {
        this.urlBase = urlBase;
    }

    /**
     * Buscar productos en MercadoLibre
     * @param {string} producto - Nombre del producto a buscar
     * @returns {Promise} - Promesa con los resultados de la búsqueda
     */
    async buscarProductos(producto) {
        try {
            const respuesta = await fetch(`${this.urlBase}/mercadolibre`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ producto })
            });

            if (!respuesta.ok) {
                throw new Error(`¡Error HTTP! estado: ${respuesta.status}`);
            }

            const datos = await respuesta.json();
            return datos;
        } catch (error) {
            console.error('Error al buscar productos:', error);
            throw error;
        }
    }

    /**
     * Descargar información de productos en formato Excel
     * @param {Object} datos - Datos de productos para exportar
     * @returns {Promise} - Promesa con el archivo Excel en formato blob
     */
    async descargarExcel(datos) {
        try {
            const formData = new FormData();
            formData.append('data', JSON.stringify(datos));

            const respuesta = await fetch(`${this.urlBase}/descargarExcel`, {
                method: 'POST',
                body: formData
            });

            if (!respuesta.ok) {
                throw new Error(`¡Error HTTP! estado: ${respuesta.status}`);
            }

            const blob = await respuesta.blob();
            return blob;
        } catch (error) {
            console.error('Error al descargar Excel:', error);
            throw error;
        }
    }
}

// Ejemplo de uso del cliente
const cliente = new ClienteMercadoLibre();

// Función para mostrar resultados en la interfaz
function mostrarResultados(datos) {
    const contenedorProductos = document.getElementById('contenedor-productos');
    contenedorProductos.innerHTML = '';

    datos.datos.titulos.forEach((titulo, indice) => {
        const tarjetaProducto = document.createElement('div');
        tarjetaProducto.className = 'tarjeta-producto';
        tarjetaProducto.innerHTML = `
            <img src="${datos.datos.imagenes[indice]}" alt="${titulo}" class="imagen-producto">
            <h3>${titulo}</h3>
            <p>Vendedor: ${datos.datos.vendedor[indice]}</p>
            <p>Precio original: ${datos.datos.precio_original[indice]}</p>
            <p>Precio con descuento: ${datos.datos.precio_con_descuento[indice]}</p>
            <p>Descuento: ${datos.datos.descuentos[indice]}</p>
            <p>Cuotas: ${datos.datos.cuotas_container[indice]}</p>
            <p>Envío: ${datos.datos.envio[indice]}</p>
            <a href="${datos.datos.urls[indice]}" target="_blank">Ver en MercadoLibre</a>
        `;
        contenedorProductos.appendChild(tarjetaProducto);
    });
}

// Función para manejar el envío del formulario de búsqueda
async function manejarBusqueda(evento) {
    evento.preventDefault();
    const inputBusqueda = document.getElementById('input-busqueda');
    const indicadorCarga = document.getElementById('indicador-carga');
    const mensajeError = document.getElementById('mensaje-error');

    try {
        indicadorCarga.style.display = 'block';
        mensajeError.style.display = 'none';

        const datos = await cliente.buscarProductos(inputBusqueda.value);
        mostrarResultados(datos);

        // Habilitar botón de exportación
        const botonExportar = document.getElementById('boton-exportar');
        botonExportar.disabled = false;
        botonExportar.onclick = async () => {
            const blob = await cliente.descargarExcel(datos.datos);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'productos_mercadolibre.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        };

    } catch (error) {
        mensajeError.textContent = 'Error al buscar productos: ' + error.message;
        mensajeError.style.display = 'block';
    } finally {
        indicadorCarga.style.display = 'none';
    }
}