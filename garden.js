const canvas = document.querySelector('#garden');
const context = canvas.getContext('2d');
const toolButtons = [...document.querySelectorAll('[data-tool]')];
const designButtons = [...document.querySelectorAll('[data-design-choice]')];
const undoButton = document.querySelector('#undo-button');
const resetButton = document.querySelector('#reset-button');
const lightToggle = document.querySelector('#light-toggle');
const lightLabel = document.querySelector('#light-label');
const gardenStatus = document.querySelector('#garden-status');
const changeCount = document.querySelector('#change-count');
const modeAnnouncer = document.querySelector('#mode-announcer');
const toolHint = document.querySelector('#tool-hint');

const hints = {
  rake: 'Drag gently across the gravel to leave a line.',
  stone: 'Choose a quiet place for a stone.',
  moss: 'Add a soft patch of moss to the garden.',
};
const stones = [
  { x: 0.425, y: 0.49, size: 0.102, tone: 0 },
  { x: 0.505, y: 0.445, size: 0.076, tone: 1 },
  { x: 0.548, y: 0.516, size: 0.052, tone: 2 },
  { x: 0.766, y: 0.66, size: 0.027, tone: 1 },
  { x: 0.873, y: 0.64, size: 0.023, tone: 2 },
  { x: 0.728, y: 0.72, size: 0.022, tone: 0 },
];
const mossPatches = [
  { x: 0.385, y: 0.578, size: 0.075 },
  { x: 0.548, y: 0.586, size: 0.063 },
  { x: 0.2, y: 0.76, size: 0.055 },
  { x: 0.705, y: 0.78, size: 0.035 },
];
const rakeMarks = [];
const userStones = [];
const userMoss = [];
const history = [];
let activeTool = 'rake';
let activeStroke = null;
let evening = false;
let width = 0;
let height = 0;
let pixelRatio = 1;

const palettes = {
  still: { sandTop: '#e3d8bd', sandBottom: '#cabb99', groove: 'rgba(116, 101, 74, .27)', grooveLight: 'rgba(255, 249, 229, .36)', water: '#899c91', waterDeep: '#697f74', moss: ['#627553', '#748460', '#536b4e'] },
  verdant: { sandTop: '#d6ddc4', sandBottom: '#b8c2a2', groove: 'rgba(79, 98, 70, .27)', grooveLight: 'rgba(247, 246, 220, .38)', water: '#8ca99b', waterDeep: '#658578', moss: ['#526d4c', '#708751', '#456547'] },
  clay: { sandTop: '#dfc8a8', sandBottom: '#b99b7b', groove: 'rgba(117, 77, 57, .26)', grooveLight: 'rgba(255, 239, 209, .38)', water: '#8c9890', waterDeep: '#687b75', moss: ['#6b7051', '#85865a', '#596b4b'] },
  ink: { sandTop: '#777b68', sandBottom: '#535b4e', groove: 'rgba(31, 40, 34, .32)', grooveLight: 'rgba(219, 220, 184, .24)', water: '#788d83', waterDeep: '#4f6b61', moss: ['#64764e', '#87935a', '#4d694d'] },
  evening: { sandTop: '#aaa087', sandBottom: '#817a68', groove: 'rgba(53, 53, 43, .28)', grooveLight: 'rgba(231, 220, 190, .24)', water: '#75867d', waterDeep: '#50665e', moss: ['#58684e', '#687650', '#4b6149'] },
};
let currentDesign = 'still';

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = bounds.width;
  height = bounds.height;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  drawGarden();
}

function drawGarden() {
  if (!width || !height) return;
  const palette = evening ? palettes.evening : palettes[currentDesign];
  context.clearRect(0, 0, width, height);
  const sand = context.createLinearGradient(0, 0, width * 0.7, height);
  sand.addColorStop(0, palette.sandTop);
  sand.addColorStop(1, palette.sandBottom);
  context.fillStyle = sand;
  context.fillRect(0, 0, width, height);
  drawGrain();
  drawGrooves(palette);
  rakeMarks.forEach((mark) => drawRakeMark(mark, palette));
  if (activeStroke) drawRakeMark(activeStroke, palette);
  drawPond(palette);
  [...mossPatches, ...userMoss].forEach((patch, index) => drawMoss(patch, palette, index));
  drawLantern();
  [...stones, ...userStones].forEach(drawStone);
}

function drawGrain() {
  let seed = 9327;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  context.save();
  for (let index = 0; index < Math.floor(width * height / 290); index += 1) {
    const x = random() * width;
    const y = random() * height;
    const alpha = 0.035 + random() * 0.075;
    context.fillStyle = random() > 0.55 ? `rgba(255, 248, 224, ${alpha})` : `rgba(86, 72, 48, ${alpha})`;
    context.fillRect(x, y, 1 + random() * 1.3, 1 + random() * 1.3);
  }
  context.restore();
}

