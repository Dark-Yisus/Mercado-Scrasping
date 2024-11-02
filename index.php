<?php
// index.php
header('Content-Type: text/html; charset=utf-8');
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buscador MercadoLibre</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .producto-card {
            border: 1px solid #ddd;
            padding: 15px;
            margin: 10px;
            border-radius: 8px;
        }
        .producto-imagen {
            max-width: 200px;
            height: auto;
        }
        #loading {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000;
            background: rgba(255, 255, 255, 0.8);
            padding: 20px;
            border-radius: 10px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container mt-4">
        <h2 class="mb-4">Buscador de Productos en MercadoLibre</h2>
        
        <form id="searchForm" class="mb-4">
            <div class="row">
                <div class="col-md-8">
                    <input type="text" id="producto" class="form-control" 
                           placeholder="Ingrese el producto a buscar" required>
                </div>
                <div class="col-md-4">
                    <button type="submit" class="btn btn-primary">Buscar</button>
                </div>
            </div>
        </form>

        <div id="loading" class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-2">Buscando productos...</p>
        </div>

        <div id="error" class="alert alert-danger" style="display: none;"></div>
        
        <div id="resultados" class="row"></div>
    </div>

    <script>
        const API_URL = '<?php echo getenv("API_URL") ?: "http://localhost:5000"; ?>';

        async function buscarProductos(producto) {
            try {
                const response = await fetch(`${API_URL}/mercadolibre`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ producto: producto })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Error en la petición: ${response.status} ${errorText}`);
                }

                return await response.json();
            } catch (error) {
                console.error('Error:', error);
                throw error;
            }
        }

        async function descargarExcel(data) {
            try {
                const formData = new FormData();
                formData.append('data', JSON.stringify(data));

                const response = await fetch(`${API_URL}/descargarExcel`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`Error en la descarga: ${response.status}`);
                }

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
                console.error('Error al descargar Excel:', error);
                throw error;
            }
        }

        document.getElementById('searchForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const loading = document.getElementById('loading');
            const error = document.getElementById('error');
            const resultados = document.getElementById('resultados');
            
            loading.style.display = 'block';
            error.style.display = 'none';
            resultados.innerHTML = '';

            try {
                const producto = document.getElementById('producto').value;
                const resultado = await buscarProductos(producto);
                
                if (resultado.datos && resultado.datos.length > 0) {
                    resultado.datos.forEach(producto => {
                        const card = document.createElement('div');
                        card.className = 'col-md-4 mb-4';
                        card.innerHTML = `
                            <div class="producto-card">
                                <img src="${producto.imagenes}" alt="${producto.titulo}" 
                                     class="producto-imagen mb-3">
                                <h5>${producto.titulo}</h5>
                                <p class="mb-2">Precio: ${producto.precio_con_descuento}</p>
                                <p class="mb-2">Vendedor: ${producto.vendedor}</p>
                                ${producto.descuento !== 'N/A' ? 
                                    `<p class="text-success">Descuento: ${producto.descuento}</p>` : ''}
                                <p class="mb-2">Envío: ${producto.envios}</p>
                                <a href="${producto.url_producto}" target="_blank" 
                                   class="btn btn-sm btn-primary">Ver en MercadoLibre</a>
                            </div>
                        `;
                        resultados.appendChild(card);
                    });

                    // Agregar botón para descargar Excel
                    const excelButton = document.createElement('div');
                    excelButton.className = 'col-12 text-center mt-3';
                    excelButton.innerHTML = `
                        <button onclick="descargarExcel(${JSON.stringify(resultado)})" 
                                class="btn btn-success">
                            Descargar Excel
                        </button>
                    `;
                    resultados.appendChild(excelButton);
                } else {
                    resultados.innerHTML = '<div class="col-12"><p>No se encontraron productos</p></div>';
                }
            } catch (error) {
                error.style.display = 'block';
                error.textContent = error.message;
            } finally {
                loading.style.display = 'none';
            }
        });
    </script>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>