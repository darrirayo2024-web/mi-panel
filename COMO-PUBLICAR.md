# Mi Panel — cómo subirlo a internet (GitHub Pages)

Con esto tu app queda en un enlace propio, se podrá instalar en tu Android
como app de verdad, y se actualiza sola cada vez que cambies algo.

## 1. Crear la cuenta y el repositorio
1. Entra a **github.com** desde Chrome en tu teléfono y crea una cuenta (gratis).
2. Toca **+ → New repository**.
3. Nombre: `mi-panel` (o el que quieras). Público. Crear.

## 2. Subir los archivos
1. Dentro del repositorio, toca **Add file → Upload files**.
2. Sube **todo el contenido** de esta carpeta (no la carpeta en sí, sino lo
   que hay dentro: `index.html`, `manifest.json`, `sw.js`, las carpetas
   `css/`, `js/` e `icons/`). Si Acode te deja comprimir, puedes subir el
   `.zip` y GitHub lo puede descomprimir al verlo, aunque lo más simple es
   subir los archivos sueltos manteniendo las carpetas.
3. Escribe un mensaje como "Primera versión" y confirma (**Commit changes**).

## 3. Activar GitHub Pages
1. Ve a **Settings → Pages** (dentro del repositorio).
2. En "Branch" elige `main` y la carpeta `/root`. Guarda.
3. Espera un minuto y GitHub te da un enlace parecido a:
   `https://tu-usuario.github.io/mi-panel/`

## 4. Instalar la app en tu Android
1. Abre ese enlace en **Chrome**.
2. Toca el menú **⋮ → Instalar app** (o "Añadir a pantalla de inicio").
3. Listo: te queda un ícono propio, en pantalla completa, sin barra del navegador.

## Cómo actualizarla después
Cada vez que quieras agregar algo nuevo:
1. Cambia o añade el archivo correspondiente en el repositorio (**Add file**
   o edita el archivo existente con el lápiz ✏️).
2. Confirma el cambio (**Commit changes**).
3. Sube en 1 el número de la línea `const CACHE = 'mi-panel-v1';` en `sw.js`
   (por ejemplo a `'mi-panel-v2'`) para que los teléfonos sepan que hay
   una versión nueva y la descarguen.
4. La próxima vez que abras la app con internet, se actualiza sola.

**Tus datos no se pierden al actualizar**, porque siguen guardados en tu
teléfono (no en GitHub) mientras la app siga en el mismo enlace.

## Antes de instalarla: haz un respaldo
Entra a **Ajustes → Copiar respaldo** en la versión que ya tienes abierta
(el enlace publicado como artifact) y guarda ese texto. Luego, en la app ya
instalada, entra a **Ajustes → Importar pegado** y pega ese texto para
recuperar tus tareas, hábitos, notas, dinero y eventos. Las canciones las
vuelves a importar una vez desde tu teléfono.

## Nota honesta sobre la música
El reproductor soporta MP3, FLAC, M4A/AAC, OGG y WAV, y lee la portada
incrustada en el archivo cuando existe. MP3 y FLAC quedaron probados de punta
a punta. M4A/AAC también se probó para leer la portada correctamente; la
reproducción de AAC no se pudo probar en el entorno donde armé esto (le
faltaba ese códec), pero es un formato que Android y Chrome soportan de
forma nativa, así que en tu teléfono debería sonar sin problema. Si algún
archivo no suena, avísame el nombre del formato y lo reviso.
