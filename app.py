from flask import Flask, request, jsonify, render_template, send_file
import requests
from bs4 import BeautifulSoup
import re
import time
from datetime import datetime, timedelta
import logging
from pymongo import MongoClient, UpdateOne
from bson import json_util
import pandas as pd
from openpyxl import Workbook
from openpyxl.utils import get_column_letter
from openpyxl.drawing.image import Image
from io import BytesIO
import urllib.request

app = Flask(__name__)

# Configurar el registro de logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración de MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['mercadolibre_db']
collection = db['productos']

def extraer_detalles_producto(url_producto, headers):
    try:
        r_producto = None
        for _ in range(3):  # Intentar hasta 3 veces
            r_producto = requests.get(url_producto, headers=headers)
            if r_producto.status_code == 200:
                break
            else:
                logger.warning(f"Reintentando acceder a la página del producto: {url_producto}")
                time.sleep(2)  # Esperar 2 segundos antes de reintentar

        if r_producto and r_producto.status_code == 200:
            soup_producto = BeautifulSoup(r_producto.content, 'html.parser')

            # Extraer información relevante
            vendedor_tag = soup_producto.find('div', class_='ui-pdp-seller__header__title')
            vendedor = vendedor_tag.get_text(strip=True) if vendedor_tag else 'N/A'
            
            # Extraer precios
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

            # Extraer cuotas de pago
            cuotas_pago = 'N/A'
            cuotas_container = soup_producto.find('div', class_='ui-pdp-payment')
            if cuotas_container:
                cuotas_text = cuotas_container.get_text(strip=True)
                cuotas_match = re.search(r'(\d+)x\s*(\$[\d,.]+)\s*(sin interés|con interés)?', cuotas_text)
                if cuotas_match:
                    cuotas_pago = f"{cuotas_match.group(1)}x {cuotas_match.group(2)} {cuotas_match.group(3) or ''}"

            # Extraer meses sin intereses
            meses_sin_intereses = 'N/A'
            meses_sin_intereses_tag = soup_producto.find('span', class_='ui-pdp-color--GREEN')
            if meses_sin_intereses_tag:
                meses_sin_intereses = meses_sin_intereses_tag.get_text(strip=True)

            # Extraer envío
            envio_tag = soup_producto.find('p', class_='ui-pdp-color--BLACK ui-pdp-family--REGULAR ui-pdp-media__title')
            envio = envio_tag.get_text(strip=True) if envio_tag else 'N/A'

            # Extraer cantidad vendida
            cantidad_vendida = 'N/A'
            cantidad_tag = soup_producto.find('span', class_='ui-pdp-subtitle')
            if cantidad_tag:
                cantidad_match = re.search(r'(\d+)\s+vendidos?', cantidad_tag.text)
                if cantidad_match:
                    cantidad_vendida = cantidad_match.group(1)

            # Extraer imagen
            imagen_tag = soup_producto.find('img', class_='ui-pdp-image ui-pdp-gallery__figure__image')
            imagen = imagen_tag['src'] if imagen_tag and 'src' in imagen_tag.attrs else 'N/A'

            # Procesar y devolver los datos
            datos_producto = {
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
            return datos_producto
        else:
            logger.error(f"No se pudo acceder a la página del producto: {url_producto}")
            return None
    except Exception as e:
        logger.error(f"Error al procesar la página del producto {url_producto}: {e}")
        return None

def buscar_producto_api(producto):
    try:
        url = f'https://api.mercadolibre.com/sites/MLM/search?q={producto}'
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error al buscar producto en la API: {e}")
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
            logger.info(f"Se han guardado/actualizado {result.upserted_count + result.modified_count} productos en la base de datos.")
        except Exception as e:
            logger.error(f"Error al insertar/actualizar productos en MongoDB: {e}")

def todoProducto(producto):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    start_time = datetime.now()
    time_limit = timedelta(hours=1)
    product_count = 0
    productos_a_guardar = []

    resultado_api = buscar_producto_api(producto)
    if not resultado_api:
        return [], [], [], [], [], [], [], [], [], [], []

    for item in resultado_api['results']:
        if datetime.now() - start_time > time_limit:
            logger.info(f"Tiempo límite alcanzado. Deteniendo extracción.")
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
            product_count += 1

        time.sleep(1)  # Pausa de 1 segundo entre solicitudes para evitar sobrecarga

    # Guardar en MongoDB
    guardar_productos_en_db(productos_a_guardar)

    # Preparar listas para retornar
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
        data = request.get_json(force=True)
        if not data or 'producto' not in data:
            return jsonify({"error": "No se proporcionó el nombre del producto"}), 400
        producto = data['producto']
        
        titulos, urls, vendedores, precios_originales, precios_con_descuento, descuentos, cuotas, meses_sin_intereses, envios, cantidad_vendida, imagenes = todoProducto(producto)
        
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
            "num_products": len(titulos),
            "processing_time": (datetime.now() - datetime.now()).total_seconds()
        })
    except Exception as e:
        logger.error(f"Error inesperado en mercadoLibre: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/descargarInfo', methods=["GET", "POST"])
def descargarInfo():
    if request.method == "POST":
        producto = request.form.get("producto")
        if not producto:
            return render_template('index.html', error="Producto no especificado.")

        try:
            r = requests.post('http://localhost:5000/mercadolibre', json={"producto": producto})
            r.raise_for_status()
            data = r.json()
            return render_template('index.html', data=data["datos"], num_products=data["num_products"], processing_time=data["processing_time"])
        except requests.RequestException as e:
            logger.error(f"Error al obtener datos de MercadoLibre: {e}")
            return render_template('index.html', error=f"Error al obtener datos de MercadoLibre: {str(e)}")
    
    return render_template('index.html')

@app.route('/descargarExcel', methods=['POST'])
def descargarExcel():
    try:
        data = json_util.loads(request.form.get('data'))
        
        df = pd.DataFrame({
            'Título': data['titulos'],
            'Vendedor': data['vendedor'],
            'URL': data['urls'],
            'Precio Original': data['precio_original'],
            'Precio con Descuento': data['precio_con_descuento'],
            'Descuento': data['descuentos'],
            'Cuotas': data['cuotas_container'],
            'Meses sin Intereses': data['meses_intereses'],
            'Envío': data['envio'],
            'Cantidad': data['cantidades'],
            'Imagen URL': data['imagenes']
        })
        
        # Crear un libro de Excel
        wb = Workbook()
        ws = wb.active
        ws.title = "Productos MercadoLibre"
        
        # Agregar los encabezados
        headers = list(df.columns)
        ws.append(headers)
        
        # Agregar los datos al libro de Excel
        for _, row in df.iterrows():
            ws.append(row.tolist())
        
        # Ajustar el ancho de las columnas
        for column in ws.columns:
            max_length = 0
            column_letter = get_column_letter(column[0].column)
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = (max_length + 2) * 1.2
            ws.column_dimensions[column_letter].width = adjusted_width
        
        # Guardar el libro de Excel en memoria
        excel_file = BytesIO()
        wb.save(excel_file)
        excel_file.seek(0)
        
        return send_file(
            excel_file,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='productos_mercadolibre.xlsx'
        )
    except Exception as e:
        logger.error(f"Error al generar el archivo Excel: {str(e)}")
        return jsonify({"error": "Error al generar el archivo Excel"}), 500


if __name__ == '__main__':
    app.run(debug=True)