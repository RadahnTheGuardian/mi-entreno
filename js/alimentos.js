// Apartado "Alimentos": lee el código de barras del producto con la cámara
// y obtiene sus valores nutricionales desde Open Food Facts (gratis, sin clave).
// Si el producto no aparece, permite leer la etiqueta con una foto (OCR).
// Todo se guarda en el dispositivo y entra en la copia de seguridad (.json).

const OFF_API = "https://world.openfoodfacts.org/api/v2/product/";
const TESS_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

let escanerStream = null;   // MediaStream de la cámara
let escanerTimer = null;    // intervalo que analiza fotogramas
let barcodeDetector = null; // detector nativo del navegador

function configurarAlimentos() {
  document.getElementById("btn-escanear").addEventListener("click", alternarEscaner);
  document.getElementById("btn-detener").addEventListener("click", detenerEscaner);
  document.getElementById("btn-buscar-codigo").addEventListener("click", buscarManual);
  document.getElementById("input-codigo").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); buscarManual(); }
  });
  document.getElementById("input-etiqueta").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) leerEtiquetaFoto(file);
    e.target.value = ""; // permite repetir la misma foto
  });
}

function buscarManual() {
  const cod = document.getElementById("input-codigo").value.trim();
  if (cod) buscarYMostrar(cod);
}

// ---------- Cámara + lectura del código ----------

async function alternarEscaner() {
  if (escanerStream) { detenerEscaner(); return; }
  await iniciarEscaner();
}

async function iniciarEscaner() {
  const estado = document.getElementById("escaner-estado");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    estado.textContent = "Tu navegador no permite usar la cámara aquí. Escribe el código a mano.";
    return;
  }
  if (!("BarcodeDetector" in window)) {
    estado.textContent = "Este navegador no lee códigos automáticamente (p. ej. iPhone con Safari). " +
      "Escribe el código de barras a mano, o usa 'Leer etiqueta con foto'.";
    return;
  }
  try {
    barcodeDetector = barcodeDetector || new BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
    });
    escanerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    const video = document.getElementById("escaner-video");
    video.srcObject = escanerStream;
    await video.play();
    document.getElementById("escaner-wrap").classList.add("activo");
    document.getElementById("btn-detener").hidden = false;
    document.getElementById("btn-escanear").innerHTML = '<span class="emoji">📷</span> Escaneando…';
    estado.textContent = "Apunta al código de barras del producto.";
    escanerTimer = setInterval(() => detectarFrame(video), 350);
  } catch (e) {
    estado.textContent = "No se pudo abrir la cámara: " + (e && e.message ? e.message : e);
    detenerEscaner();
  }
}

async function detectarFrame(video) {
  if (!barcodeDetector || !video.videoWidth) return;
  try {
    const codigos = await barcodeDetector.detect(video);
    if (codigos && codigos.length) {
      const cod = codigos[0].rawValue;
      if (navigator.vibrate) navigator.vibrate(60);
      detenerEscaner();
      buscarYMostrar(cod);
    }
  } catch (e) { /* fotograma no legible: seguimos intentando */ }
}

function detenerEscaner() {
  if (escanerTimer) { clearInterval(escanerTimer); escanerTimer = null; }
  if (escanerStream) { escanerStream.getTracks().forEach((t) => t.stop()); escanerStream = null; }
  const wrap = document.getElementById("escaner-wrap");
  if (wrap) wrap.classList.remove("activo");
  const btnDet = document.getElementById("btn-detener");
  if (btnDet) btnDet.hidden = true;
  const btnEsc = document.getElementById("btn-escanear");
  if (btnEsc) btnEsc.innerHTML = '<span class="emoji">📷</span> Escanear código';
}

// ---------- Consulta a Open Food Facts ----------

