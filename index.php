<?php
// Configuración inicial
$api_url = 'https://mercado-scraping.shop';
$search_endpoint = '/mercadolibre';
$excel_endpoint = '/descargarExcel';

// Procesar el formulario de búsqueda
$results = [];
$error = '';
$processing_time = '';
$num_products = 0;

if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['producto'])) {
    $producto = trim($_POST['producto']);
    
    if (!empty($producto)) {
        // Preparar los datos para la API
        $data = array('producto' => $producto);
        
        // Configurar la petición
        $ch = curl_init($api_url . $search_endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Content-Type: application/json',
            'Accept: application/json'
        ));
        
        // Ejecutar la petición
        $response = curl_exec($ch);
        
        if (curl_errno($ch)) {
            $error = 'Error en la búsqueda: ' . curl_error($ch);
        } else {
            $result = json_decode($response, true);
            if (isset($result['error'])) {
                $error = $result['error'];
            } else {
                $results = $result['datos'];
                $processing_time = $result['processing_time'];
                $num_products = $result['num_products'];
            }
        }
        
        curl_close($ch);
    } else {
        $error = 'Por favor ingrese un producto para buscar';
    }
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Búsqueda en MercadoLibre</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .product-card {
            height: 100%;
            transition: transform 0.2s;
        }
        .product-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .product-image {
            height: 200px;
            object-fit: contain;
        }
    </style>
</head>
<body>
    <div class="container py-5">
        <h1 class="text-center mb-4">Buscador de Productos en MercadoLibre</h1>
        
        <!-- Formulario de búsqueda -->
        <div class="row justify-content-center mb-5">
            <div class="col-md-6">
                <form method="POST" class="d-flex gap-2">
                    <input type="text" name="producto" class="form-control" placeholder="Ingrese el producto a buscar" required>
                    <button type="submit" class="btn btn-primary">Buscar</button>
                </form>
            </div>
        </div>

        <?php if ($error): ?>
            <div class="alert alert-danger" role="alert">
                <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>

        <?php if ($results): ?>
            <!-- Estadísticas de búsqueda -->
            <div class="alert alert-info">
                Se encontraron <?php echo $num_products; ?> productos en <?php echo number_format($processing_time, 2); ?> segundos
            </div>

            <!-- Botón de descarga Excel -->
            <form action="<?php echo $api_url . $excel_endpoint; ?>" method="POST" class="mb-4">
                <input type="hidden" name="data" value='<?php echo json_encode(array("datos" => $results)); ?>'>
                <button type="submit" class="btn btn-success">
                    Descargar resultados en Excel
                </button>
            </form>

            <!-- Resultados -->
            <div class="row row-cols-1 row-cols-md-3 g-4">
                <?php foreach ($results as $product): ?>
                    <div class="col">
                        <div class="card product-card">
                            <img src="<?php echo htmlspecialchars($product['imagenes']); ?>" 
                                 class="card-img-top product-image" 
                                 alt="<?php echo htmlspecialchars($product['titulo']); ?>">
                            <div class="card-body">
                                <h5 class="card-title"><?php echo htmlspecialchars($product['titulo']); ?></h5>
                                <p class="card-text">
                                    <strong>Vendedor:</strong> <?php echo htmlspecialchars($product['vendedor']); ?><br>
                                    <?php if ($product['precio_original'] != 'N/A'): ?>
                                        <strong>Precio Original:</strong> <?php echo htmlspecialchars($product['precio_original']); ?><br>
                                    <?php endif; ?>
                                    <strong>Precio:</strong> <?php echo htmlspecialchars($product['precio_con_descuento']); ?><br>
                                    <?php if ($product['descuento'] != 'N/A'): ?>
                                        <strong>Descuento:</strong> <?php echo htmlspecialchars($product['descuento']); ?><br>
                                    <?php endif; ?>
                                    <strong>Cuotas:</strong> <?php echo htmlspecialchars($product['cuotas']); ?><br>
                                    <strong>Envío:</strong> <?php echo htmlspecialchars($product['envios']); ?><br>
                                    <strong>Vendidos:</strong> <?php echo htmlspecialchars($product['cantidad_vendida']); ?>
                                </p>
                                <a href="<?php echo htmlspecialchars($product['url_producto']); ?>" 
                                   class="btn btn-primary" 
                                   target="_blank">
                                    Ver en MercadoLibre
                                </a>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>