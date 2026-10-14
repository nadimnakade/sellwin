# PWA Icon Generation

The manifest references `icon-192.png` and `icon-512.png` which need to be created.

## Option 1: Quick generation with Node

Create a script that generates the icons using sharp or canvas:

```js
// generate-icons.js
const fs = require('fs');
const { createCanvas } = require('canvas');

function makeIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#3b82f6');
  grad.addColorStop(1, '#1e40af');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Letter S
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.55}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', size / 2, size / 2 + size * 0.02);

  return canvas.toBuffer('image/png');
}

fs.writeFileSync('public/icon-192.png', makeIcon(192));
fs.writeFileSync('public/icon-512.png', makeIcon(512));
```

## Option 2: Use an online tool

Generate from your logo at https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator

## Option 3: Use the existing favicon

Copy `public/favicon.ico` → `public/icon-192.png` (rename, won't be perfect but works for testing)

After generating, the PWA will be installable and show in the "Add to Home Screen" prompt.