function drawGrooves(palette) {
  context.save();
  for (let row = 0; row < 24; row += 1) {
    const y = height * (0.035 + row * 0.039);
    context.beginPath();
    for (let x = -12; x <= width + 12; x += 12) {
      const curve = Math.sin(x / (width * 0.16) + row * 0.39) * height * 0.009;
      const wave = Math.sin(x / (width * 0.53) + row * 0.2) * height * 0.006;
      const pointY = y + curve + wave;
      if (x === -12) context.moveTo(x, pointY);
      else context.lineTo(x, pointY);
    }
    context.strokeStyle = row % 2 ? palette.groove : palette.grooveLight;
    context.lineWidth = row % 2 ? 1 : 1.5;
    context.stroke();
  }

  const centreX = width * 0.46;
  const centreY = height * 0.51;
  for (let ring = 0; ring < 17; ring += 1) {
    const radiusX = width * (0.09 + ring * 0.012);
    const radiusY = height * (0.085 + ring * 0.016);
    context.beginPath();
    context.ellipse(centreX, centreY, radiusX, radiusY, -0.12, 0.18, Math.PI * 1.92);
    context.strokeStyle = ring % 2 ? palette.groove : palette.grooveLight;
    context.lineWidth = ring % 3 === 0 ? 1.45 : 0.9;
    context.stroke();
  }

  const secondX = width * 0.15;
  const secondY = height * 0.79;
  for (let ring = 0; ring < 9; ring += 1) {
    context.beginPath();
    context.ellipse(secondX, secondY, width * (0.035 + ring * 0.012), height * (0.026 + ring * 0.016), 0.2, 0, Math.PI * 1.95);
    context.strokeStyle = ring % 2 ? palette.groove : palette.grooveLight;
    context.lineWidth = 1;
    context.stroke();
  }
  context.restore();
}

