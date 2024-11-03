<?php
// config.php
return [
    'api_url' => getenv('API_URL') ?: 'http://localhost:5000',
    'allowed_origins' => [
        'http://localhost:5000',
        'https://mercado-scraping.shop',
        'https://mercado-scraping.shop'
    ]
];