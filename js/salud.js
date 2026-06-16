// Apartado "Salud": calculadora de tasa metabólica basal (TMB), IMC,
// % de grasa estimado y calorías recomendadas según objetivo.
// Fórmulas: TMB con Mifflin-St Jeor; % grasa estimado con Deurenberg.

function configurarSalud() {
  const campos = ["sa-sexo", "sa-edad", "sa-altura", "sa-peso", "sa-actividad", "sa-objetivo"];

  // Precargar valores guardados.
  const s = obtenerSalud();
  if (s && typeof s === "object") {
    campos.forEach((id) => {
      const clave = id.replace("sa-", "");
      if (s[clave] !== undefined && s[clave] !== null && s[clave] !== "") {
        const el = document.getElementById(id);
        if (el) el.value = s[clave];
      }
    });
  }

  campos.forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", calcularSalud);
    el.addEventListener("change", calcularSalud);
  });

  // Botones de ayuda "?": muestran/ocultan su explicación (delegación).
  document.getElementById("view-salud").addEventListener("click", (e) => {
    const btn = e.target.closest(".ayuda");
    if (!btn) return;
    const wrap = btn.closest(".campo-salud, .stat");
    const texto = wrap ? wrap.querySelector(".ayuda-texto") : null;
    if (texto) {
      texto.hidden = !texto.hidden;
      btn.classList.toggle("activa", !texto.hidden);
    }
  });
}