function drawRakeMark(points, palette) {
  if (points.length < 1) return;
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  const strands = 7;
  const spacing = Math.max(3, Math.min(5, width / 230));
  for (let strand = 0; strand < strands; strand += 1) {
    const offset = (strand - (strands - 1) / 2) * spacing;
    context.beginPath();
    points.forEach((point, index) => {
      const previous = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      const dx = (next.x - previous.x) * width;
      const dy = (next.y - previous.y) * height;
      const length = Math.hypot(dx, dy) || 1;
      const x = point.x * width - (dy / length) * offset;
      const y = point.y * height + (dx / length) * offset;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.strokeStyle = strand % 2 ? palette.groove : palette.grooveLight;
    context.lineWidth = strand % 2 ? 1.35 : 1;
    context.stroke();
  }
  context.restore();
}

function drawPond(palette) {
  const x = width * 0.815;
  const y = height * 0.7;
  const radiusX = Math.min(width * 0.105, height * 0.29);
  const radiusY = Math.min(height * 0.17, width * 0.145);
  context.save();
  context.shadowColor = 'rgba(65, 71, 58, .2)';
  context.shadowBlur = 12;
  context.shadowOffsetY = 5;
  context.beginPath();
  context.ellipse(x, y, radiusX * 1.11, radiusY * 1.1, -0.28, 0, Math.PI * 2);
  context.fillStyle = 'rgba(112, 111, 87, .32)';
  context.fill();
  context.shadowColor = 'transparent';
  const water = context.createLinearGradient(x - radiusX, y - radiusY, x + radiusX, y + radiusY);
  water.addColorStop(0, palette.water);
  water.addColorStop(1, palette.waterDeep);
  context.beginPath();
  context.ellipse(x, y, radiusX, radiusY, -0.28, 0, Math.PI * 2);
  context.fillStyle = water;
  context.fill();
  context.clip();
  for (let line = 0; line < 9; line += 1) {
    const lineY = y - radiusY * 0.78 + line * radiusY * 0.19;
    context.beginPath();
    context.ellipse(x + Math.sin(line * 2.3) * radiusX * 0.12, lineY, radiusX * (0.18 + (line % 3) * 0.12), radiusY * 0.09, -0.12, 0, Math.PI * 1.6);
    context.strokeStyle = line % 2 ? 'rgba(226, 228, 207, .22)' : 'rgba(49, 76, 68, .23)';
    context.lineWidth = 1;
    context.stroke();
  }
  context.restore();
  context.save();
  context.beginPath();
  context.ellipse(x, y, radiusX * 1.13, radiusY * 1.12, -0.28, 0, Math.PI * 2);
  context.strokeStyle = 'rgba(246, 237, 210, .68)';
  context.lineWidth = 2;
  context.stroke();
  context.restore();
}

function drawMoss(patch, palette, index) {
  const x = patch.x * width;
  const y = patch.y * height;
  const radius = patch.size * width;
  const shades = palette.moss;
  context.save();
  context.shadowColor = 'rgba(49, 62, 41, .2)';
  context.shadowBlur = 5;
  context.shadowOffsetY = 2;
  for (let tuft = 0; tuft < 19; tuft += 1) {
    const angle = tuft * 2.399 + index * 0.68;
    const distance = Math.sqrt((tuft + 1) / 20) * radius * 0.72;
    const tuftX = x + Math.cos(angle) * distance;
    const tuftY = y + Math.sin(angle) * distance * 0.55;
    const tuftRadius = radius * (0.12 + ((tuft * 7) % 5) * 0.018);
    context.beginPath();
    context.ellipse(tuftX, tuftY, tuftRadius, tuftRadius * 0.58, angle, 0, Math.PI * 2);
    context.fillStyle = shades[(tuft + index) % shades.length];
    context.fill();
  }
  context.restore();
}

function drawStone(stone) {
  const x = stone.x * width;
  const y = stone.y * height;
  const stoneWidth = stone.size * width;
  const stoneHeight = stoneWidth * 0.63;
  const tones = [
    ['#9b9888', '#65695f'],
    ['#b1aa94', '#797968'],
    ['#898d83', '#585f57'],
  ];
  const [light, dark] = tones[stone.tone % tones.length];
  context.save();
  context.translate(x, y);
  context.shadowColor = 'rgba(42, 47, 39, .32)';
  context.shadowBlur = stoneWidth * 0.18;
  context.shadowOffsetX = stoneWidth * 0.035;
  context.shadowOffsetY = stoneHeight * 0.18;
  context.beginPath();
  context.moveTo(-stoneWidth * 0.51, stoneHeight * 0.37);
  context.bezierCurveTo(-stoneWidth * 0.49, stoneHeight * 0.03, -stoneWidth * 0.27, -stoneHeight * 0.36, -stoneWidth * 0.04, -stoneHeight * 0.4);
  context.bezierCurveTo(stoneWidth * 0.17, -stoneHeight * 0.51, stoneWidth * 0.5, -stoneHeight * 0.12, stoneWidth * 0.5, stoneHeight * 0.31);
  context.bezierCurveTo(stoneWidth * 0.3, stoneHeight * 0.49, -stoneWidth * 0.22, stoneHeight * 0.51, -stoneWidth * 0.51, stoneHeight * 0.37);
  const stoneGradient = context.createLinearGradient(-stoneWidth * 0.3, -stoneHeight * 0.5, stoneWidth * 0.3, stoneHeight * 0.55);
  stoneGradient.addColorStop(0, light);
  stoneGradient.addColorStop(1, dark);
  context.fillStyle = stoneGradient;
  context.fill();
  context.shadowColor = 'transparent';
  context.beginPath();
  context.moveTo(-stoneWidth * 0.28, stoneHeight * 0.05);
  context.quadraticCurveTo(-stoneWidth * 0.19, -stoneHeight * 0.25, stoneWidth * 0.04, -stoneHeight * 0.28);
  context.strokeStyle = 'rgba(239, 231, 207, .36)';
  context.lineWidth = Math.max(1, stoneWidth * 0.022);
  context.stroke();
  context.restore();
}

function drawLantern() {
  const x = width * 0.17;
  const y = height * 0.48;
  const unit = Math.min(width * 0.052, height * 0.115);
  context.save();
  context.translate(x, y);
  context.fillStyle = 'rgba(50, 55, 46, .2)';
  context.beginPath();
  context.ellipse(0, unit * 1.08, unit * 0.72, unit * 0.14, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#77796d';
  context.beginPath();
  context.moveTo(-unit * 0.53, unit * 0.87);
  context.lineTo(unit * 0.52, unit * 0.87);
  context.lineTo(unit * 0.34, unit * 0.71);
  context.lineTo(-unit * 0.32, unit * 0.71);
  context.fill();
  context.fillRect(-unit * 0.12, -unit * 0.22, unit * 0.24, unit * 0.94);
  context.fillStyle = '#8b8b7d';
  context.beginPath();
  context.moveTo(-unit * 0.52, -unit * 0.2);
  context.lineTo(-unit * 0.4, -unit * 0.54);
  context.lineTo(0, -unit * 0.7);
  context.lineTo(unit * 0.4, -unit * 0.54);
  context.lineTo(unit * 0.52, -unit * 0.2);
  context.lineTo(0, -unit * 0.11);
  context.closePath();
  context.fill();
  context.fillStyle = '#63695f';
  context.fillRect(-unit * 0.37, -unit * 0.18, unit * 0.74, unit * 0.43);
  context.fillStyle = 'rgba(228, 205, 139, .56)';
  context.fillRect(-unit * 0.2, -unit * 0.11, unit * 0.4, unit * 0.27);
  context.fillStyle = '#9a998b';
  context.beginPath();
  context.moveTo(-unit * 0.61, -unit * 0.52);
  context.lineTo(-unit * 0.5, -unit * 0.64);
  context.lineTo(0, -unit * 0.91);
  context.lineTo(unit * 0.5, -unit * 0.64);
  context.lineTo(unit * 0.61, -unit * 0.52);
  context.lineTo(unit * 0.4, -unit * 0.48);
  context.lineTo(0, -unit * 0.73);
  context.lineTo(-unit * 0.4, -unit * 0.48);
  context.closePath();
  context.fill();
  context.restore();
}

function setTool(tool) {
  activeTool = tool;
  canvas.dataset.tool = tool;
  toolButtons.forEach((button) => {
    const selected = button.dataset.tool === tool;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  toolHint.textContent = hints[tool];
  modeAnnouncer.textContent = `${tool[0].toUpperCase()}${tool.slice(1)} tool selected.`;
}

function updateHistory() {
  const count = history.length;
  changeCount.textContent = String(count);
  undoButton.disabled = count === 0;
  gardenStatus.textContent = count === 0 ? 'A fresh beginning' : `${count} ${count === 1 ? 'gesture' : 'gestures'} added`;
}

function gardenPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
    y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
  };
}

function useTool(point) {
  if (activeTool === 'stone') {
    const stone = { ...point, size: 0.05 + Math.random() * 0.026, tone: Math.floor(Math.random() * 3) };
    userStones.push(stone);
    history.push({ type: 'stone' });
  } else if (activeTool === 'moss') {
    userMoss.push({ ...point, size: 0.04 + Math.random() * 0.022 });
    history.push({ type: 'moss' });
  } else {
    const mark = [point, { x: Math.min(1, point.x + 0.09), y: point.y }];
    rakeMarks.push(mark);
    history.push({ type: 'rake' });
  }
  drawGarden();
  updateHistory();
}

canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  const point = gardenPoint(event);
  if (activeTool === 'rake') {
    activeStroke = [point];
    drawGarden();
  } else {
    useTool(point);
  }
});

canvas.addEventListener('pointermove', (event) => {
  if (!activeStroke || !canvas.hasPointerCapture(event.pointerId)) return;
  const point = gardenPoint(event);
  const previous = activeStroke[activeStroke.length - 1];
  if (Math.hypot((point.x - previous.x) * width, (point.y - previous.y) * height) > 2) {
    activeStroke.push(point);
    drawGarden();
  }
});

function finishStroke(event) {
  if (!activeStroke) return;
  if (event && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  if (activeStroke.length === 1) {
    const point = activeStroke[0];
    activeStroke.push({ x: Math.min(1, point.x + 0.07), y: point.y });
  }
  rakeMarks.push(activeStroke);
  history.push({ type: 'rake' });
  activeStroke = null;
  drawGarden();
  updateHistory();
}

canvas.addEventListener('pointerup', finishStroke);
canvas.addEventListener('pointercancel', finishStroke);
canvas.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    useTool({ x: 0.5, y: 0.52 });
  }
});

