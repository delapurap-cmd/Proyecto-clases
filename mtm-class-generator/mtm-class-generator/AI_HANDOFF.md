# MTM Class Generator - Paquete para IA / Agente

Este paquete convierte un prompt de clase musical en un PDF usando el HTML real de More Than Modes como motor visual.

La regla central es: **no redibujar los módulos**. La IA debe abrir el HTML real, poner los módulos en el estado musical solicitado, capturar screenshots de los módulos reales y componer el PDF.

---

## Objetivo

Generar PDFs de clases como:

```bash
npm run prompt -- "clase de Dm con pentagrama circulo fretboard piano"
```

Salida esperada:

```text
output/Dm.pdf
output/assets/Dm-staff.png
output/assets/Dm-circle.png
output/assets/Dm-fretboard.png
output/assets/Dm-piano.png
```

---

## Flujo completo: prompt -> PDF

```text
1. Prompt humano
   "Clase de Dm con pentagrama, círculo, fretboard y piano"

2. Parser musical
   src/prompt-to-pdf.mjs detecta Dm.
   Dm = D - F - A.

3. JSON de clase
   Se crea o lee class-data/Dm.json.

4. Render visual
   src/render-class.mjs abre source/proyecto_clases_con_monitor.html en Chromium.

5. Bridge
   Se inyecta src/mtm-export-bridge.js dentro del HTML.
   Luego se llama window.MTM_EXPORT.render(data).

6. HTML real de MTM
   El HTML debe usar sus propias funciones internas para poner círculo, fretboard, piano y pentagrama en estado Dm.

7. Capturas
   Playwright captura los selectores definidos en adapter/targets.json.

8. Plantilla PDF
   El generador monta las capturas en un HTML A4.

9. PDF final
   Chromium imprime el HTML a output/Dm.pdf.
```

---

## Instalación

```bash
npm install
```

Si el navegador no está instalado:

```bash
npm run install-browser
```

En servidores donde no se pueda descargar Chromium, usar Chromium del sistema:

```bash
CHROMIUM_PATH=/usr/bin/chromium npm run class -- class-data/Dm.json
```

El paquete ya intenta detectar automáticamente:

```text
/usr/bin/chromium
/usr/bin/chromium-browser
/usr/bin/google-chrome
/usr/bin/google-chrome-stable
```

---

## Paso obligatorio

Copiar el HTML real del editor MTM aquí:

```text
source/proyecto_clases_con_monitor.html
```

Nombre exacto requerido:

```text
proyecto_clases_con_monitor.html
```

Ese HTML debe contener los módulos reales. El archivo no debe ser una imagen ni un mockup.

---

## Comandos

### Generar desde JSON

```bash
npm run class -- class-data/Dm.json
```

### Generar desde prompt

```bash
npm run prompt -- "clase de Dm con pentagrama circulo fretboard piano"
```

### Prueba técnica con HTML demo

Esto solo prueba que el pipeline funciona. No reemplaza el HTML real:

```bash
npm run smoke
```

---

## Contrato de datos

Ejemplo mínimo:

```json
{
  "id": "Dm",
  "title": "D minor",
  "root": "D",
  "quality": "minor",
  "symbol": "Dm",
  "notes": ["D", "F", "A"],
  "midi": [62, 65, 69],
  "modules": ["staff", "circle", "fretboard", "piano"],
  "copy": {
    "headline": "Acorde de Dm",
    "summary": "D minor se forma con D - F - A: tónica, tercera menor y quinta justa."
  }
}
```

---

## Contrato que debe exponer el HTML real

El HTML de MTM debe implementar o permitir inyectar esto:

```js
window.MTM_EXPORT = {
  async render(data) {
    // data.symbol = "Dm"
    // data.root = "D"
    // data.quality = "minor"
    // data.notes = ["D", "F", "A"]
    // data.midi = [62, 65, 69]

    // Usar funciones internas reales del HTML:
    // renderCircle(data)
    // renderFretboard(data)
    // renderPiano(data)
    // renderStaff(data)
  }
}
```

Si todavía no existe `window.MTM_EXPORT`, el bridge manda un evento:

```js
window.addEventListener("mtm:render-class", (event) => {
  const data = event.detail;
  // conectar aquí las funciones reales
});
```

---

## Selectores de captura

Archivo:

```text
adapter/targets.json
```

Ejemplo:

```json
{
  "piano": {
    "label": "Piano",
    "preclick": "button[data-tab='piano']",
    "frame": "#pianoFrame",
    "selector": "#piano-wrap",
    "fallbackSelector": "body"
  }
}
```

Si un crop sale mal, no rehacer el sistema. Ajustar `selector`, `frame`, `preclick` o `waitMs` en `adapter/targets.json`.

---

## Qué debe hacer la IA/agente al recibir este paquete

1. Verificar que existe `source/proyecto_clases_con_monitor.html`.
2. Ejecutar `npm install`.
3. Ejecutar `npm run smoke` para confirmar que Chromium/PDF funcionan.
4. Ejecutar `npm run class -- class-data/Dm.json`.
5. Si falla por selectores, leer `adapter/targets.json` y corregirlos.
6. Si el PDF sale pero los módulos no cambian a Dm, editar el HTML real o inyectar código para conectar `window.MTM_EXPORT.render(data)` con las funciones internas del editor.
7. Una vez cerrado el contrato, generar clases en lote con JSONs.

---

## Diagnóstico rápido de errores

### Error: Falta tu HTML base

No existe:

```text
source/proyecto_clases_con_monitor.html
```

Solución: copiar el HTML real con ese nombre.

### Error: browser executable not found

Solución 1:

```bash
npm run install-browser
```

Solución 2:

```bash
CHROMIUM_PATH=/usr/bin/chromium npm run class -- class-data/Dm.json
```

### PDF generado, pero módulos incorrectos

El pipeline funciona, pero el HTML no está escuchando el estado de clase. Conectar `window.MTM_EXPORT.render(data)`.

### PDF generado, pero crops feos

Corregir `adapter/targets.json`.

---

## Regla de calidad

Un PDF es válido solo si:

- Los gráficos salen del HTML real de MTM.
- Las notas coinciden con el JSON.
- Los crops no están cortados.
- Todos los módulos usan la misma estética del editor.
- El proceso se puede repetir con otro JSON sin intervención manual.

