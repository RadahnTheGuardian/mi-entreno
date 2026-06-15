// Lógica principal de la app: navegación, registrar entrenamiento, historial,
// progreso y ajustes. Trabaja sobre el DOM definido en index.html.

let diaActual = "push";        // día seleccionado en "Entrenar"
let editandoSesionId = null;   // si estamos editando una sesión existente

document.addEventListener("DOMContentLoaded", init);

function init() {
  cargarDatos();
  registrarNavegacion();
  configurarEntrenar();
  configurarProgreso();
  configurarAjustes();
  refrescarPerfilHeader();
  mostrarVista("entrenar");
}

// ---------- Navegación entre pestañas ----------

function registrarNavegacion() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => mostrarVista(btn.dataset.vista));
  });
}

function mostrarVista(vista) {
  document.querySelectorAll(".vista").forEach((v) => v.classList.remove("activa"));
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("activa"));
  document.getElementById("view-" + vista).classList.add("activa");
  document.querySelector(`.nav-btn[data-vista="${vista}"]`).classList.add("activa");

  if (vista === "historial") renderHistorial();
  if (vista === "progreso") { rellenarSelectorEjercicios(); actualizarGrafico(); }
}

function refrescarPerfilHeader() {
  const nombre = obtenerPerfil();
  document.getElementById("perfil-header").textContent = nombre ? `💪 ${nombre}` : "💪 Mi entreno";
}

// ---------- ENTRENAR ----------

function configurarEntrenar() {
  // Selector de día
  document.querySelectorAll(".dia-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      diaActual = btn.dataset.dia;
      editandoSesionId = null;
      document.querySelectorAll(".dia-btn").forEach((b) => b.classList.remove("activa"));
      btn.classList.add("activa");
      document.getElementById("fecha-entreno").value = ahoraLocalISO();
      renderFormularioEntreno();
    });
  });
  document.getElementById("fecha-entreno").value = ahoraLocalISO();
  document.querySelector('.dia-btn[data-dia="push"]').classList.add("activa");
  document.getElementById("btn-guardar-sesion").addEventListener("click", guardarSesionActual);
  renderFormularioEntreno();
}

function renderFormularioEntreno() {
  const cont = document.getElementById("form-ejercicios");
  cont.innerHTML = "";
  const dia = ROUTINE[diaActual];

  dia.ejercicios.forEach((ej) => {
    const ultima = editandoSesionId ? null : ultimaSesionEjercicio(ej.id);

    const card = document.createElement("div");
    card.className = "ejercicio-card";

    const head = document.createElement("div");
    head.className = "ejercicio-head";
    head.innerHTML = `
      <h3>${ej.nombre}</h3>
      <span class="meta">${ej.series} series · ${ej.repMin}-${ej.repMax} reps · ${ej.rir}</span>
    `;
    card.appendChild(head);

    const tabla = document.createElement("div");
    tabla.className = "series-tabla";
    tabla.innerHTML = `<div class="serie-row cab"><span>Serie</span><span>Reps</span><span>Kg</span></div>`;

    for (let i = 1; i <= ej.series; i++) {
      const prev = ultima ? ultima.find((s) => s.set === i) : null;
      const row = document.createElement("div");
      row.className = "serie-row";
      row.innerHTML = `
        <span class="serie-num">${i}</span>
        <input type="number" inputmode="numeric" min="0" class="in-reps"
               data-ej="${ej.id}" data-set="${i}"
               placeholder="${prev ? prev.reps : ""}" value="${prev ? prev.reps : ""}">
        <input type="number" inputmode="decimal" min="0" step="0.5" class="in-kg"
               data-ej="${ej.id}" data-set="${i}"
               placeholder="${prev ? prev.kg : ""}" value="${prev ? prev.kg : ""}">
      `;
      tabla.appendChild(row);
    }
    card.appendChild(tabla);
    if (ultima) {
      const hint = document.createElement("p");
      hint.className = "hint";
      hint.textContent = "↻ Prerrellenado con tu último registro";
      card.appendChild(hint);
    }
    cont.appendChild(card);
  });
}

