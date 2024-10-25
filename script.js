class ClienteMercadoLibre {
    constructor(urlBase = 'http://localhost:5000') {
        this.urlBase = urlBase;
        console.log('Cliente inicializado con URL base:', urlBase);
    }

    async buscarProductos(producto) {
        try {
            console.log('Iniciando búsqueda para:', producto);
            console.log('URL de búsqueda:', `${this.urlBase}/mercadolibre`);

            const respuesta = await fetch(`${this.urlBase}/mercadolibre`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Agregamos headers para CORS
                    'Accept': 'application/json',
                },
                // Agregamos credentials para cookies si es necesario
                credentials: 'include',
                body: JSON.stringify({ producto })
            });

            console.log('Status de la respuesta:', respuesta.status);
            console.log('Headers de la respuesta:', [...respuesta.headers.entries()]);

            if (!respuesta.ok) {
                throw new Error(`Error HTTP: ${respuesta.status} - ${respuesta.statusText}`);
            }

            const datos = await respuesta.json();
            console.log('Datos recibidos:', datos);
            return datos;
        } catch (error) {
            console.error('Error detallado al buscar productos:', {
                mensaje: error.message,
                tipo: error.name,
                stack: error.stack
            });
            if (error instanceof TypeError && error.message === 'Failed to fetch') {
                throw new Error('No se pudo conectar con el servidor. Por favor, verifica que el servidor esté corriendo en ' + this.urlBase);
            }
            throw error;
        }
    }

    async descargarExcel(datos) {
        try {
            console.log('Iniciando descarga de Excel');
            const formData = new FormData();
            formData.append('data', JSON.stringify(datos));

            const respuesta = await fetch(`${this.urlBase}/descargarExcel`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (!respuesta.ok) {
                throw new Error(`Error HTTP: ${respuesta.status} - ${respuesta.statusText}`);
            }

            const blob = await respuesta.blob();
            return blob;
        } catch (error) {
            console.error('Error al descargar Excel:', error);
            throw error;
        }
    }
}

// Inicializar el cliente
const cliente = new ClienteMercadoLibre();

function mostrarResultados(datos) {
    const contenedorProductos = document.getElementById('contenedor-productos');
    contenedorProductos.innerHTML = '';

    if (!datos.datos || !datos.datos.titulos || datos.datos.titulos.length === 0) {
        contenedorProductos.innerHTML = '<p>No se encontraron productos</p>';
        return;
    }

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

async function manejarBusqueda(evento) {
    evento.preventDefault();
    const inputBusqueda = document.getElementById('input-busqueda');
    const indicadorCarga = document.getElementById('indicador-carga');
    const mensajeError = document.getElementById('mensaje-error');
    const botonBuscar = document.querySelector('button[type="submit"]');
    const botonExportar = document.getElementById('boton-exportar');
    const contenedorProductos = document.getElementById('contenedor-productos');

    try {
        // Validar entrada
        if (!inputBusqueda.value.trim()) {
            throw new Error('Por favor ingrese un término de búsqueda');
        }

        // Resetear estado
        botonBuscar.disabled = true;
        indicadorCarga.style.display = 'block';
        mensajeError.style.display = 'none';
        botonExportar.disabled = true;
        contenedorProductos.innerHTML = '';

        console.log('Iniciando búsqueda para:', inputBusqueda.value);
        const datos = await cliente.buscarProductos(inputBusqueda.value);
        
        mostrarResultados(datos);

        // Configurar botón de exportación
        botonExportar.disabled = false;
        botonExportar.onclick = async () => {
            try {
                botonExportar.disabled = true;
                indicadorCarga.style.display = 'block';
                
                const blob = await cliente.descargarExcel(datos.datos);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'productos_mercadolibre.xlsx';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error) {
                mensajeError.textContent = 'Error al descargar Excel: ' + error.message;
                mensajeError.style.display = 'block';
            } finally {
                botonExportar.disabled = false;
                indicadorCarga.style.display = 'none';
            }
        };

    } catch (error) {
        mensajeError.textContent = error.message;
        mensajeError.style.display = 'block';
    } finally {
        botonBuscar.disabled = false;
        indicadorCarga.style.display = 'none';
    }
}