async function buscarYMostrar(codigo) {
  const estado = document.getElementById("escaner-estado");
  const cont = document.getElementById("alimento-resultado");
  estado.textContent = "Buscando " + codigo + "…";
  cont.innerHTML = "";
  try {
    const prod = await buscarProducto(codigo);
    estado.textContent = "";
    if (!prod) {
      cont.innerHTML = `<p class="hint aviso">No encontramos el código <strong>${escapeHtml(codigo)}</strong> ` +
        `en la base de datos. Usa "Leer etiqueta con foto" o rellena los datos a mano y guárdalo igualmente.</p>` +
        tarjetaEditable({ codigo });
    } else {
      cont.innerHTML = `<p class="hint ok-msg">✔ Producto encontrado. Revisa y guarda.</p>` +
        tarjetaEditable(prod);
    }
    enlazarGuardar(cont);
    cont.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (e) {
    estado.textContent = "";
    cont.innerHTML = `<p class="hint aviso">No se pudo consultar (¿sin conexión?). ` +
      `Puedes leer la etiqueta con una foto o escribir los valores a mano.</p>` + tarjetaEditable({ codigo });
    enlazarGuardar(cont);
  }
}

async function buscarProducto(codigo) {
  const url = OFF_API + encodeURIComponent(codigo) +
    ".json?fields=product_name,brands,nutriments,image_small_url";
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.status !== 1 || !data.product) return null;
  const p = data.product;
  const n = p.nutriments || {};
  return {
    codigo,
    nombre: p.product_name || "",
    marca: p.brands || "",
    imagen: p.image_small_url || "",
    kcal: num(n["energy-kcal_100g"]),
    proteinas: num(n.proteins_100g),
    grasas: num(n.fat_100g),
    carbohidratos: num(n.carbohydrates_100g),
    azucares: num(n.sugars_100g),
    sal: num(n.salt_100g),
  };
}

function num(v) { const x = parseFloat(v); return isNaN(x) ? null : Math.round(x * 10) / 10; }
function fmt(v, u) { return v === null || v === undefined ? "—" : v + (u || ""); }

// ---------- OCR de la etiqueta nutricional (respaldo) ----------

let tessCargando = null;

// Carga Tesseract.js bajo demanda (solo la primera vez que se usa el OCR).
function cargarTesseract() {
  if (window.Tesseract) return Promise.resolve();
  if (tessCargando) return tessCargando;
  tessCargando = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = TESS_URL;
    s.onload = resolve;
    s.onerror = () => { tessCargando = null; reject(new Error("no se pudo cargar el lector (¿sin conexión?)")); };
    document.head.appendChild(s);
  });
  return tessCargando;
}

async function leerEtiquetaFoto(file) {
  const estado = document.getElementById("escaner-estado");
  const cont = document.getElementById("alimento-resultado");
  cont.innerHTML = "";
  estado.textContent = "Cargando lector de etiquetas…";
  try {
    await cargarTesseract();
    estado.textContent = "Leyendo la etiqueta… esto puede tardar unos segundos.";
    const { data } = await Tesseract.recognize(file, "spa");
    const prod = parsearEtiqueta(data && data.text ? data.text : "");
    estado.textContent = "";
    cont.innerHTML = `<p class="hint ok-msg">✔ Etiqueta leída. Revisa los valores (corrige lo que haga falta), ` +
      `ponle nombre y guarda.</p>` + tarjetaEditable(prod);
    enlazarGuardar(cont);
    cont.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (e) {
    estado.textContent = "No se pudo leer la etiqueta (" + (e && e.message ? e.message : e) +
      "). Prueba con una foto más nítida y recortada al recuadro nutricional, o escribe los valores a mano.";
    cont.innerHTML = tarjetaEditable({});
    enlazarGuardar(cont);
  }
}

// Extrae los valores nutricionales del texto reconocido (etiquetas en español).
function parsearEtiqueta(texto) {
  const t = String(texto || "").replace(/\s+/g, " ").toLowerCase();
  return {
    nombre: "",
    marca: "",
    kcal: buscarKcal(t),
    proteinas: numTras(t, "prote[ií]na"),
    carbohidratos: numTras(t, "hidratos de carbono|carbohidratos|hidratos"),
    azucares: numTras(t, "az[uú]cares"),
    grasas: numTras(t, "grasas|materia grasa"),
    sal: numTras(t, "\\bsal\\b"),
  };
}

function buscarKcal(t) {
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*kcal/);
  return m ? Math.round(parseFloat(m[1].replace(",", "."))) : null;
}

// Primer número que aparece justo después de una palabra clave.
function numTras(t, kw) {
  const re = new RegExp("(?:" + kw + ")[^0-9]{0,25}(\\d+(?:[.,]\\d+)?)");
  const m = t.match(re);
  if (!m) return null;
  return Math.round(parseFloat(m[1].replace(",", ".")) * 10) / 10;
}

// ---------- Tarjeta editable (resultado) ----------

