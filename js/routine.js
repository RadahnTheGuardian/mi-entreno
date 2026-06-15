// Rutina fija PUSH / PULL / LEGS precargada.
// Cada ejercicio tiene un id estable (no cambiar: se usa como clave del historial).
const ROUTINE = {
  push: {
    nombre: "PUSH (Pecho, Hombro, Tríceps)",
    dias: [1, 4],
    ejercicios: [
      { id: "press_banca",      nombre: "Press banca plano con barra",     series: 4, repMin: 6,  repMax: 8,  rir: "RIR 1" },
      { id: "press_inclinado",  nombre: "Aperturas",                        series: 3, repMin: 8,  repMax: 10, rir: "RIR 1" },
      { id: "press_militar",    nombre: "Press militar",                    series: 3, repMin: 8,  repMax: 10, rir: "RIR 1" },
      { id: "fondos",           nombre: "Fondos",                           series: 3, repMin: 10, repMax: 12, rir: "RIR 1" },
      { id: "elev_laterales",   nombre: "Elevaciones laterales",            series: 3, repMin: 12, repMax: 15, rir: "RIR 1-2" },
      { id: "ext_triceps",      nombre: "Extensión de tríceps en cuerda",   series: 3, repMin: 12, repMax: 15, rir: "RIR 1-2" },
    ],
  },
  pull: {
    nombre: "PULL (Espalda, Bíceps, Hombro post.)",
    dias: [2, 5],
    ejercicios: [
      { id: "dominadas",     nombre: "Jalón al pecho con agarre cerrado", series: 4, repMin: 6,  repMax: 10, rir: "RIR 1" },
      { id: "remo_barra",    nombre: "Remo con barra",              series: 4, repMin: 8,  repMax: 10, rir: "RIR 1" },
      { id: "jalon_pecho",   nombre: "Jalón al pecho",              series: 3, repMin: 10, repMax: 12, rir: "RIR 1" },
      { id: "face_pull",     nombre: "Face pull",                   series: 3, repMin: 12, repMax: 15, rir: "RIR 1-2" },
      { id: "curl_barra",    nombre: "Curl de bíceps con barra",    series: 3, repMin: 8,  repMax: 10, rir: "RIR 1" },
      { id: "curl_martillo", nombre: "Curl martillo",               series: 3, repMin: 12, repMax: 15, rir: "RIR 1-2" },
    ],
  },
  legs: {
    nombre: "LEGS (Piernas completas)",
    dias: [3],
    ejercicios: [
      { id: "sentadilla",     nombre: "Sentadilla libre",          series: 4, repMin: 6,  repMax: 8,  rir: "RIR 1" },
      { id: "prensa",         nombre: "Prensa de piernas",         series: 3, repMin: 10, repMax: 12, rir: "RIR 1" },
      { id: "peso_muerto_rum", nombre: "Abductores",               series: 3, repMin: 8,  repMax: 10, rir: "RIR 1" },
      { id: "curl_femoral",   nombre: "Curl femoral tumbado",      series: 3, repMin: 10, repMax: 12, rir: "RIR 1" },
      { id: "ext_cuadriceps", nombre: "Extensión de cuádriceps",   series: 3, repMin: 12, repMax: 15, rir: "RIR 1-2" },
      { id: "elev_talones",   nombre: "Elevación de talones de pie", series: 4, repMin: 15, repMax: 20, rir: "RIR 1-2" },
    ],
  },
};

// Etiquetas legibles de cada día.
const DIAS_LABEL = {
  push: "PUSH · Día 1 y 4",
  pull: "PULL · Día 2 y 5",
  legs: "LEGS · Día 3",
};

// Devuelve el ejercicio (con su día) a partir de su id. Útil para el historial.
function buscarEjercicio(ejercicioId) {
  for (const dia of Object.keys(ROUTINE)) {
    const ej = ROUTINE[dia].ejercicios.find((e) => e.id === ejercicioId);
    if (ej) return { ...ej, dia };
  }
  return null;
}

// Lista plana de todos los ejercicios (para el selector de Progreso).
function todosLosEjercicios() {
  const lista = [];
  for (const dia of Object.keys(ROUTINE)) {
    for (const ej of ROUTINE[dia].ejercicios) {
      lista.push({ ...ej, dia });
    }
  }
  return lista;
}
