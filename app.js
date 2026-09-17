// App: Revisión y Recuperación de Niveles de Aceite
// SPA ligera sin frameworks, pensada para móvil.

const $main = document.getElementById("main");
const $header = document.getElementById("header");
const $overlayRoot = document.getElementById("overlay-root");
const $toast = document.getElementById("toast");
const $fotoInput = document.getElementById("foto-input");

const state = {
  vista: "inicio",
  areaActual: null,
  equipoActual: null,
  registrosHoy: [],
  draft: null,          // borrador de inspección en curso
  fotoTarget: null,     // 'evidencia' | 'antes' | 'despues'
  fechaHistorial: hoyISO(),
  fechaInforme: hoyISO(),
  filtroEquipo: "",
  filtroHistorialEstado: "todos",
  editandoId: null
};

function hoyISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function horaAhora() {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}
function fechaBonita(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function toast(msg) {
  $toast.textContent = msg;
  $toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => $toast.classList.remove("show"), 2200);
}
function getResponsable() {
  return localStorage.getItem("responsable_nombre") || "";
}
function setResponsable(v) {
  localStorage.setItem("responsable_nombre", v);
}

/* ---------------- Compresión de fotos ---------------- */
function leerFotoComoDataURL(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const maxW = 1000;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------------- Datos ---------------- */
async function refrescarRegistrosHoy() {
  state.registrosHoy = await dbGetByFecha(hoyISO());
}
function estadoDeHoy(area, equipo) {
  const key = equipoId(area, equipo);
  const regs = state.registrosHoy.filter(r => r.equipoKey === key);
  if (!regs.length) return null;
  return regs[regs.length - 1];
}
function contarProgresoArea(area) {
  const eq = PLANTA.areas.find(a => a.area === area).equipos;
  let hechos = 0, novedades = 0;
  eq.forEach(e => {
    const r = estadoDeHoy(area, e);
    if (r) { hechos++; if (r.novedad) novedades++; }
  });
  return { total: eq.length, hechos, novedades };
}

/* ---------------- Render raíz ---------------- */
async function render() {
  document.querySelectorAll("#bottom-nav button").forEach(b => {
    b.classList.toggle("activo", b.dataset.vista === state.vista);
  });
  renderHeader();
  if (state.vista === "inicio") return renderInicio();
  if (state.vista === "ruta") return renderRuta();
  if (state.vista === "equipos") return renderEquipos();
  if (state.vista === "formulario") return renderFormulario();
  if (state.vista === "historial") return renderHistorial();
  if (state.vista === "informes") return renderInformes();
}

function renderHeader() {
  const titulos = {
    inicio: ["Niveles de Aceite", "Control diario de equipos de planta"],
    ruta: ["Seleccionar área", "Toca un área para ver sus equipos"],
    equipos: [state.areaActual, "Selecciona el equipo a revisar"],
    formulario: [state.equipoActual, state.areaActual],
    historial: ["Historial", "Inspecciones registradas"],
    informes: ["Informe diario", "Genera y descarga el reporte"]
  };
  const [t, s] = titulos[state.vista] || ["", ""];
  const conBack = state.vista === "equipos" || state.vista === "formulario";
  $header.innerHTML = "";
  const row = el(`<div class="fila-top">
    ${conBack ? `<button class="back" id="btn-back">←</button>` : ""}
    <div>
      <h1>${t}</h1>
      <div class="subt">${s}</div>
    </div>
  </div>`);
  $header.appendChild(row);
  if (conBack) {
    document.getElementById("btn-back").onclick = () => {
      if (state.vista === "formulario") { state.vista = "equipos"; }
      else if (state.vista === "equipos") { state.vista = "ruta"; state.areaActual = null; }
      render();
    };
  }
}

/* ---------------- Vista: Inicio ---------------- */
async function renderInicio() {
  await refrescarRegistrosHoy();
  const total = TOTAL_EQUIPOS;
  const hechos = state.registrosHoy.length;
  const buenos = state.registrosHoy.filter(r => !r.novedad).length;
  const novedades = state.registrosHoy.filter(r => r.novedad).length;
  const pct = total ? Math.round((hechos / total) * 100) : 0;

  $main.innerHTML = "";
  if (window._deferredInstallPrompt) {
    const banner = el(`<div class="install-banner">
      <span>📲</span>
      <div style="flex:1">Instala esta app en tu celular para usarla como una app normal, incluso sin internet.</div>
      <button id="btn-instalar">Instalar</button>
    </div>`);
    banner.querySelector("#btn-instalar").onclick = async () => {
      window._deferredInstallPrompt.prompt();
      await window._deferredInstallPrompt.userChoice;
      window._deferredInstallPrompt = null;
      banner.remove();
    };
    $main.appendChild(banner);
  }

  const stats = el(`<div class="grid-stats">
    <div class="stat"><div class="num">${hechos}/${total}</div><div class="lbl">Equipos revisados hoy</div></div>
    <div class="stat"><div class="num">${pct}%</div><div class="lbl">Ruta completada</div></div>
    <div class="stat"><div class="num" style="color:var(--verde)">${buenos}</div><div class="lbl">Sin novedad</div></div>
    <div class="stat"><div class="num" style="color:var(--naranja)">${novedades}</div><div class="lbl">Con novedad</div></div>
  </div>`);
  $main.appendChild(stats);

  const card = el(`<div class="card">
    <div class="progress-bar"><div style="width:${pct}%"></div></div>
    <div style="margin-top:14px" class="btn-row">
      <button class="btn btn-primary" id="btn-continuar">${hechos > 0 ? "Continuar ruta" : "Iniciar ruta"}</button>
    </div>
  </div>`);
  card.querySelector("#btn-continuar").onclick = () => { state.vista = "ruta"; render(); };
  $main.appendChild(card);

  const accesos = el(`<div class="card">
    <div class="seccion-titulo">Accesos rápidos</div>
    <div style="display:flex; flex-direction:column; gap:10px">
      <button class="btn btn-secondary" id="btn-hist">📋 Ver historial de hoy</button>
      <button class="btn btn-secondary" id="btn-inf">📄 Generar informe del día</button>
    </div>
  </div>`);
  accesos.querySelector("#btn-hist").onclick = () => { state.fechaHistorial = hoyISO(); state.vista = "historial"; render(); };
  accesos.querySelector("#btn-inf").onclick = () => { state.fechaInforme = hoyISO(); state.vista = "informes"; render(); };
  $main.appendChild(accesos);

  const leyenda = el(`<div class="card">
    <div class="seccion-titulo">Leyenda</div>
    <div class="legend-row">
      <div class="item"><div class="dot" style="background:var(--verde-bg);color:var(--verde)">✔️</div>Bueno</div>
      <div class="item"><div class="dot" style="background:var(--naranja-bg);color:var(--naranja)">⚠️</div>Con novedad</div>
      <div class="item"><div class="dot" style="background:var(--gris-200);color:var(--gris-700)">⏳</div>Pendiente</div>
    </div>
  </div>`);
  $main.appendChild(leyenda);
}

/* ---------------- Vista: Ruta (áreas) ---------------- */
async function renderRuta() {
  await refrescarRegistrosHoy();
  $main.innerHTML = "";
  const iconos = { RECEPCION: "🚛", ESTERILIZACION: "🔥", PRENSADO: "⚙️", PALMISTERIA: "🌰", CALDERA: "🔧", PKO: "🛢️" };
  PLANTA.areas.forEach(a => {
    const { total, hechos, novedades } = contarProgresoArea(a.area);
    const pct = Math.round((hechos / total) * 100);
    const item = el(`<div class="list-item area-card">
      <div class="icon-wrap">${iconos[a.area] || "📍"}</div>
      <div class="info">
        <div class="titulo">${a.area}</div>
        <div class="sub">${hechos}/${total} revisados ${novedades ? `· <span style="color:var(--naranja)">${novedades} con novedad</span>` : ""}</div>
        <div class="progress-bar" style="margin-top:6px"><div style="width:${pct}%"></div></div>
      </div>
      <div class="chevron">›</div>
    </div>`);
    item.onclick = () => { state.areaActual = a.area; state.filtroEquipo = ""; state.vista = "equipos"; render(); };
    $main.appendChild(item);
  });
}

/* ---------------- Vista: Equipos de un área ---------------- */
async function renderEquipos() {
  await refrescarRegistrosHoy();
  $main.innerHTML = "";
  const area = PLANTA.areas.find(a => a.area === state.areaActual);
  const buscador = el(`<input type="text" class="buscador" placeholder="🔎 Buscar equipo..." value="${state.filtroEquipo}" />`);
  buscador.oninput = (e) => { state.filtroEquipo = e.target.value; renderListaEquipos(); };
  $main.appendChild(buscador);
  const cont = el(`<div id="lista-equipos"></div>`);
  $main.appendChild(cont);
  renderListaEquipos();

  function renderListaEquipos() {
    const lista = document.getElementById("lista-equipos");
    lista.innerHTML = "";
    const filtro = state.filtroEquipo.trim().toLowerCase();
    const equipos = area.equipos.filter(e => e.toLowerCase().includes(filtro));
    if (!equipos.length) {
      lista.appendChild(el(`<div class="empty-state"><div class="ico">🔍</div>Sin resultados</div>`));
      return;
    }
    equipos.forEach(e => {
      const r = estadoDeHoy(area.area, e);
      let cls = "", badge = `<span class="badge badge-gris">Pendiente</span>`;
      if (r) {
        cls = r.novedad ? "novedad" : "ok";
        badge = r.novedad
          ? `<span class="badge badge-naranja">Con novedad</span>`
          : `<span class="badge badge-verde">Bueno</span>`;
      }
      const item = el(`<div class="list-item ${cls}">
        <div class="icon-wrap">⚙️</div>
        <div class="info">
          <div class="titulo">${e}</div>
          <div class="sub">${r ? "Revisado hoy · " + r.hora : "Sin revisar hoy"}</div>
        </div>
        ${badge}
      </div>`);
      item.onclick = () => abrirFormulario(area.area, e, r ? r.id : null);
      lista.appendChild(item);
    });
  }
}

/* ---------------- Formulario de inspección ---------------- */
function nuevoDraft(area, equipo) {
  return {
    id: null,
    area, equipo,
    equipoKey: equipoId(area, equipo),
    fecha: hoyISO(),
    hora: horaAhora(),
    responsable: getResponsable(),
    novedad: null,       // null = sin decidir, false = no, true = si
    tipoNovedad: "",
    observaciones: "",
    seRecupera: "NO",
    cambio: "NO",
    cantidadAceite: "",
    unidadAceite: "L",
    tipoAceite: "",
    fotoEvidencia: null,
    fotoAntes: null,
    fotoDespues: null
  };
}

async function abrirFormulario(area, equipo, registroId) {
  state.areaActual = area;
  state.equipoActual = equipo;
  state.editandoId = registroId || null;
  if (registroId) {
    const r = await dbGet(registroId);
    state.draft = Object.assign(nuevoDraft(area, equipo), r);
  } else {
    state.draft = nuevoDraft(area, equipo);
  }
  state.vista = "formulario";
  render();
}

function renderFormulario() {
  const d = state.draft;
  $main.innerHTML = "";

  const datos = el(`<div class="card">
    <label class="campo">
      <span class="txt">Responsable de la inspección</span>
      <input type="text" id="f-responsable" placeholder="Nombre y apellido" value="${esc(d.responsable)}" />
    </label>
    <div style="display:flex; gap:10px">
      <label class="campo" style="flex:1">
        <span class="txt">Fecha</span>
        <input type="date" id="f-fecha" value="${d.fecha}" />
      </label>
      <label class="campo" style="flex:1">
        <span class="txt">Hora</span>
        <input type="time" id="f-hora" value="${d.hora}" />
      </label>
    </div>
  </div>`);
  $main.appendChild(datos);
  datos.querySelector("#f-responsable").oninput = e => { d.responsable = e.target.value; setResponsable(e.target.value); };
  datos.querySelector("#f-fecha").oninput = e => d.fecha = e.target.value;
  datos.querySelector("#f-hora").oninput = e => d.hora = e.target.value;

  const pregunta = el(`<div class="card">
    <div class="seccion-titulo">¿Hay novedad en el nivel / estado del aceite?</div>
    <div class="toggle-si-no">
      <button id="btn-no" class="${d.novedad === false ? "sel-no" : ""}">NO — Sin novedad</button>
      <button id="btn-si" class="${d.novedad === true ? "sel-si" : ""}">SÍ — Con novedad</button>
    </div>
  </div>`);
  pregunta.querySelector("#btn-no").onclick = () => { d.novedad = false; render(); };
  pregunta.querySelector("#btn-si").onclick = () => { d.novedad = true; render(); };
  $main.appendChild(pregunta);

  if (d.novedad === false) $main.appendChild(bloqueSinNovedad(d));
  if (d.novedad === true) $main.appendChild(bloqueConNovedad(d));

  if (d.novedad !== null) {
    const guardar = el(`<button class="btn btn-primary" id="btn-guardar" style="margin-top:4px">💾 ${state.editandoId ? "Actualizar" : "Guardar"} inspección</button>`);
    guardar.onclick = guardarInspeccion;
    $main.appendChild(guardar);
  }
}

function fotoBoxHTML(dataUrl, id, label) {
  return `<div class="foto-box" id="${id}">
    ${dataUrl
      ? `<img src="${dataUrl}" /><div class="cambiar">📷 Cambiar foto</div>`
      : `<div class="foto-placeholder">📷<br/>${label}</div>`}
  </div>`;
}

function bloqueSinNovedad(d) {
  const box = el(`<div class="card">
    <div class="seccion-titulo">Evidencia</div>
    ${fotoBoxHTML(d.fotoEvidencia, "foto-evidencia", "Tomar foto del estado normal")}
    <label class="campo" style="margin-top:14px">
      <span class="txt">Observación (opcional)</span>
      <textarea id="f-obs-sn" placeholder="Ej: nivel correcto, sin fugas visibles...">${esc(d.observaciones)}</textarea>
    </label>
  </div>`);
  box.querySelector("#foto-evidencia").onclick = () => tomarFoto("evidencia");
  box.querySelector("#f-obs-sn").oninput = e => d.observaciones = e.target.value;
  return box;
}

function bloqueConNovedad(d) {
  const box = el(`<div class="card">
    <div class="seccion-titulo">📷 Foto ANTES</div>
    ${fotoBoxHTML(d.fotoAntes, "foto-antes", "Foto de evidencia de la novedad")}

    <div class="seccion-titulo">Detalle de la novedad</div>
    <label class="campo">
      <span class="txt">Tipo de novedad</span>
      <select id="f-tipo-nov">
        <option value="">Selecciona...</option>
        ${TIPOS_NOVEDAD.map(t => `<option value="${t}" ${d.tipoNovedad === t ? "selected" : ""}>${t}</option>`).join("")}
      </select>
    </label>
    <label class="campo">
      <span class="txt">Observación</span>
      <textarea id="f-obs-cn" placeholder="Describe la novedad encontrada...">${esc(d.observaciones)}</textarea>
    </label>

    <div class="seccion-titulo">Recuperación / mantenimiento</div>
    <label class="campo">
      <span class="txt">¿Se recupera el nivel en sitio?</span>
      <div class="mini-toggle">
        <button id="rec-no" class="${d.seRecupera === "NO" ? "on" : ""}">NO</button>
        <button id="rec-si" class="${d.seRecupera === "SI" ? "on" : ""}">SÍ</button>
      </div>
    </label>
    <label class="campo">
      <span class="txt">¿Requiere cambio de aceite?</span>
      <div class="mini-toggle">
        <button id="cam-no" class="${d.cambio === "NO" ? "on" : ""}">NO</button>
        <button id="cam-si" class="${d.cambio === "SI" ? "on" : ""}">SÍ</button>
      </div>
    </label>

    <div id="bloque-intervencion"></div>
  </div>`);

  box.querySelector("#foto-antes").onclick = () => tomarFoto("antes");
  box.querySelector("#f-tipo-nov").onchange = e => d.tipoNovedad = e.target.value;
  box.querySelector("#f-obs-cn").oninput = e => d.observaciones = e.target.value;
  box.querySelector("#rec-no").onclick = () => { d.seRecupera = "NO"; render(); };
  box.querySelector("#rec-si").onclick = () => { d.seRecupera = "SI"; render(); };
  box.querySelector("#cam-no").onclick = () => { d.cambio = "NO"; render(); };
  box.querySelector("#cam-si").onclick = () => { d.cambio = "SI"; render(); };

  const necesitaIntervencion = d.seRecupera === "SI" || d.cambio === "SI";
  const cont = box.querySelector("#bloque-intervencion");
  if (necesitaIntervencion) {
    cont.appendChild(el(`<div>
      <hr class="sep" />
      <div style="display:flex; gap:10px">
        <label class="campo" style="flex:1.4">
          <span class="txt">Cantidad de aceite</span>
          <input type="number" min="0" step="0.1" id="f-cant" value="${d.cantidadAceite || ""}" placeholder="0.0" />
        </label>
        <label class="campo" style="flex:1">
          <span class="txt">Unidad</span>
          <select id="f-unidad">
            <option value="L" ${d.unidadAceite === "L" ? "selected" : ""}>Litros</option>
            <option value="ml" ${d.unidadAceite === "ml" ? "selected" : ""}>ml</option>
            <option value="gal" ${d.unidadAceite === "gal" ? "selected" : ""}>Galones</option>
          </select>
        </label>
      </div>
      <label class="campo">
        <span class="txt">Tipo de aceite utilizado</span>
        <select id="f-tipo-aceite">
          <option value="">Selecciona...</option>
          ${TIPOS_ACEITE.map(t => `<option value="${t}" ${d.tipoAceite === t ? "selected" : ""}>${t}</option>`).join("")}
        </select>
      </label>
      <div class="seccion-titulo">📷 Foto DESPUÉS</div>
      ${fotoBoxHTML(d.fotoDespues, "foto-despues", "Foto mostrando el nivel recuperado")}
    </div>`));
    cont.querySelector("#f-cant").oninput = e => d.cantidadAceite = e.target.value;
    cont.querySelector("#f-unidad").onchange = e => d.unidadAceite = e.target.value;
    cont.querySelector("#f-tipo-aceite").onchange = e => d.tipoAceite = e.target.value;
    cont.querySelector("#foto-despues").onclick = () => tomarFoto("despues");
  }

  return box;
}

function tomarFoto(target) {
  state.fotoTarget = target;
  $fotoInput.value = "";
  $fotoInput.click();
}
$fotoInput.onchange = async () => {
  const file = $fotoInput.files[0];
  if (!file) return;
  const dataUrl = await leerFotoComoDataURL(file);
  const d = state.draft;
  if (state.fotoTarget === "evidencia") d.fotoEvidencia = dataUrl;
  if (state.fotoTarget === "antes") d.fotoAntes = dataUrl;
  if (state.fotoTarget === "despues") d.fotoDespues = dataUrl;
  render();
};

async function guardarInspeccion() {
  const d = state.draft;
  if (!d.responsable || !d.responsable.trim()) return toast("⚠️ Indica el responsable de la inspección");
  if (d.novedad === false && !d.fotoEvidencia) return toast("⚠️ Toma la foto de evidencia");
  if (d.novedad === true) {
    if (!d.fotoAntes) return toast("⚠️ Toma la foto ANTES");
    if (!d.tipoNovedad) return toast("⚠️ Selecciona el tipo de novedad");
    const necesitaIntervencion = d.seRecupera === "SI" || d.cambio === "SI";
    if (necesitaIntervencion && !d.fotoDespues) return toast("⚠️ Toma la foto DESPUÉS de la intervención");
  }

  const record = {
    area: d.area,
    equipo: d.equipo,
    equipoKey: d.equipoKey,
    fecha: d.fecha,
    hora: d.hora,
    responsable: d.responsable.trim(),
    novedad: d.novedad,
    estado: d.novedad ? "Malo" : "Bueno",
    tipoNovedad: d.novedad ? d.tipoNovedad : "",
    observaciones: d.observaciones || "",
    seRecupera: d.novedad ? d.seRecupera : "NO",
    cambio: d.novedad ? d.cambio : "NO",
    cantidadAceite: d.novedad ? d.cantidadAceite : "",
    unidadAceite: d.novedad ? d.unidadAceite : "",
    tipoAceite: d.novedad ? d.tipoAceite : "",
    fotoEvidencia: d.fotoEvidencia || null,
    fotoAntes: d.fotoAntes || null,
    fotoDespues: d.fotoDespues || null,
    creadoEn: Date.now()
  };
  if (state.editandoId) {
    record.id = state.editandoId;
    await dbPut(record);
  } else {
    await dbAdd(record);
  }
  toast("✅ Inspección guardada");
  await refrescarRegistrosHoy();
  mostrarSheetSiguientePaso();
}

function mostrarSheetSiguientePaso() {
  const sheet = el(`<div class="overlay">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div style="text-align:center; font-weight:800; font-size:1.05rem; margin-bottom:4px">¡Inspección guardada!</div>
      <div style="text-align:center; color:var(--gris-700); font-size:0.85rem; margin-bottom:16px">¿Qué deseas hacer ahora?</div>
      <div style="display:flex; flex-direction:column; gap:10px">
        <button class="btn btn-primary" id="btn-siguiente">➡️ Siguiente equipo</button>
        <button class="btn btn-secondary" id="btn-finalizar">🏁 Finalizar ruta</button>
      </div>
    </div>
  </div>`);
  sheet.querySelector("#btn-siguiente").onclick = () => {
    sheet.remove();
    state.vista = "equipos";
    render();
  };
  sheet.querySelector("#btn-finalizar").onclick = () => {
    sheet.remove();
    state.vista = "inicio";
    state.areaActual = null;
    render();
  };
  $overlayRoot.appendChild(sheet);
}

/* ---------------- Vista: Historial ---------------- */
async function renderHistorial() {
  $main.innerHTML = "";
  const filtros = el(`<div class="card">
    <label class="campo" style="margin-bottom:10px">
      <span class="txt">Fecha</span>
      <input type="date" id="h-fecha" value="${state.fechaHistorial}" />
    </label>
    <div class="chip-row">
      <button class="chip ${state.filtroHistorialEstado === "todos" ? "on" : ""}" data-f="todos">Todos</button>
      <button class="chip ${state.filtroHistorialEstado === "bueno" ? "on" : ""}" data-f="bueno">Sin novedad</button>
      <button class="chip ${state.filtroHistorialEstado === "malo" ? "on" : ""}" data-f="malo">Con novedad</button>
    </div>
  </div>`);
  filtros.querySelector("#h-fecha").onchange = e => { state.fechaHistorial = e.target.value; renderHistorial(); };
  filtros.querySelectorAll(".chip").forEach(c => c.onclick = () => { state.filtroHistorialEstado = c.dataset.f; renderHistorial(); });
  $main.appendChild(filtros);

  const registros = (await dbGetByFecha(state.fechaHistorial)).sort((a, b) => a.hora.localeCompare(b.hora));
  const filtrados = registros.filter(r => {
    if (state.filtroHistorialEstado === "bueno") return !r.novedad;
    if (state.filtroHistorialEstado === "malo") return !!r.novedad;
    return true;
  });

  if (!filtrados.length) {
    $main.appendChild(el(`<div class="empty-state"><div class="ico">📭</div>Sin inspecciones para este filtro</div>`));
    return;
  }

  const porArea = {};
  filtrados.forEach(r => { (porArea[r.area] = porArea[r.area] || []).push(r); });
  Object.keys(porArea).forEach(area => {
    $main.appendChild(el(`<div class="hist-group-title">${area}</div>`));
    porArea[area].forEach(r => {
      const item = el(`<div class="list-item ${r.novedad ? "novedad" : "ok"}">
        <div class="icon-wrap">${r.novedad ? "⚠️" : "✔️"}</div>
        <div class="info">
          <div class="titulo">${r.equipo}</div>
          <div class="sub">${r.hora} · ${esc(r.responsable)}</div>
        </div>
        <div class="chevron">›</div>
      </div>`);
      item.onclick = () => abrirDetalleRegistro(r);
      $main.appendChild(item);
    });
  });
}

function abrirDetalleRegistro(r) {
  const filas = [
    ["Área", r.area], ["Equipo", r.equipo], ["Fecha", fechaBonita(r.fecha)], ["Hora", r.hora],
    ["Responsable", esc(r.responsable)], ["Estado", r.novedad ? "Malo (con novedad)" : "Bueno"]
  ];
  if (r.novedad) {
    filas.push(["Tipo de novedad", r.tipoNovedad || "-"]);
    filas.push(["Se recupera", r.seRecupera]);
    filas.push(["Cambio de aceite", r.cambio]);
    if (r.cantidadAceite) filas.push(["Cantidad", `${r.cantidadAceite} ${r.unidadAceite}`]);
    if (r.tipoAceite) filas.push(["Tipo de aceite", r.tipoAceite]);
  }
  if (r.observaciones) filas.push(["Observaciones", esc(r.observaciones)]);

  const fotos = [];
  if (r.fotoEvidencia) fotos.push(["Evidencia", r.fotoEvidencia]);
  if (r.fotoAntes) fotos.push(["Antes", r.fotoAntes]);
  if (r.fotoDespues) fotos.push(["Después", r.fotoDespues]);

  const sheet = el(`<div class="overlay">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div style="font-weight:800; font-size:1.05rem; margin-bottom:10px">${r.equipo}</div>
      <div id="detalle-filas"></div>
      ${fotos.length ? `<div class="seccion-titulo">Fotos</div><div class="fotos-grid" id="detalle-fotos"></div>` : ""}
      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn-secondary" id="btn-editar">✏️ Editar</button>
        <button class="btn btn-danger" id="btn-borrar">🗑️ Eliminar</button>
      </div>
    </div>
  </div>`);
  const filasCont = sheet.querySelector("#detalle-filas");
  filas.forEach(([k, v]) => filasCont.appendChild(el(`<div class="detalle-fila"><span class="k">${k}</span><span class="v">${v}</span></div>`)));
  if (fotos.length) {
    const fotosCont = sheet.querySelector("#detalle-fotos");
    fotos.forEach(([label, src]) => {
      const box = el(`<div class="foto-box"><img src="${src}" /><div class="cambiar" style="color:var(--gris-700)">${label}</div></div>`);
      fotosCont.appendChild(box);
    });
  }
  sheet.querySelector("#btn-editar").onclick = () => { sheet.remove(); abrirFormulario(r.area, r.equipo, r.id); };
  sheet.querySelector("#btn-borrar").onclick = async () => {
    if (!confirm(`¿Eliminar la inspección de "${r.equipo}"?`)) return;
    await dbDelete(r.id);
    sheet.remove();
    toast("Inspección eliminada");
    renderHistorial();
  };
  $overlayRoot.appendChild(sheet);
}

/* ---------------- Vista: Informes ---------------- */
async function renderInformes() {
  $main.innerHTML = "";
  const registros = await dbGetByFecha(state.fechaInforme);
  const buenos = registros.filter(r => !r.novedad).length;
  const novedades = registros.filter(r => r.novedad).length;
  const recuperados = registros.filter(r => r.seRecupera === "SI").length;
  const cambios = registros.filter(r => r.cambio === "SI").length;

  const card = el(`<div class="card">
    <label class="campo">
      <span class="txt">Fecha del informe</span>
      <input type="date" id="i-fecha" value="${state.fechaInforme}" />
    </label>
    <div class="grid-stats" style="margin-bottom:0">
      <div class="stat"><div class="num">${registros.length}</div><div class="lbl">Equipos revisados</div></div>
      <div class="stat"><div class="num" style="color:var(--verde)">${buenos}</div><div class="lbl">Sin novedad</div></div>
      <div class="stat"><div class="num" style="color:var(--naranja)">${novedades}</div><div class="lbl">Con novedad</div></div>
      <div class="stat"><div class="num">${recuperados}/${cambios}</div><div class="lbl">Recuperados / Cambios</div></div>
    </div>
  </div>`);
  card.querySelector("#i-fecha").onchange = e => { state.fechaInforme = e.target.value; renderInformes(); };
  $main.appendChild(card);

  const acciones = el(`<div class="card">
    <div class="seccion-titulo">Descargar informe</div>
    <div style="display:flex; flex-direction:column; gap:10px">
      <button class="btn btn-primary" id="btn-pdf">📄 Generar informe PDF</button>
      <button class="btn btn-secondary" id="btn-xlsx">📊 Exportar a Excel</button>
    </div>
  </div>`);
  acciones.querySelector("#btn-pdf").onclick = async () => {
    if (!registros.length) return toast("No hay inspecciones para esta fecha");
    toast("Generando PDF...");
    await generarInformePDF(registros, state.fechaInforme, PLANTA.nombre);
  };
  acciones.querySelector("#btn-xlsx").onclick = () => {
    if (!registros.length) return toast("No hay inspecciones para esta fecha");
    generarInformeExcel(registros, state.fechaInforme);
    toast("Excel generado");
  };
  $main.appendChild(acciones);

  if (!registros.length) {
    $main.appendChild(el(`<div class="empty-state"><div class="ico">📭</div>Aún no hay inspecciones registradas para esta fecha</div>`));
  }
}

/* ---------------- Navegación e inicio ---------------- */
document.querySelectorAll("#bottom-nav button").forEach(b => {
  b.onclick = () => {
    state.vista = b.dataset.vista;
    if (state.vista === "historial") state.fechaHistorial = state.fechaHistorial || hoyISO();
    render();
  };
});

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window._deferredInstallPrompt = e;
  if (state.vista === "inicio") render();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

render();
