from flask import Flask, request, jsonify, render_template, send_file
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import re
import time
from datetime import datetime, timedelta
import logging
from pymongo import MongoClient, UpdateOne
from bson import json_util
import pandas as pd
from openpyxl.utils import get_column_letter
from io import BytesIO

app = Flask(__name__)
CORS(app)  # Enable CORS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB configuration
client = MongoClient('mongodb://localhost:27017/')
db = client['mercadolibre_db']
collection = db['productos']

def extraer_detalles_producto(url_producto, headers):
    try:
        r_producto = None
        for _ in range(3):  # Try up to 3 times
            r_producto = requests.get(url_producto, headers=headers)
            if r_producto.status_code == 200:
                break
            logger.warning(f"Retrying product page access: {url_producto}")
            time.sleep(2)

        if r_producto and r_producto.status_code == 200:
            soup_producto = BeautifulSoup(r_producto.content, 'html.parser')

            # Extract seller information
            vendedor_tag = soup_producto.find('div', class_='ui-pdp-seller__header__title')
            vendedor = vendedor_tag.get_text(strip=True) if vendedor_tag else 'N/A'
            
            # Extract prices
            precio_original = 'N/A'
            precio_con_descuento = 'N/A'
            descuento = 'N/A'

            precio_original_tag = soup_producto.find('s', class_='andes-money-amount ui-pdp-price__part ui-pdp-price__original-value andes-money-amount--previous andes-money-amount--cents-superscript andes-money-amount--compact')
            if precio_original_tag:
                precio_original = precio_original_tag.text.strip()

            precio_con_descuento_tag = soup_producto.find('div', class_='ui-pdp-price__second-line')
            if precio_con_descuento_tag:
                precio_descuento = precio_con_descuento_tag.find('span', class_='andes-money-amount__fraction')
                if precio_descuento:
                    precio_con_descuento = precio_descuento.text.strip()

            descuento_tag = soup_producto.find('span', class_='ui-pdp-price__second-line__label')
            if descuento_tag:
                descuento = descuento_tag.text.strip()

            # Extract payment terms
            cuotas_pago = 'N/A'
            cuotas_container = soup_producto.find('div', class_='ui-pdp-payment')
            if cuotas_container:
                cuotas_text = cuotas_container.get_text(strip=True)
                cuotas_match = re.search(r'(\d+)x\s*(\$[\d,.]+)\s*(sin interés|con interés)?', cuotas_text)
                if cuotas_match:
                    cuotas_pago = f"{cuotas_match.group(1)}x {cuotas_match.group(2)} {cuotas_match.group(3) or ''}"

            # Extract interest-free months
            meses_sin_intereses = 'N/A'
            meses_sin_intereses_tag = soup_producto.find('span', class_='ui-pdp-color--GREEN')
            if meses_sin_intereses_tag:
                meses_sin_intereses = meses_sin_intereses_tag.get_text(strip=True)

            # Extract shipping information
            envio_tag = soup_producto.find('p', class_='ui-pdp-color--BLACK ui-pdp-family--REGULAR ui-pdp-media__title')
            envio = envio_tag.get_text(strip=True) if envio_tag else 'N/A'

            # Extract quantity sold
            cantidad_vendida = 'N/A'
            cantidad_tag = soup_producto.find('span', class_='ui-pdp-subtitle')
            if cantidad_tag:
                cantidad_match = re.search(r'(\d+)\s+vendidos?', cantidad_tag.text)
                if cantidad_match:
                    cantidad_vendida = cantidad_match.group(1)

            # Extract image
            imagen_tag = soup_producto.find('img', class_='ui-pdp-image ui-pdp-gallery__figure__image')
            imagen = imagen_tag['src'] if imagen_tag and 'src' in imagen_tag.attrs else 'N/A'

            return {
                'vendedor': vendedor,
                'precio_original': precio_original,
                'precio_con_descuento': precio_con_descuento,
                'descuento': descuento,
                'cuotas': cuotas_pago,
                'meses_sin_intereses': meses_sin_intereses,
                'envios': envio,
                'cantidad_vendida': cantidad_vendida,
                'imagenes': imagen
            }
        logger.error(f"Could not access product page: {url_producto}")
        return None
    except Exception as e:
        logger.error(f"Error processing product page {url_producto}: {e}")
        return None

def buscar_producto_api(producto):
    try:
        url = f'https://api.mercadolibre.com/sites/MLM/search?q={producto}'
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error searching product in API: {e}")
        return None

def guardar_productos_en_db(datos_productos):
    if datos_productos:
        try:
            operations = []
            for producto in datos_productos:
                filter_query = {"url_producto": producto["url_producto"]}
                update_query = {"$set": producto}
                operations.append(UpdateOne(filter_query, update_query, upsert=True))
            
            result = collection.bulk_write(operations)
            logger.info(f"Saved/updated {result.upserted_count + result.modified_count} products in database.")
        except Exception as e:
            logger.error(f"Error inserting/updating products in MongoDB: {e}")

