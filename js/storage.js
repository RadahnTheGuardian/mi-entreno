// Capa de almacenamiento: todo se guarda en localStorage del dispositivo.
// Estructura guardada bajo una única clave: { perfil: "Nombre", sesiones: [...] }

const STORAGE_KEY = "entreno_app_v1";

// Estado en memoria (se carga al inicio).
let DATOS = { perfil: "", sesiones: [] };

function cargarDatos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      DATOS = {
        perfil: typeof parsed.perfil === "string" ? parsed.perfil : "",
        sesiones: Array.isArray(parsed.sesiones) ? parsed.sesiones : [],
      };
    }
  } catch (e) {
    console.error("No se pudieron cargar los datos:", e);
    DATOS = { perfil: "", sesiones: [] };
  }
  return DATOS;
}

function persistir() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DATOS));
}

function obtenerSesiones() {
  // Ordenadas de más reciente a más antigua.
  return [...DATOS.sesiones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

function obtenerSesion(id) {
  return DATOS.sesiones.find((s) => s.id === id) || null;
}

function guardarSesion(sesion) {
  const idx = DATOS.sesiones.findIndex((s) => s.id === sesion.id);
  if (idx >= 0) {
    DATOS.sesiones[idx] = sesion; // edición
  } else {
    DATOS.sesiones.push(sesion); // nueva
  }
  persistir();
}

function borrarSesion(id) {
  DATOS.sesiones = DATOS.sesiones.filter((s) => s.id !== id);
  persistir();
}

// Devuelve las series registradas la última vez para un ejercicio dado.
// Sirve para autorrellenar el formulario de "Entrenar".
function ultimaSesionEjercicio(ejercicioId) {
  const sesiones = obtenerSesiones(); // ya ordenadas: más reciente primero
  for (const s of sesiones) {
    const series = s.series.filter((se) => se.ejercicioId === ejercicioId);
    if (series.length > 0) {
      return series.sort((a, b) => a.set - b.set);
    }
  }
  return null;
}

// Perfil
function obtenerPerfil() {
  return DATOS.perfil;
}
function guardarPerfil(nombre) {
  DATOS.perfil = nombre;
  persistir();
}

// Genera un id único simple.
function nuevoId() {
  return "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

// ---- Copia de seguridad ----

function exportarJSON() {
  const blob = new Blob([JSON.stringify(DATOS, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const nombre = (DATOS.perfil || "entreno").replace(/[^a-z0-9_-]/gi, "_");
  const fecha = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `copia_${nombre}_${fecha}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Importa desde un File. Devuelve una promesa que resuelve con el nº de sesiones.
function importarJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.sesiones)) {
          throw new Error("El archivo no tiene el formato esperado.");
        }
        DATOS = {
          perfil: typeof parsed.perfil === "string" ? parsed.perfil : DATOS.perfil,
          sesiones: parsed.sesiones,
        };
        persistir();
        resolve(DATOS.sesiones.length);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function reiniciarDatos() {
  DATOS = { perfil: DATOS.perfil, sesiones: [] };
  persistir();
}
