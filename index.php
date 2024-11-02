<?php
// config.php
define('API_URL', 'https://mercado-scraping.shop');

// index.php
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Búsqueda MercadoLibre</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-4">
        <h1>Búsqueda de Productos en MercadoLibre</h1>
        
        <form method="POST" action="" class="mb-4">
            <div class="form-group">
                <input type="text" name="producto" class="form-control" 
                       placeholder="Ingrese producto a buscar" required
                       value="<?php echo isset($_POST['producto']) ? htmlspecialchars($_POST['producto']) : ''; ?>">
            </div>
            <button type="submit" class="btn btn-primary mt-2">Buscar</button>
        </form>

        <?php
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['producto'])) {
            $producto = $_POST['producto'];
            
            // Inicializar cURL para la búsqueda
            $ch = curl_init(API_URL . '/mercadolibre');
            
            // Configurar la petición POST
            $postData = json_encode(['producto' => $producto]);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $postData,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Content-Length: ' . strlen($postData)
                ]
            ]);
            
            // Ejecutar la petición
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            
            if ($httpCode === 200) {
                $data = json_decode($response, true);
                
                if (isset($data['datos']) && !empty($data['datos'])) {
                    ?>
                    <div class="mb-3">
                        <h3>Resultados encontrados: <?php echo count($data['datos']); ?></h3>
                        <p>Tiempo de procesamiento: <?php echo $data['processing_time']; ?> segundos</p>
                        
                        <form method="POST" action="download.php">
                            <input type="hidden" name="data" value="<?php echo htmlspecialchars(json_encode($data)); ?>">
                            <button type="submit" class="btn btn-success">Descargar Excel</button>
                        </form>
                    </div>

                    <?php foreach ($data['datos'] as $producto): ?>
                        <div class="card mb-3">
                            <div class="row g-0">
                                <div class="col-md-4">
                                    <img src="<?php echo htmlspecialchars($producto['imagenes']); ?>" 
                                         class="img-fluid rounded-start" 
                                         alt="<?php echo htmlspecialchars($producto['titulo']); ?>">
                                </div>
                                <div class="col-md-8">
                                    <div class="card-body">
                                        <h5 class="card-title"><?php echo htmlspecialchars($producto['titulo']); ?></h5>
                                        <p class="card-text">Vendedor: <?php echo htmlspecialchars($producto['vendedor']); ?></p>
                                        <p class="card-text">Precio original: <?php echo htmlspecialchars($producto['precio_original']); ?></p>
                                        <p class="card-text">Precio con descuento: <?php echo htmlspecialchars($producto['precio_con_descuento']); ?></p>
                                        <p class="card-text">Descuento: <?php echo htmlspecialchars($producto['descuento']); ?></p>
                                        <p class="card-text">Cuotas: <?php echo htmlspecialchars($producto['cuotas']); ?></p>
                                        <p class="card-text">Envío: <?php echo htmlspecialchars($producto['envios']); ?></p>
                                        <p class="card-text">Cantidad vendida: <?php echo htmlspecialchars($producto['cantidad_vendida']); ?></p>
                                        <a href="<?php echo htmlspecialchars($producto['url_producto']); ?>" 
                                           target="_blank" 
                                           class="btn btn-primary">Ver en MercadoLibre</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    <?php endforeach;
                } else {
                    echo '<div class="alert alert-info">No se encontraron productos</div>';
                }
            } else {
                echo '<div class="alert alert-danger">Error al buscar productos</div>';
            }
            
            curl_close($ch);
        }
        ?>
    </div>
</body>
</html>

<?php
// download.php
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['data'])) {
    $data = $_POST['data'];
    
    $ch = curl_init(API_URL . '/descargarExcel');
    
    $postData = [
        'data' => $data
    ];
    
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postData,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if ($httpCode === 200) {
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="productos_mercadolibre.xlsx"');
        header('Cache-Control: max-age=0');
        
        echo $response;
    } else {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(['error' => 'Error al descargar el archivo']);
    }
    
    curl_close($ch);
    exit;
}
?>