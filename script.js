import React, { useState } from 'react';
import { Loader2, Download, Search } from 'lucide-react';

const BuscadorMercadoLibre = () => {
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [resultados, setResultados] = useState(null);
  const [cargandoExportacion, setCargandoExportacion] = useState(false);

  const manejarBusqueda = async (e) => {
    e.preventDefault();
    if (!terminoBusqueda.trim()) {
      setError('Por favor ingrese un término de búsqueda');
      return;
    }

    setCargando(true);
    setError('');
    setResultados(null);

    try {
      const respuesta = await fetch('/mercadolibre', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ producto: terminoBusqueda })
      });

      if (!respuesta.ok) {
        throw new Error(`Error HTTP: ${respuesta.status}`);
      }

      const datos = await respuesta.json();
      setResultados(datos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const manejarExportacion = async () => {
    if (!resultados) return;

    setCargandoExportacion(true);
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify(resultados.datos));

      const respuesta = await fetch('/descargarExcel', {
        method: 'POST',
        body: formData
      });

      if (!respuesta.ok) {
        throw new Error(`Error HTTP: ${respuesta.status}`);
      }

      const blob = await respuesta.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'productos_mercadolibre.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Error al descargar Excel: ' + err.message);
    } finally {
      setCargandoExportacion(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <form onSubmit={manejarBusqueda} className="flex gap-2 mb-4">
        <input
          type="text"
          value={terminoBusqueda}
          onChange={(e) => setTerminoBusqueda(e.target.value)}
          placeholder="Buscar productos..."
          className="flex-1 px-4 py-2 border rounded"
        />
        <button
          type="submit"
          disabled={cargando}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
        >
          {cargando ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
          Buscar
        </button>
        {resultados && (
          <button
            onClick={manejarExportacion}
            disabled={cargandoExportacion}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
          >
            {cargandoExportacion ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
            Exportar
          </button>
        )}
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {resultados && resultados.datos && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resultados.datos.titulos.map((titulo, index) => (
            <div key={index} className="border rounded p-4 hover:shadow-lg transition-shadow">
              <img
                src={resultados.datos.imagenes[index]}
                alt={titulo}
                className="w-full h-48 object-cover mb-4 rounded"
              />
              <h3 className="font-bold mb-2 text-lg">{titulo}</h3>
              <p className="text-gray-600">Vendedor: {resultados.datos.vendedor[index]}</p>
              <p className="text-gray-600">Precio original: {resultados.datos.precio_original[index]}</p>
              <p className="text-gray-600">Precio con descuento: {resultados.datos.precio_con_descuento[index]}</p>
              <p className="text-green-600">Descuento: {resultados.datos.descuentos[index]}</p>
              <p className="text-gray-600">Cuotas: {resultados.datos.cuotas_container[index]}</p>
              <p className="text-gray-600">Envío: {resultados.datos.envio[index]}</p>
              <a
                href={resultados.datos.urls[index]}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Ver en MercadoLibre
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuscadorMercadoLibre;