/*
 * CONFIGURACIÓN EDITABLE DE LA INVITACIÓN
 * ---------------------------------------
 * Este es el único archivo que normalmente se edita.
 * - Mantén las comillas y las comas tal como están.
 * - Las fechas usan formato ISO con la zona horaria de Lima (-05:00).
 *
 * OJO: "Detalles para la ocasión" (invitación personal, código de vestimenta,
 * estacionamiento, brindis) NO está aquí a propósito. Es texto fijo dentro de
 * index.html y solo se cambia con un pedido explícito.
 */
const CONFIG = Object.freeze({
  // Hora de recepción (hora de Lima). La cuenta regresiva apunta aquí.
  fechaEvento: "2026-12-01T18:30:00-05:00",

  // Último momento para confirmar asistencia (hora de Lima).
  // Debe coincidir con FECHA_LIMITE en apps-script/Code.gs (ver GUIA_GOOGLE_SHEETS.md).
  fechaLimiteFormulario: "2026-11-26T23:59:59-05:00",

  // Textos de la portada.
  titulo: "Noche de Gala",
  subtitulo: "Ceremonia de Años de Servicio",

  // Mensaje que reemplaza a la cuenta regresiva cuando llega el día.
  mensajeDiaEvento: {
    titulo: "¡Llegó el gran día!",
    texto: "Esta noche reconocemos los años de dedicación, esfuerzo y logros compartidos."
  },

  // Lugar del evento y botón "Ver ubicación".
  lugar: {
    nombre: "Restaurante La Rosa Náutica",
    direccion: "Circuito de Playas, Miraflores 15074",
    mapsUrl: "https://maps.app.goo.gl/eHSjA9HLxhH4Ji5S8"
  },

  // Itinerario de la noche (sin horas): ícono, título y descripción breve.
  // Íconos disponibles: "users", "star", "dine", "toast", "glass", "user", "calendar", "clock".
  itinerario: [
    { icono: "users", titulo: "Bienvenida", descripcion: "Un momento para encontrarnos y dar inicio a la celebración." },
    { icono: "star", titulo: "Reconocimiento", descripcion: "Celebraremos las trayectorias de nuestros Metsonites." },
    { icono: "dine", titulo: "Cena", descripcion: "Compartiremos una cena especial." },
    { icono: "toast", titulo: "Brindis y celebración", descripcion: "Cerraremos la noche brindando y disfrutando juntos." }
  ],

  // URL de la aplicación web de Google Apps Script que guarda las respuestas en la hoja (ver GUIA_GOOGLE_SHEETS.md).
  // Vacío = MODO DEMO: el formulario simula un envío exitoso y no guarda nada.
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxYp_uBjqrc13xMvjBVt2fonOgwerDCpcBqRJvcQKE09nQT9Y5xJpcsZA5F1wQwJwJEzg/exec"
});