function tarjetaEditable(prod) {
  prod = prod || {};
  const img = prod.imagen
    ? `<img class="alimento-img" src="${escapeHtml(prod.imagen)}" alt="" loading="lazy">` : "";
  return `
    <div class="alimento-card resultado">
      <div class="alimento-cab">
        ${img}
        <div class="alimento-campos">
          <input type="text" id="al-nombre" placeholder="Nombre del producto" value="${escapeHtml(prod.nombre || "")}">
          <input type="text" id="al-marca" placeholder="Marca" value="${escapeHtml(prod.marca || "")}">
        </div>
      </div>
      <p class="hint">Valores por 100 g/ml</p>
      <div class="nutri-grid">
        ${campoNutri("al-kcal", "kcal", prod.kcal)}
        ${campoNutri("al-prot", "Proteínas (g)", prod.proteinas)}
        ${campoNutri("al-carb", "Hidratos (g)", prod.carbohidratos)}
        ${campoNutri("al-azuc", "Azúcares (g)", prod.azucares)}
        ${campoNutri("al-gras", "Grasas (g)", prod.grasas)}
        ${campoNutri("al-sal", "Sal (g)", prod.sal)}
      </div>
      <input type="hidden" id="al-codigo" value="${escapeHtml(prod.codigo || "")}">
      <button id="btn-guardar-alimento" class="btn-principal"><span class="emoji">💾</span> Guardar alimento</button>
    </div>`;
}

function campoNutri(id, label, val) {
  return `<label class="nutri-campo"><span>${label}</span>
    <input type="number" step="0.1" min="0" inputmode="decimal" id="${id}" value="${val == null ? "" : val}"></label>`;
}

function enlazarGuardar(cont) {
  const btn = cont.querySelector("#btn-guardar-alimento");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const nombre = cont.querySelector("#al-nombre").value.trim();
    if (!nombre) { alert("Ponle un nombre al producto."); return; }
    const alimento = {
      id: nuevoId(),
      fecha: new Date().toISOString(),
      codigo: cont.querySelector("#al-codigo").value.trim(),
      nombre,
      marca: cont.querySelector("#al-marca").value.trim(),
      kcal: leerNum(cont, "#al-kcal"),
      proteinas: leerNum(cont, "#al-prot"),
      carbohidratos: leerNum(cont, "#al-carb"),
      azucares: leerNum(cont, "#al-azuc"),
      grasas: leerNum(cont, "#al-gras"),
      sal: leerNum(cont, "#al-sal"),
    };
    guardarAlimento(alimento);
    cont.innerHTML = "";
    document.getElementById("input-codigo").value = "";
    document.getElementById("escaner-estado").textContent = "";
    renderAlimentos();
    alert("✅ Alimento guardado");
  });
}

function leerNum(cont, sel) {
  const x = parseFloat(cont.querySelector(sel).value);
  return isNaN(x) ? null : Math.round(x * 10) / 10;
}

// ---------- Lista de alimentos guardados ----------

function renderAlimentos() {
  const cont = document.getElementById("lista-alimentos");
  const items = obtenerAlimentos();
  if (!items.length) {
    cont.innerHTML = `<p class="vacio">Aún no has guardado alimentos. Escanea un producto para empezar.</p>`;
    return;
  }
  cont.innerHTML = items.map((a) => `
    <div class="alimento-card">
      <div class="alimento-cab2">
        <div>
          <strong>${escapeHtml(a.nombre)}</strong>
          ${a.marca ? `<span class="al-marca">${escapeHtml(a.marca)}</span>` : ""}
        </div>
        <button class="mini" data-borrar="${a.id}"><span class="emoji">🗑️</span></button>
      </div>
      <div class="nutri-grid lectura">
        <div class="nutri-campo"><span>kcal</span><strong>${fmt(a.kcal)}</strong></div>
        <div class="nutri-campo"><span>Prot.</span><strong>${fmt(a.proteinas, "g")}</strong></div>
        <div class="nutri-campo"><span>Hidr.</span><strong>${fmt(a.carbohidratos, "g")}</strong></div>
        <div class="nutri-campo"><span>Azúc.</span><strong>${fmt(a.azucares, "g")}</strong></div>
        <div class="nutri-campo"><span>Grasas</span><strong>${fmt(a.grasas, "g")}</strong></div>
        <div class="nutri-campo"><span>Sal</span><strong>${fmt(a.sal, "g")}</strong></div>
      </div>
      <p class="hist-fecha">${a.codigo ? "Cód. " + escapeHtml(a.codigo) + " · " : ""}por 100 g/ml</p>
    </div>`).join("");

  cont.querySelectorAll("button[data-borrar]").forEach((b) => {
    b.addEventListener("click", () => {
      if (confirm("¿Borrar este alimento?")) { borrarAlimento(b.dataset.borrar); renderAlimentos(); }
    });
  });
}