function calcularSalud() {
  const sexo = document.getElementById("sa-sexo").value;
  const edad = parseFloat(document.getElementById("sa-edad").value);
  const altura = parseFloat(document.getElementById("sa-altura").value);
  const peso = parseFloat(document.getElementById("sa-peso").value);
  const actividad = parseFloat(document.getElementById("sa-actividad").value) || 1.2;
  const objetivo = document.getElementById("sa-objetivo").value;

  guardarSalud({
    sexo, objetivo,
    edad: isNaN(edad) ? "" : edad,
    altura: isNaN(altura) ? "" : altura,
    peso: isNaN(peso) ? "" : peso,
    actividad: String(actividad),
  });

  const cont = document.getElementById("salud-resultados");
  if (isNaN(edad) || isNaN(altura) || isNaN(peso) || altura <= 0 || peso <= 0) {
    cont.innerHTML = `<p class="vacio">Rellena edad, altura y peso para ver tus resultados.</p>`;
    return;
  }

  // TMB (Mifflin-St Jeor)
  const tmb = sexo === "mujer"
    ? (10 * peso + 6.25 * altura - 5 * edad - 161)
    : (10 * peso + 6.25 * altura - 5 * edad + 5);

  // Gasto total diario (mantenimiento)
  const mantenimiento = tmb * actividad;

  // IMC
  const m = altura / 100;
  const imc = peso / (m * m);

  // % grasa estimado (Deurenberg): hombre=1, mujer=0
  const sexoNum = sexo === "mujer" ? 0 : 1;
  let grasa = 1.20 * imc + 0.23 * edad - 10.8 * sexoNum - 5.4;
  if (grasa < 0) grasa = 0;

  // Calorías según objetivo
  const factor = objetivo === "perder" ? 0.8 : objetivo === "ganar" ? 1.1 : 1;
  const objetivoKcal = mantenimiento * factor;
  const objetivoLabel = objetivo === "perder" ? "Para perder grasa"
    : objetivo === "ganar" ? "Para ganar músculo" : "Para mantenerte";

  // Peso saludable (rango de IMC 18.5–24.9 para tu altura)
  const pesoMin = 18.5 * m * m;
  const pesoMax = 24.9 * m * m;

  // Macronutrientes para las calorías objetivo.
  const protPorKg = objetivo === "perder" ? 2.2 : objetivo === "ganar" ? 2.0 : 1.8;
  const protG = protPorKg * peso;     // proteína
  const grasaG = 0.9 * peso;          // grasas (~0,9 g/kg)
  let carbG = (objetivoKcal - protG * 4 - grasaG * 9) / 4; // hidratos: resto de kcal
  if (carbG < 0) carbG = 0;

  cont.innerHTML = `
    ${tarjetaResultado("IMC", imc.toFixed(1), claseIMC(imc), categoriaIMC(imc),
      "Índice de Masa Corporal: relación entre tu peso y tu altura. Da una idea general de si estás por debajo, dentro o por encima de un peso saludable. Ojo: no distingue músculo de grasa, así que en gente muy musculada puede salir alto sin ser un problema.")}
    ${tarjetaResultado("% grasa (estimado)", grasa.toFixed(1) + "%", "", "aprox.",
      "Estimación del porcentaje de tu peso que es grasa, calculada a partir del IMC, la edad y el sexo. Es solo orientativa; una báscula de bioimpedancia o medir pliegues de la piel dan un dato más fiable.")}
    ${tarjetaResultado("TMB", Math.round(tmb) + " kcal", "", "en reposo",
      "Tasa Metabólica Basal: las calorías que tu cuerpo gasta en reposo total (respirar, latir el corazón, mantener la temperatura…) si te quedaras tumbado todo el día. Es tu gasto mínimo de energía.")}
    ${tarjetaResultado("Mantenimiento", Math.round(mantenimiento) + " kcal", "", "al día",
      "Las calorías que gastas en un día normal contando tu nivel de actividad. Si comes aproximadamente esta cantidad, tu peso tiende a mantenerse igual.")}
    ${tarjetaResultado(objetivoLabel, Math.round(objetivoKcal) + " kcal", "destacado", "objetivo",
      "Las calorías recomendadas para tu objetivo: un déficit (~20% menos que el mantenimiento) para perder grasa, lo mismo para mantenerte, o un superávit (~10% más) para ganar músculo. Ajusta según veas resultados cada 2-3 semanas.")}
    ${tarjetaResultado("Peso saludable", pesoMin.toFixed(0) + "–" + pesoMax.toFixed(0) + " kg", "", "rango",
      "El rango de peso que corresponde a un IMC saludable (entre 18,5 y 24,9) para tu altura. Es una referencia general orientativa, no un objetivo exacto: no tiene en cuenta cuánto de tu peso es músculo.")}
    ${tarjetaResultado("Proteína", Math.round(protG) + " g", "", protPorKg + " g/kg al día",
      "Cantidad de proteína al día recomendada para tu objetivo. La proteína ayuda a mantener y construir músculo y a saciarte. Reparte esa cantidad entre las comidas del día (carne, pescado, huevos, lácteos, legumbres, etc.).")}
    ${tarjetaResultado("Carbohidratos", Math.round(carbG) + " g", "", "al día",
      "Los hidratos de carbono son tu principal fuente de energía, sobre todo para entrenar (arroz, pasta, pan, patata, fruta…). Esta cifra es el resto de calorías una vez cubiertas la proteína y la grasa.")}
    ${tarjetaResultado("Grasas", Math.round(grasaG) + " g", "", "≈0,9 g/kg al día",
      "Las grasas son necesarias para tus hormonas y para absorber ciertas vitaminas (aceite de oliva, frutos secos, aguacate, pescado azul…). Conviene no bajar de unos 0,8 g por kilo de peso.")}
    ${tarjetaResultado("Creatina", "3–5 g", "", "al día",
      "La creatina monohidrato es de los suplementos más estudiados y seguros: mejora la fuerza y el rendimiento. La dosis habitual es de 3 a 5 g al día, todos los días (también los que no entrenas); da igual la hora. Opcional: una 'fase de carga' de ~20 g/día repartidos durante 5-7 días para notar antes el efecto. Si tienes algún problema renal, consúltalo con un profesional.")}
  `;
}

function tarjetaResultado(titulo, valor, clase, etiqueta, ayuda) {
  return `
    <div class="stat ${clase}">
      <div class="stat-cab">
        <span>${titulo}</span>
        <button type="button" class="ayuda" aria-label="¿Qué es?">?</button>
      </div>
      <strong>${valor}</strong>
      <em>${etiqueta || ""}</em>
      <p class="ayuda-texto" hidden>${ayuda}</p>
    </div>`;
}

function categoriaIMC(imc) {
  if (imc < 18.5) return "bajo peso";
  if (imc < 25) return "normal";
  if (imc < 30) return "sobrepeso";
  return "obesidad";
}

function claseIMC(imc) {
  return (imc >= 18.5 && imc < 25) ? "subida" : "bajada";
}
