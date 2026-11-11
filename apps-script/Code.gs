/**
 * Confirmaciones · Ceremonia de Años de Servicio Metso
 * ----------------------------------------------------
 * Script VINCULADO a una hoja de cálculo de Google (Extensiones → Apps Script).
 * No necesita el ID de la hoja ni ninguna clave. Pasos en GUIA_GOOGLE_SHEETS.md.
 *
 * Implementar como aplicación web:
 *   - Ejecutar como: Yo
 *   - Quién tiene acceso: Cualquier usuario
 *
 * Responde siempre JSON: { ok: true } o { ok: false, error: "<código>" }.
 */

var ZONA = 'America/Lima';
var HOJA = 'Respuestas';
var COLUMNAS = [
  'Fecha y hora (Lima)',
  'Nombres y Apellidos',
  'Asistirá',
  'Celular',
  'Distrito',
  'Vehículo propio',
  'Alergia',
  'Detalle alergia',
  'Posible duplicado'
];

// Mismas reglas que js/main.js. Si cambias una, cámbiala en los dos lugares.
var NOMBRE_RE = /^[\p{L}\p{M}' ’-]+$/u;
var LETRA_RE = /\p{L}/u;
// Código de país → regla del número (sin el código). Las mismas que data-re en el <select id="prefijo"> de index.html.
var CELULARES = {
  '51': /^9\d{8}$/, // Perú
  '55': /^[1-9]{2}9\d{8}$/, // Brasil
  '56': /^9\d{8}$/, // Chile
  '34': /^[67]\d{8}$/, // España
};
var SI_NO = ['Sí', 'No'];
// Las mismas opciones del <select id="distrito"> de index.html.
var DISTRITOS = [
  'Ancón',
  'Ate',
  'Barranco',
  'Breña',
  'Carabayllo',
  'Cercado de Lima',
  'Chaclacayo',
  'Chorrillos',
  'Cieneguilla',
  'Comas',
  'El Agustino',
  'Independencia',
  'Jesús María',
  'La Molina',
  'La Victoria',
  'Lince',
  'Los Olivos',
  'Lurigancho-Chosica',
  'Lurín',
  'Magdalena del Mar',
  'Miraflores',
  'Pachacámac',
  'Pucusana',
  'Pueblo Libre',
  'Puente Piedra',
  'Punta Hermosa',
  'Punta Negra',
  'Rímac',
  'San Bartolo',
  'San Borja',
  'San Isidro',
  'San Juan de Lurigancho',
  'San Juan de Miraflores',
  'San Luis',
  'San Martín de Porres',
  'San Miguel',
  'Santa Anita',
  'Santa María del Mar',
  'Santa Rosa',
  'Santiago de Surco',
  'Surquillo',
  'Villa El Salvador',
  'Villa María del Triunfo',
  'Bellavista',
  'Callao',
  'Carmen de la Legua Reynoso',
  'La Perla',
  'La Punta',
  'Mi Perú',
  'Ventanilla',
  'Arequipa'
];

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};

    // Campo trampa: si viene lleno es un bot. Respondemos "ok" sin guardar nada.
    if (p.website) return responder({ ok: true });

    var d = validar(p);
    if (!d) return responder({ ok: false, error: 'datos_invalidos' });

    // Evita choques entre envíos simultáneos.
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) return responder({ ok: false, error: 'ocupado' });
    try {
      var hoja = obtenerHoja();
      var duplicado = esDuplicado(hoja, d.nombre);
      hoja.appendRow([
        Utilities.formatDate(new Date(), ZONA, 'yyyy-MM-dd HH:mm:ss'),
        d.nombre,
        d.asistencia,
        d.celular,
        d.distrito,
        d.vehiculo,
        d.alergia,
        d.alergiaDetalle,
        duplicado ? 'Sí' : ''
      ].map(seguro));
    } finally {
      lock.releaseLock();
    }
    return responder({ ok: true });
  } catch (err) {
    console.error(err); // Visible solo en Apps Script → Ejecuciones. No se envía al navegador.
    return responder({ ok: false, error: 'error_interno' });
  }
}

// Permite comprobar en el navegador que la URL de la aplicación web funciona.
function doGet() {
  return responder({ ok: true, servicio: 'activo' });
}

/** Devuelve los datos limpios o null si algo no cumple las reglas. */
function validar(p) {
  var d = {
    nombre: texto(p.nombre).replace(/\s+/g, ' ').trim(),
    asistencia: texto(p.asistencia),
    prefijo: texto(p.prefijo) || '51',
    celular: texto(p.celular).replace(/[\s-]/g, ''),
    distrito: texto(p.distrito).replace(/\s+/g, ' ').trim(),
    vehiculo: texto(p.vehiculo),
    alergia: texto(p.alergia),
    alergiaDetalle: texto(p.alergiaDetalle).trim()
  };

  if (!esNombre(d.nombre, 3, 100)) return null;
  if (SI_NO.indexOf(d.asistencia) === -1) return null;
  if (texto(p.acepta) !== 'Sí') return null;

  if (d.asistencia === 'No') {
    d.celular = ''; d.distrito = ''; d.vehiculo = ''; d.alergia = ''; d.alergiaDetalle = '';
    return d;
  }
  var reglaCelular = CELULARES.hasOwnProperty(d.prefijo) && CELULARES[d.prefijo];
  if (!reglaCelular || !reglaCelular.test(d.celular)) return null;
  d.celular = '+' + d.prefijo + ' ' + d.celular;
  if (DISTRITOS.indexOf(d.distrito) === -1) return null;
  if (SI_NO.indexOf(d.vehiculo) === -1) return null;
  if (SI_NO.indexOf(d.alergia) === -1) return null;
  if (d.alergia === 'Sí') {
    if (!d.alergiaDetalle || d.alergiaDetalle.length > 300) return null;
  } else {
    d.alergiaDetalle = '';
  }
  return d;
}

function esNombre(s, min, max) {
  return s.length >= min && s.length <= max && NOMBRE_RE.test(s) && LETRA_RE.test(s);
}

function obtenerHoja() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = libro.getSheetByName(HOJA) || libro.insertSheet(HOJA);
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(COLUMNAS);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

/** Compara el nombre normalizado (sin tildes, minúsculas, sin espacios extra) con los ya guardados. */
function esDuplicado(hoja, nombre) {
  var filas = hoja.getLastRow() - 1;
  if (filas < 1) return false;
  var buscado = normalizar(nombre);
  var nombres = hoja.getRange(2, 2, filas, 1).getValues();
  for (var i = 0; i < nombres.length; i++) {
    if (normalizar(String(nombres[i][0]).replace(/^'/, '')) === buscado) return true;
  }
  return false;
}

function normalizar(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Todo se guarda como texto: si empieza con = + - @ o es solo dígitos (celular),
 * se antepone un apóstrofo. Evita fórmulas inyectadas y que el celular pierda formato.
 */
function seguro(v) {
  v = String(v);
  return /^[=+\-@]|^\d+$/.test(v) ? "'" + v : v;
}

function texto(v) {
  return typeof v === 'string' ? v : '';
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Prueba manual desde el editor (botón Ejecutar): agrega una fila de ejemplo.
 * Bórrala de la hoja después de comprobar que funciona.
 */
function probar() {
  var r = doPost({ parameter: {
    nombre: 'Prueba Organizador', asistencia: 'Sí', prefijo: '51', celular: '987654321', distrito: 'Miraflores',
    vehiculo: 'No', alergia: 'Sí', alergiaDetalle: '=maní (prueba de fórmula)', acepta: 'Sí', website: ''
  } });
  console.log(r.getContent());
}