designButtons.forEach((button) => button.addEventListener('click', () => {
  currentDesign = button.dataset.designChoice;
  document.body.dataset.design = currentDesign;
  designButtons.forEach((choice) => {
    const selected = choice === button;
    choice.classList.toggle('is-active', selected);
    choice.setAttribute('aria-pressed', String(selected));
  });
  modeAnnouncer.textContent = `${button.textContent.trim()} stylesheet selected. The page content is unchanged.`;
  drawGarden();
}));
toolButtons.forEach((button) => button.addEventListener('click', () => setTool(button.dataset.tool)));
undoButton.addEventListener('click', () => {
  const lastAction = history.pop();
  if (!lastAction) return;
  if (lastAction.type === 'stone') userStones.pop();
  if (lastAction.type === 'moss') userMoss.pop();
  if (lastAction.type === 'rake') rakeMarks.pop();
  drawGarden();
  updateHistory();
});
resetButton.addEventListener('click', () => {
  history.length = 0;
  rakeMarks.length = 0;
  userStones.length = 0;
  userMoss.length = 0;
  drawGarden();
  updateHistory();
});
lightToggle.addEventListener('click', () => {
  evening = !evening;
  document.body.dataset.theme = evening ? 'evening' : 'daylight';
  lightToggle.setAttribute('aria-pressed', String(evening));
  lightLabel.textContent = evening ? 'Evening' : 'Daylight';
  drawGarden();
});

const resizeObserver = new ResizeObserver(resizeCanvas);
resizeObserver.observe(canvas);
setTool(activeTool);
updateHistory();
