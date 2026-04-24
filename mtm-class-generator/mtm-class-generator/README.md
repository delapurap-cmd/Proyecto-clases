# MTM Class Generator

Generador local para crear PDFs de clases de More Than Modes usando el HTML real del editor como motor visual.

Lee primero:

```text
AI_HANDOFF.md
```

## Uso mínimo

```bash
npm install
npm run class -- class-data/Dm.json
```

## Uso desde prompt

```bash
npm run prompt -- "clase de Dm con pentagrama circulo fretboard piano"
```

## Requisito obligatorio

Copia tu HTML real aquí:

```text
source/proyecto_clases_con_monitor.html
```

## Prueba técnica

```bash
npm run smoke
```

La prueba técnica solo confirma que Chromium, screenshots y PDF funcionan. El PDF fiel requiere tu HTML real.