def todoProducto(producto):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    start_time = datetime.now()
    time_limit = timedelta(hours=1)
    productos_a_guardar = []

    resultado_api = buscar_producto_api(producto)
    if not resultado_api:
        return [], [], [], [], [], [], [], [], [], [], []

    for item in resultado_api['results']:
        if datetime.now() - start_time > time_limit:
            logger.info("Time limit reached. Stopping extraction.")
            break

        url_producto = item['permalink']
        detalles = extraer_detalles_producto(url_producto, headers)

        if detalles:
            producto_data = {
                "titulo": item['title'],
                "url_producto": url_producto,
                "vendedor": detalles['vendedor'],
                "precio_original": detalles['precio_original'],
                "precio_con_descuento": detalles['precio_con_descuento'],
                "descuento": detalles['descuento'],
                "cuotas": detalles['cuotas'],
                "meses_sin_intereses": detalles['meses_sin_intereses'],
                "envios": detalles['envios'],
                "cantidad_vendida": detalles['cantidad_vendida'],
                "imagenes": detalles['imagenes'],
                "fecha_extraccion": datetime.now()
            }
            productos_a_guardar.append(producto_data)

        time.sleep(1)  # Pause to avoid overloading

    # Save to MongoDB
    guardar_productos_en_db(productos_a_guardar)

    # Prepare lists to return
    titulos = [p['titulo'] for p in productos_a_guardar]
    urls = [p['url_producto'] for p in productos_a_guardar]
    vendedores = [p['vendedor'] for p in productos_a_guardar]
    precios_originales = [p['precio_original'] for p in productos_a_guardar]
    precios_con_descuento = [p['precio_con_descuento'] for p in productos_a_guardar]
    descuentos = [p['descuento'] for p in productos_a_guardar]
    cuotas = [p['cuotas'] for p in productos_a_guardar]
    meses_sin_intereses = [p['meses_sin_intereses'] for p in productos_a_guardar]
    envios = [p['envios'] for p in productos_a_guardar]
    cantidad_vendida = [p['cantidad_vendida'] for p in productos_a_guardar]
    imagenes = [p['imagenes'] for p in productos_a_guardar]

    return (titulos, urls, vendedores, precios_originales, precios_con_descuento,
            descuentos, cuotas, meses_sin_intereses, envios, cantidad_vendida, imagenes)

@app.route('/mercadolibre', methods=['POST'])
def mercadoLibre():
    try:
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400
            
        datos = request.get_json()
        if not datos or 'producto' not in datos:
            return jsonify({"error": "Product name not provided"}), 400
            
        producto = datos['producto']
        tiempo_inicio = datetime.now()
        
        resultados = todoProducto(producto)
        if not resultados[0]:  # If no titles found
            return jsonify({"error": "No products found"}), 404
            
        titulos, urls, vendedores, precios_originales, precios_con_descuento, \
        descuentos, cuotas, meses_sin_intereses, envios, cantidad_vendida, imagenes = resultados
        
        tiempo_fin = datetime.now()
        tiempo_procesamiento = (tiempo_fin - tiempo_inicio).total_seconds()
        
        return jsonify({
            "datos": {
                "titulos": titulos,
                "urls": urls,
                "vendedor": vendedores,
                "precio_original": precios_originales,
                "precio_con_descuento": precios_con_descuento,
                "descuentos": descuentos,
                "cuotas_container": cuotas,
                "meses_intereses": meses_sin_intereses,
                "envio": envios,
                "cantidades": cantidad_vendida,
                "imagenes": imagenes
            },
            "num_productos": len(titulos),
            "tiempo_procesamiento": tiempo_procesamiento
        })
    except Exception as e:
        logger.error(f"Unexpected error in mercadoLibre: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/descargarExcel', methods=['POST'])
def descargarExcel():
    try:
        if 'data' not in request.form:
            return jsonify({"error": "No data provided"}), 400
            
        datos = json_util.loads(request.form.get('data'))
        
        # Create DataFrame
        df = pd.DataFrame({
            'Título': datos['titulos'],
            'Vendedor': datos['vendedor'],
            'URL': datos['urls'],
            'Precio Original': datos['precio_original'],
            'Precio con Descuento': datos['precio_con_descuento'],
            'Descuento': datos['descuentos'],
            'Cuotas': datos['cuotas_container'],
            'Meses sin Intereses': datos['meses_intereses'],
            'Envío': datos['envio'],
            'Cantidad': datos['cantidades'],
            'URL de Imagen': datos['imagenes']
        })
        
        # Create Excel file
        archivo_excel = BytesIO()
        with pd.ExcelWriter(archivo_excel, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Productos')
            hoja = writer.sheets['Productos']
            
            # Adjust column widths
            for idx, col in enumerate(df.columns):
                max_largo = max(
                    df[col].astype(str).apply(len).max(),
                    len(str(col))
                )
                hoja.column_dimensions[get_column_letter(idx + 1)].width = max_largo + 2
        
        archivo_excel.seek(0)
        
        return send_file(
            archivo_excel,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='productos_mercadolibre.xlsx'
        )
    except Exception as e:
        logger.error(f"Error generating Excel file: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)