function guardarSesionActual() {
  const fechaInput = document.getElementById("fecha-entreno").value;
  if (!fechaInput) { alert("Indica la fecha y hora."); return; }

  const series = [];
  document.querySelectorAll("#form-ejercicios .serie-row:not(.cab)").forEach((row) => {
    const repsEl = row.querySelector(".in-reps");
    const kgEl = row.querySelector(".in-kg");
    const reps = parseFloat(repsEl.value);
    const kg = parseFloat(kgEl.value);
    // Solo guardamos series con al menos reps registradas.
    if (!isNaN(reps) && reps > 0) {
      series.push({
        ejercicioId: repsEl.dataset.ej,
        set: parseInt(repsEl.dataset.set, 10),
        reps: reps,
        kg: isNaN(kg) ? 0 : kg,
      });
    }
  });

  if (series.length === 0) {
    alert("No has registrado ninguna serie con repeticiones.");
    return;
  }

  const sesion = {
    id: editandoSesionId || nuevoId(),
    fecha: fechaInput,
    dia: diaActual,
    series: series,
  };
  guardarSesion(sesion);
  editandoSesionId = null;
  alert("✅ Sesión guardada");
  document.getElementById("fecha-entreno").value = ahoraLocalISO();
  renderFormularioEntreno();
  mostrarVista("historial");
}

// ---------- HISTORIAL ----------

function renderHistorial() {
  const cont = document.getElementById("lista-historial");
  cont.innerHTML = "";
  const sesiones = obtenerSesiones();

  if (sesiones.length === 0) {
    cont.innerHTML = `<p class="vacio">Aún no hay sesiones registradas. ¡Empieza en la pestaña Entrenar!</p>`;
    return;
  }

  sesiones.forEach((s) => {
    const card = document.createElement("div");
    card.className = "hist-card";
    const totalSeries = s.series.length;
    const volumen = s.series.reduce((a, se) => a + se.reps * se.kg, 0);

    const detalle = s.series.map((se) => {
      const ej = buscarEjercicio(se.ejercicioId);
      return { nombre: ej ? ej.nombre : se.ejercicioId, se };
    });
    // Agrupar por ejercicio para mostrar.
    const porEjercicio = {};
    detalle.forEach((d) => {
      if (!porEjercicio[d.nombre]) porEjercicio[d.nombre] = [];
      porEjercicio[d.nombre].push(d.se);
    });
    const detalleHtml = Object.entries(porEjercicio).map(([nombre, sets]) => {
      const setsTxt = sets.sort((a, b) => a.set - b.set)
        .map((x) => `${x.reps}×${x.kg}kg`).join(", ");
      return `<li><strong>${nombre}:</strong> ${setsTxt}</li>`;
    }).join("");

    card.innerHTML = `
      <div class="hist-head">
        <div>
          <span class="hist-dia ${s.dia}">${DIAS_LABEL[s.dia] || s.dia}</span>
          <span class="hist-fecha">${formatearFechaLarga(s.fecha)}</span>
        </div>
        <div class="hist-acciones">
          <button class="mini" data-accion="editar" data-id="${s.id}">✏️</button>
          <button class="mini" data-accion="borrar" data-id="${s.id}">🗑️</button>
        </div>
      </div>
      <p class="hist-resumen">${totalSeries} series · ${Math.round(volumen)} kg de volumen</p>
      <ul class="hist-detalle">${detalleHtml}</ul>
    `;
    cont.appendChild(card);
  });

  cont.querySelectorAll("button[data-accion]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (btn.dataset.accion === "borrar") {
        if (confirm("¿Borrar esta sesión?")) { borrarSesion(id); renderHistorial(); }
      } else {
        editarSesion(id);
      }
    });
  });
}

function editarSesion(id) {
  const s = obtenerSesion(id);
  if (!s) return;
  diaActual = s.dia;
  editandoSesionId = id;
  document.querySelectorAll(".dia-btn").forEach((b) => b.classList.remove("activa"));
  document.querySelector(`.dia-btn[data-dia="${s.dia}"]`).classList.add("activa");
  document.getElementById("fecha-entreno").value = s.fecha;
  renderFormularioEntreno();
  // Rellenar con los valores de la sesión que se edita.
  s.series.forEach((se) => {
    const reps = document.querySelector(`.in-reps[data-ej="${se.ejercicioId}"][data-set="${se.set}"]`);
    const kg = document.querySelector(`.in-kg[data-ej="${se.ejercicioId}"][data-set="${se.set}"]`);
    if (reps) reps.value = se.reps;
    if (kg) kg.value = se.kg;
  });
  mostrarVista("entrenar");
  window.scrollTo(0, 0);
}

// ---------- PROGRESO ----------

