// Métricas mensuales: agrega todas las sesiones por mes para ver la
// evolución global del entrenamiento (volumen, sesiones, series, reps).

const METRICAS_MENSUALES = {
  volumen:  { label: "Volumen (kg)", calc: (ses) => ses.reduce((a, s) => a + volumenSesion(s), 0) },
  sesiones: { label: "Sesiones",     calc: (ses) => ses.length },
  series:   { label: "Series",       calc: (ses) => ses.reduce((a, s) => a + s.series.length, 0) },
  reps:     { label: "Repeticiones", calc: (ses) => ses.reduce((a, s) => a + s.series.reduce((b, x) => b + (x.reps || 0), 0), 0) },
};

function volumenSesion(s) {
  return s.series.reduce((a, x) => a + (x.reps || 0) * (x.kg || 0), 0);
}

// Clave ordenable "YYYY-MM" para agrupar por mes natural.
function claveMes(fecha) {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function etiquetaMes(clave) {
  const [y, m] = clave.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "short", year: "numeric" });
}

function agruparPorMes() {
  const grupos = {};
  for (const s of obtenerSesiones()) {
    const k = claveMes(s.fecha);
    (grupos[k] = grupos[k] || []).push(s);
  }
  return grupos;
}

// Devuelve { labels, valores, meses } en orden cronológico ascendente.
function calcularMetricasMensuales(metrica) {
  const grupos = agruparPorMes();
  const claves = Object.keys(grupos).sort();
  const labels = [];
  const valores = [];
  const meses = [];
  for (const k of claves) {
    valores.push(Math.round(METRICAS_MENSUALES[metrica].calc(grupos[k]) * 10) / 10);
    labels.push(etiquetaMes(k));
    meses.push({ clave: k, sesiones: grupos[k] });
  }
  return { labels, valores, meses };
}

// ---------- Vista Métricas ----------

let chartMensual = null;

function configurarMetricas() {
  const sel = document.getElementById("sel-metrica-mensual");
  sel.innerHTML = Object.entries(METRICAS_MENSUALES)
    .map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
  sel.addEventListener("change", renderMetricas);
}

function renderMetricas() {
  const metrica = document.getElementById("sel-metrica-mensual").value || "volumen";
  const datos = calcularMetricasMensuales(metrica);
  const canvas = document.getElementById("grafico-mensual");
  const vacio = document.getElementById("metricas-vacio");
  const resumen = document.getElementById("metricas-resumen");
  const tabla = document.getElementById("metricas-tabla");

  if (datos.valores.length === 0) {
    canvas.style.display = "none";
    vacio.style.display = "block";
    vacio.textContent = "Aún no hay datos. Registra tu primer entreno para ver tus avances mensuales.";
    resumen.innerHTML = "";
    tabla.innerHTML = "";
    if (chartMensual) { chartMensual.destroy(); chartMensual = null; }
    return;
  }
  canvas.style.display = "block";
  vacio.style.display = "none";
  dibujarGraficoMensual(canvas, datos, METRICAS_MENSUALES[metrica].label);
  renderResumenMensual(resumen, datos, metrica);
  renderTablaMensual(tabla, datos);
}

function renderResumenMensual(cont, datos, metrica) {
  const n = datos.valores.length;
  const actual = datos.valores[n - 1];
  const previo = n > 1 ? datos.valores[n - 2] : null;

  let cambioHtml;
  if (previo === null || previo === 0) {
    cambioHtml = `<div class="stat"><span>vs mes ant.</span><strong>—</strong></div>`;
  } else {
    const pct = Math.round(((actual - previo) / previo) * 100);
    const signo = pct > 0 ? "+" : "";
    const clase = pct > 0 ? "subida" : pct < 0 ? "bajada" : "";
    cambioHtml = `<div class="stat ${clase}"><span>vs mes ant.</span><strong>${signo}${pct}%</strong></div>`;
  }

  const totalSesiones = obtenerSesiones().length;
  cont.innerHTML = `
    <div class="stat"><span>Meses activos</span><strong>${n}</strong></div>
    <div class="stat"><span>Sesiones tot.</span><strong>${totalSesiones}</strong></div>
    <div class="stat"><span>Este mes</span><strong>${actual}</strong></div>
    ${cambioHtml}
  `;
}

function renderTablaMensual(cont, datos) {
  cont.innerHTML = [...datos.meses].reverse().map((m) => {
    const ses = m.sesiones;
    const vol = Math.round(ses.reduce((a, s) => a + volumenSesion(s), 0));
    const series = ses.reduce((a, s) => a + s.series.length, 0);
    const conteo = { push: 0, pull: 0, legs: 0 };
    ses.forEach((s) => { conteo[s.dia] = (conteo[s.dia] || 0) + 1; });
    return `
      <div class="mes-card">
        <div class="mes-head"><strong>${etiquetaMes(m.clave)}</strong><span>${ses.length} sesiones</span></div>
        <div class="mes-stats">
          <span><span class="emoji">📦</span> ${vol} kg vol.</span>
          <span><span class="emoji">🔢</span> ${series} series</span>
        </div>
        <div class="mes-dias">
          <span class="hist-dia push">PUSH ${conteo.push}</span>
          <span class="hist-dia pull">PULL ${conteo.pull}</span>
          <span class="hist-dia legs">LEGS ${conteo.legs}</span>
        </div>
      </div>`;
  }).join("");
}

function dibujarGraficoMensual(canvas, datos, titulo) {
  if (chartMensual) { chartMensual.destroy(); chartMensual = null; }
  const ctx = canvas.getContext("2d");
  chartMensual = new Chart(ctx, {
    type: "bar",
    data: {
      labels: datos.labels,
      datasets: [{
        label: titulo,
        data: datos.valores,
        backgroundColor: "rgba(255,42,77,0.35)",
        borderColor: "#ff2a4d",
        borderWidth: 2,
        borderRadius: 4,
        hoverBackgroundColor: "rgba(255,42,77,0.55)",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#ececf1" } } },
      scales: {
        x: { ticks: { color: "#8a8a99" }, grid: { color: "rgba(255,255,255,0.06)" } },
        y: { ticks: { color: "#8a8a99" }, grid: { color: "rgba(255,255,255,0.06)" }, beginAtZero: true },
      },
    },
  });
}
