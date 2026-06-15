# 💪 Mi Entreno — App de seguimiento (PUSH / PULL / LEGS)

App web instalable (**PWA**) para registrar tus entrenamientos, guardar el historial
y ver tu progreso en gráficos. Funciona **offline** y se instala como una app normal
tanto en **Android** como en **iPhone**, sin tiendas de apps.

- ✅ Tu rutina PUSH/PULL/LEGS ya viene precargada.
- ✅ Apuntas reps y kg por serie (se autorrellena con lo último que hiciste).
- ✅ Historial completo con fecha y hora.
- ✅ Gráficos de progreso por ejercicio: peso máximo, 1RM estimado, volumen y reps.
- ✅ Rango por días concretos, semana, mes o año.
- ✅ Datos guardados **solo en tu móvil** + copia de seguridad exportable.

> ⚠️ **Importante sobre los datos:** se guardan únicamente en el dispositivo donde usas la app.
> El móvil de tu novia tendrá su propio historial independiente. Haz copias de seguridad
> de vez en cuando (Ajustes → Exportar copia) para no perder nada si reinstalas o cambias de móvil.

---

## 🚀 Paso 1: Subir la app a internet (GitHub Pages, gratis)

Necesitas hacer esto **una sola vez**. Te dará una URL que abrirás en cada móvil.

1. Crea una cuenta gratis en https://github.com (si no tienes).
2. Pulsa **New repository** (nuevo repositorio):
   - Nombre: por ejemplo `mi-entreno`.
   - Marca **Public**.
   - Crea el repositorio.
3. En la página del repo, pulsa **Add file → Upload files** y **arrastra TODO el contenido
   de esta carpeta** (los archivos `index.html`, `sw.js`, `manifest.webmanifest`, y las
   carpetas `css/`, `js/`, `icons/`). Confirma con **Commit changes**.
4. Ve a **Settings → Pages** (menú lateral).
5. En **Build and deployment → Source** elige **Deploy from a branch**.
6. En **Branch** selecciona `main` y carpeta `/ (root)`. Pulsa **Save**.
7. Espera 1–2 minutos y recarga. GitHub te mostrará la URL, algo como:
   `https://TU-USUARIO.github.io/mi-entreno/`

Esa es la URL que usarás para instalar la app. 🎉

> Alternativa rápida sin instalar nada: también puedes desplegarla en
> [Netlify Drop](https://app.netlify.com/drop) arrastrando la carpeta; te da una URL al instante.

---

## 📱 Paso 2: Instalar en el móvil

### Android (tu móvil — con Chrome)
1. Abre la URL de la app en **Chrome**.
2. Toca el menú **⋮** (arriba a la derecha).
3. Pulsa **Instalar aplicación** (o **Añadir a pantalla de inicio**).
4. Confirma. Aparecerá el icono 💪 en tu pantalla de inicio como una app normal.

### iPhone (el de tu novia — con Safari)
> En iPhone **tiene que ser con Safari**, no funciona desde Chrome.
1. Abre la URL de la app en **Safari**.
2. Toca el botón **Compartir** (el cuadrado con la flecha hacia arriba, abajo en el centro).
3. Desliza y pulsa **Añadir a pantalla de inicio**.
4. Pulsa **Añadir** (arriba a la derecha). Aparecerá el icono 💪 en la pantalla de inicio.

Una vez instalada, se abre a pantalla completa y **funciona sin internet**.

---

## 🏋️ Cómo usarla

- **Entrenar:** elige el día (PUSH / PULL / LEGS), apunta reps y kg de cada serie y pulsa
  **Guardar sesión**. La próxima vez los campos se rellenan con tu último registro.
- **Historial:** consulta, edita (✏️) o borra (🗑️) sesiones pasadas.
- **Progreso:** elige un ejercicio, la métrica y el rango de tiempo para ver el gráfico de evolución.
- **Ajustes:** pon tu nombre de perfil, **exporta/importa** la copia de seguridad o reinicia los datos.

### Copias de seguridad y pasar datos a otro móvil
1. En el móvil origen: **Ajustes → Exportar copia** (descarga un archivo `.json`).
2. Pásalo al otro móvil (email, WhatsApp, etc.).
3. En el móvil destino: **Ajustes → Importar copia** y selecciona el archivo.

---

## 🧪 Probar en el ordenador antes de subir (opcional)

La PWA necesita servirse por `http://`, no abriendo el archivo directamente. Desde esta carpeta:

```powershell
# Con Python instalado:
python -m http.server 8080
```
Luego abre `http://localhost:8080` en el navegador.

---

## 🗂️ Estructura del proyecto

```
APP/
├── index.html              # Pantalla principal y pestañas
├── manifest.webmanifest    # Configuración PWA
├── sw.js                   # Service worker (offline)
├── css/styles.css          # Estilos
├── js/
│   ├── routine.js          # Tu rutina precargada
│   ├── storage.js          # Guardado local + copias
│   ├── charts.js           # Cálculo y dibujo de progreso
│   ├── app.js              # Lógica de la app
│   └── chart.umd.min.js    # Librería de gráficos (Chart.js)
├── icons/                  # Iconos de la app
└── README.md
```

## ✏️ Modificar la rutina

Si algún día quieres cambiar ejercicios, series o reps, edita `js/routine.js`
(está comentado y es fácil de seguir). Tras cambiar archivos, sube el número de versión
en `sw.js` (`mi-entreno-v1` → `v2`) para que la app se actualice en los móviles.