function configurarProgreso() {
  const selMetrica = document.getElementById("sel-metrica");
  selMetrica.innerHTML = Object.entries(METRICAS)
    .map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");

  document.getElementById("sel-ejercicio").addEventListener("change", actualizarGrafico);
  document.getElementById("sel-metrica").addEventListener("change", actualizarGrafico);
  document.getElementById("sel-rango").addEventListener("change", () => {
    const pers = document.getElementById("sel-rango").value === "personalizado";
    document.getElementById("rango-personalizado").style.display = pers ? "flex" : "none";
    actualizarGrafico();
  });
  document.getElementById("rango-desde").addEventListener("change", actualizarGrafico);
  document.getElementById("rango-hasta").addEventListener("change", actualizarGrafico);
}

function rellenarSelectorEjercicios() {
  const sel = document.getElementById("sel-ejercicio");
  const valorPrev = sel.value;
  const grupos = { push: "PUSH", pull: "PULL", legs: "LEGS" };
  let html = "";
  for (const dia of Object.keys(grupos)) {
    html += `<optgroup label="${grupos[dia]}">`;
    ROUTINE[dia].ejercicios.forEach((ej) => {
      html += `<option value="${ej.id}">${ej.nombre}</option>`;
    });
    html += `</optgroup>`;
  }
  sel.innerHTML = html;
  if (valorPrev) sel.value = valorPrev;
}

function actualizarGrafico() {
  const ejercicioId = document.getElementById("sel-ejercicio").value;
  const metrica = document.getElementById("sel-metrica").value;
  const rango = {
    tipo: document.getElementById("sel-rango").value,
    desde: document.getElementById("rango-desde").value,
    hasta: document.getElementById("rango-hasta").value,
  };
  const datos = calcularSerieProgreso(ejercicioId, metrica, rango);
  const canvas = document.getElementById("grafico");
  const aviso = document.getElementById("grafico-vacio");

  if (datos.valores.length === 0) {
    canvas.style.display = "none";
    aviso.style.display = "block";
    aviso.textContent = "No hay datos de este ejercicio en el rango elegido.";
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    actualizarResumenProgreso(null);
    return;
  }
  canvas.style.display = "block";
  aviso.style.display = "none";
  dibujarGrafico(canvas, datos, METRICAS[metrica].label);
  actualizarResumenProgreso(datos);
}

function actualizarResumenProgreso(datos) {
  const cont = document.getElementById("resumen-progreso");
  if (!datos || datos.valores.length === 0) { cont.innerHTML = ""; return; }
  const primero = datos.valores[0];
  const ultimo = datos.valores[datos.valores.length - 1];
  const diff = Math.round((ultimo - primero) * 10) / 10;
  const max = Math.max(...datos.valores);
  const signo = diff > 0 ? "+" : "";
  const clase = diff > 0 ? "subida" : diff < 0 ? "bajada" : "";
  cont.innerHTML = `
    <div class="stat"><span>Inicio</span><strong>${primero}</strong></div>
    <div class="stat"><span>Actual</span><strong>${ultimo}</strong></div>
    <div class="stat ${clase}"><span>Cambio</span><strong>${signo}${diff}</strong></div>
    <div class="stat"><span>Máximo</span><strong>${max}</strong></div>
  `;
}

// ---------- AJUSTES ----------

function configurarAjustes() {
  const inputPerfil = document.getElementById("input-perfil");
  inputPerfil.value = obtenerPerfil();
  document.getElementById("btn-guardar-perfil").addEventListener("click", () => {
    guardarPerfil(inputPerfil.value.trim());
    refrescarPerfilHeader();
    alert("Perfil guardado");
  });

  document.getElementById("btn-exportar").addEventListener("click", exportarJSON);

  document.getElementById("input-importar").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importarJSON(file)
      .then((n) => {
        document.getElementById("input-perfil").value = obtenerPerfil();
        refrescarPerfilHeader();
        alert(`✅ Importado: ${n} sesiones`);
      })
      .catch((err) => alert("Error al importar: " + err.message));
    e.target.value = "";
  });

  document.getElementById("btn-reiniciar").addEventListener("click", () => {
    if (confirm("¿Borrar TODO el historial? Esto no se puede deshacer.")) {
      reiniciarDatos();
      alert("Historial borrado");
    }
  });
}

// ---------- Utilidades de fecha ----------

// Devuelve la fecha/hora local actual en formato compatible con input datetime-local.
function ahoraLocalISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function formatearFechaLarga(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
