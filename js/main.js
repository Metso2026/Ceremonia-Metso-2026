/*
 * Lógica de la invitación. Los datos editables están en js/config.js.
 * Regla de seguridad: el contenido dinámico se inserta SOLO con textContent
 * o creando nodos. Nunca usar innerHTML con datos.
 */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.add("js");

  var TZ = "America/Lima";
  var EVENT = new Date(CONFIG.fechaEvento).getTime();
  var $ = function (sel) { return document.querySelector(sel); };

  /* ---------- Textos desde config.js ---------- */
  function pick(path) {
    return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, CONFIG);
  }
  document.querySelectorAll("[data-cfg]").forEach(function (el) {
    var v = pick(el.getAttribute("data-cfg"));
    if (typeof v === "string") el.textContent = v;
  });

  var maps = $("#maps-link");
  if (/^https:\/\//.test(CONFIG.lugar.mapsUrl)) maps.href = CONFIG.lugar.mapsUrl;

  /* Fechas legibles en español, siempre en hora de Lima */
  function parts(ms, opts) {
    var out = {};
    new Intl.DateTimeFormat("es-PE", Object.assign({ timeZone: TZ }, opts))
      .formatToParts(new Date(ms)).forEach(function (p) { out[p.type] = p.value; });
    return out;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  var ev = parts(EVENT, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  var hora = new Intl.DateTimeFormat("es-PE", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true })
    .format(new Date(EVENT)).replace(/\s+/g, " ");
  var fmt = {
    fecha: cap(ev.weekday) + " " + ev.day + " de " + ev.month + " de " + ev.year,
    dia: cap(ev.weekday) + " " + ev.day + " de " + ev.month,
    anio: ev.year,
    hora: hora
  };
  document.querySelectorAll("[data-fmt]").forEach(function (el) {
    el.textContent = fmt[el.getAttribute("data-fmt")];
  });

  /* ---------- Cuenta regresiva ---------- */
  var cd = $("#countdown");
  var units = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  var cells = {};
  cd.querySelectorAll("[data-unit]").forEach(function (el) { cells[el.getAttribute("data-unit")] = el; });
  var timer;

  function tick() {
    var left = EVENT - Date.now();
    if (left <= 0) {
      clearInterval(timer);
      cd.hidden = true;
      $("#countdown-sr").textContent = "";
      $("#event-day").hidden = false;
      return;
    }
    Object.keys(units).forEach(function (k) {
      var n = Math.floor(left / units[k]);
      left -= n * units[k];
      cells[k].textContent = k === "d" ? String(n) : String(n).padStart(2, "0");
    });
  }
  tick();
  if (EVENT > Date.now()) {
    timer = setInterval(tick, 1000);
    // Texto para lectores de pantalla: se escribe una sola vez, no cada segundo.
    var days = Math.ceil((EVENT - Date.now()) / units.d);
    $("#countdown-sr").textContent = days === 1
      ? "Falta 1 día para la ceremonia."
      : "Faltan " + days + " días para la ceremonia.";
  }

  /* ---------- Itinerario ---------- */
  var list = $("#itinerary");
  var SVG_NS = "http://www.w3.org/2000/svg";
  (CONFIG.itinerario || []).forEach(function (item) {
    var li = document.createElement("li");
    var ic = document.createElement("span");
    ic.className = "ic";
    ic.setAttribute("aria-hidden", "true");
    var svg = document.createElementNS(SVG_NS, "svg");
    var use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", "#i-" + (item.icono || "star"));
    svg.append(use);
    ic.append(svg);
    var txt = document.createElement("div");
    var h = document.createElement("h3");
    h.textContent = item.titulo;
    txt.append(h);
    if (item.descripcion) {
      var p = document.createElement("p");
      p.textContent = item.descripcion;
      txt.append(p);
    }
    li.append(ic, txt);
    list.append(li);
  });

  /* ---------- Aparición de secciones ---------- */
  var reveals = document.querySelectorAll(".reveal");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Formulario de confirmación ---------- */
  var form = $("#rsvp");
  var done = $("#rsvp-done");
  var status = $("#form-status");
  var submit = $("#submit");
  var ifAttend = $("#if-attend");
  var ifAllergy = $("#if-allergy");

  // Muestra/oculta un bloque y desactiva sus campos para que no se validen ni envíen.
  function toggle(block, show) {
    block.hidden = !show;
    block.querySelectorAll("input, select, textarea").forEach(function (el) { el.disabled = !show; });
  }
  function value(name) {
    var el = form.querySelector('[name="' + name + '"]:checked');
    return el ? el.value : "";
  }
  function sync() {
    var attends = value("asistencia") === "Sí";
    toggle(ifAttend, attends);
    toggle(ifAllergy, attends && value("alergia") === "Sí");
    $("#vehiculo-note").hidden = !(attends && value("vehiculo") === "Sí");
  }
  form.addEventListener("change", sync);
  sync();

  // Mismas reglas que apps-script/Code.gs. Si cambias una, cámbiala en los dos lugares.
  var NAME_RE = /^[\p{L}\p{M}' ’-]+$/u;
  var FORMULA_RE = /^[=+\-@]/;

  // Distritos válidos = opciones del <select> en index.html (también listados en DISTRITOS de Code.gs).
  var DISTRICTS = Array.prototype.map.call(form.distrito.options, function (o) { return o.value; }).filter(Boolean);

  function setError(key, msg) {
    var err = $("#" + key + "-err");
    var targets = form.querySelectorAll('[name="' + key + '"]');
    err.textContent = msg || "";
    err.hidden = !msg;
    targets.forEach(function (el) {
      if (msg) el.setAttribute("aria-invalid", "true");
      else el.removeAttribute("aria-invalid");
    });
  }

  function collect() {
    return {
      nombre: form.nombre.value.replace(/\s+/g, " ").trim(),
      asistencia: value("asistencia"),
      celular: form.celular.value.replace(/[\s-]/g, ""),
      distrito: form.distrito.value,
      vehiculo: value("vehiculo"),
      alergia: value("alergia"),
      alergiaDetalle: form.alergiaDetalle.value.trim(),
      acepta: form.acepta.checked ? "Sí" : "",
      website: form.website.value
    };
  }

  function validate(d) {
    var errors = {};
    if (!d.nombre) errors.nombre = "Escribe tus nombres y apellidos.";
    else if (d.nombre.length < 3 || d.nombre.length > 100) errors.nombre = "Debe tener entre 3 y 100 caracteres.";
    else if (!NAME_RE.test(d.nombre) || !/\p{L}/u.test(d.nombre)) errors.nombre = "Usa solo letras, espacios, apóstrofo (') o guion (-).";

    if (d.asistencia !== "Sí" && d.asistencia !== "No") errors.asistencia = "Indica si asistirás al evento.";
    if (d.asistencia === "Sí") {
      // Celular peruano: 9 dígitos que empiezan con 9 (se envía sin el +51 para que Excel no lo lea como fórmula).
      if (!d.celular) errors.celular = "Indica tu número de celular.";
      else if (!/^9\d{8}$/.test(d.celular)) errors.celular = "Debe tener 9 dígitos y empezar con 9.";
      if (DISTRICTS.indexOf(d.distrito) === -1) errors.distrito = "Selecciona tu distrito de residencia.";
      if (d.vehiculo !== "Sí" && d.vehiculo !== "No") errors.vehiculo = "Indica si vendrás con vehículo propio.";
      if (d.alergia !== "Sí" && d.alergia !== "No") errors.alergia = "Indica si tienes alguna alergia alimentaria.";
      if (d.alergia === "Sí") {
        if (!d.alergiaDetalle) errors.alergiaDetalle = "Cuéntanos a qué alimentos eres alérgico.";
        else if (d.alergiaDetalle.length > 300) errors.alergiaDetalle = "Máximo 300 caracteres.";
        else if (FORMULA_RE.test(d.alergiaDetalle)) errors.alergiaDetalle = "No empieces con =, +, - ni @.";
      }
    }
    if (d.acepta !== "Sí") errors.acepta = "Debes aceptar el uso de datos para enviar tu confirmación.";

    ["nombre", "asistencia", "celular", "distrito", "vehiculo", "alergia", "alergiaDetalle", "acepta"].forEach(function (k) {
      setError(k, errors[k]);
    });
    return Object.keys(errors);
  }

  function send(d) {
    // Campos que no aplican se envían vacíos.
    if (d.asistencia !== "Sí") { d.celular = ""; d.distrito = ""; d.vehiculo = ""; d.alergia = ""; }
    if (d.alergia !== "Sí") d.alergiaDetalle = "";

    if (!CONFIG.APPS_SCRIPT_URL) {
      console.warn("[Invitación] MODO DEMO: APPS_SCRIPT_URL está vacío; no se guardó nada.", d);
      return new Promise(function (resolve) { setTimeout(function () { resolve({ ok: true }); }, 700); });
    }
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 60000);
    // URLSearchParams => application/x-www-form-urlencoded: petición "simple", sin preflight CORS
    // (Apps Script no responde a OPTIONS). Google redirige a script.googleusercontent.com con la respuesta.
    return fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      body: new URLSearchParams(d),
      signal: ctrl.signal,
      credentials: "omit"
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).finally(function () { clearTimeout(t); });
  }

  var sending = false;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (sending) return;

    status.textContent = "";
    status.classList.remove("is-error");
    var d = collect();
    var bad = validate(d);
    if (bad.length) {
      var first = form.querySelector('[name="' + bad[0] + '"]');
      if (first) first.focus();
      status.textContent = "Revisa los campos marcados.";
      status.classList.add("is-error");
      return;
    }

    sending = true;
    submit.disabled = true;
    submit.textContent = "Enviando…";
    status.textContent = "Enviando tu confirmación…";

    send(d).then(function (res) {
      if (res && res.ok) {
        $("#rsvp-group").hidden = d.asistencia !== "Sí";
        $("#rsvp-done-text").textContent = d.asistencia === "Sí"
          ? "Recibimos tu confirmación. ¡Nos vemos el " + fmt.fecha.toLowerCase() + "!"
          : "Gracias por avisarnos. Te extrañaremos en esta celebración.";
        form.hidden = true;
        done.hidden = false;
        done.focus();
        return;
      }
      throw new Error((res && res.error) || "respuesta_invalida");
    }).catch(function (err) {
      console.error("[Invitación] Error al enviar:", err);
      status.textContent = "No pudimos enviar tu confirmación. Revisa tu conexión e inténtalo de nuevo.";
      status.classList.add("is-error");
    }).finally(function () {
      sending = false;
      submit.disabled = false;
      submit.textContent = "Enviar confirmación";
    });
  });
})();
