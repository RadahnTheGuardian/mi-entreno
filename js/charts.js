// Cálculo de métricas de progreso y dibujo del gráfico con Chart.js.

// Métricas disponibles para cada ejercicio.
const METRICAS = {
  peso_max:  { label: "Peso máximo (kg)",   unidad: "kg" },
  rm:        { label: "1RM estimado (kg)",  unidad: "kg" },
  volumen:   { label: "Volumen total (kg)", unidad: "kg" },
  reps:      { label: "Repeticiones totales", unidad: "reps" },
  reps_max:  { label: "Reps máximas por serie", unidad: "reps" },
};

// 1RM estimado con la fórmula de Epley.
function rmEpley(kg, reps) {
  return kg * (1 + reps / 30);
}

// Calcula el valor de una sesión para un ejercicio según la métrica.
function valorSesion(seriesEjercicio, metrica) {
  if (!seriesEjercicio.length) return null;
  switch (metrica) {
    case "peso_max":
      return Math.max(...seriesEjercicio.map((s) => s.kg || 0));
    case "rm":
      return Math.max(...seriesEjercicio.map((s) => rmEpley(s.kg || 0, s.reps || 0)));
    case "volumen":
      return seriesEjercicio.reduce((acc, s) => acc + (s.kg || 0) * (s.reps || 0), 0);
    case "reps":
      return seriesEjercicio.reduce((acc, s) => acc + (s.reps || 0), 0);
    case "reps_max":
      return Math.max(...seriesEjercicio.map((s) => s.reps || 0));
    default:
      return null;
  }
}

// Filtra sesiones por rango temporal. rango = { tipo, desde, hasta }
// tipo: "todo" | "semana" | "mes" | "anio" | "personalizado"
function filtrarPorRango(sesiones, rango) {
  const ahora = new Date();
  let desde = null;
  let hasta = null;

  if (rango.tipo === "semana") {
    desde = new Date(ahora); desde.setDate(ahora.getDate() - 7);
  } else if (rango.tipo === "mes") {
    desde = new Date(ahora); desde.setMonth(ahora.getMonth() - 1);
  } else if (rango.tipo === "anio") {
    desde = new Date(ahora); desde.setFullYear(ahora.getFullYear() - 1);
  } else if (rango.tipo === "personalizado") {
    if (rango.desde) desde = new Date(rango.desde + "T00:00");
    if (rango.hasta) hasta = new Date(rango.hasta + "T23:59");
  }

  return sesiones.filter((s) => {
    const f = new Date(s.fecha);
    if (desde && f < desde) return false;
    if (hasta && f > hasta) return false;
    return true;
  });
}

// Devuelve { labels: [...], valores: [...] } para el gráfico.
// Un punto por sesión, en orden cronológico ascendente.
function calcularSerieProgreso(ejercicioId, metrica, rango) {
  let sesiones = obtenerSesiones() // más reciente primero
    .filter((s) => s.series.some((se) => se.ejercicioId === ejercicioId));
  sesiones = filtrarPorRango(sesiones, rango);
  // Orden cronológico ascendente para el gráfico.
  sesiones.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const labels = [];
  const valores = [];
  for (const s of sesiones) {
    const seriesEj = s.series.filter((se) => se.ejercicioId === ejercicioId);
    const v = valorSesion(seriesEj, metrica);
    if (v === null) continue;
    labels.push(formatearFechaCorta(s.fecha));
    valores.push(Math.round(v * 10) / 10);
  }
  return { labels, valores };
}

function formatearFechaCorta(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

let chartInstance = null;

function dibujarGrafico(canvas, datos, tituloMetrica) {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  const ctx = canvas.getContext("2d");
  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: datos.labels,
      datasets: [{
        label: tituloMetrica,
        data: datos.valores,
        borderColor: "#ff2a4d",
        backgroundColor: "rgba(255,42,77,0.15)",
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: "#ff2a4d",
        tension: 0.25,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#ececf1" } },
      },
      scales: {
        x: { ticks: { color: "#8a8a99" }, grid: { color: "rgba(255,255,255,0.06)" } },
        y: { ticks: { color: "#8a8a99" }, grid: { color: "rgba(255,255,255,0.06)" }, beginAtZero: false },
      },
    },
  });
}
