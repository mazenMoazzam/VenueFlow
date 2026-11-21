fabric.Object.prototype.objectCaching = false;
fabric.Object.prototype.strokeUniform = true;
fabric.Object.prototype.lockScalingFlip = true;

fabric.Object.prototype.transparentCorners = false;
fabric.Object.prototype.borderColor = '#22c55e';
fabric.Object.prototype.cornerColor = '#ffffff';
fabric.Object.prototype.cornerStrokeColor = '#22c55e';
fabric.Object.prototype.cornerStyle = 'circle';
fabric.Object.prototype.cornerSize = 8;
fabric.Object.prototype.padding = 0;

const CANVAS_BASE_WIDTH = 800;
const CANVAS_BASE_HEIGHT = 600;

const canvas = new fabric.Canvas('c', {
  width: CANVAS_BASE_WIDTH,
  height: CANVAS_BASE_HEIGHT
});
fabric.Object.prototype.controls.mtr = createRotationControl();

function resizeCanvas() {
  const wrapper = document.querySelector('.canvas-wrapper');
  if (!wrapper) return;
  const padding = 32;
  const availableWidth = wrapper.clientWidth - padding;
  if (availableWidth <= 0) return;
  const scale = Math.min(1, availableWidth / CANVAS_BASE_WIDTH);
  canvas.setDimensions({
    width: Math.round(CANVAS_BASE_WIDTH * scale),
    height: Math.round(CANVAS_BASE_HEIGHT * scale)
  });
  canvas.setZoom(scale);
  canvas.requestRenderAll();
}

const resizeObserver = new ResizeObserver(() => {
  resizeCanvas();
});
const wrapperEl = document.querySelector('.canvas-wrapper');
if (wrapperEl) {
  resizeObserver.observe(wrapperEl);
}
window.addEventListener('resize', resizeCanvas);

const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 50;
let isHistoryProcessing = false;

function saveState() {
  if (isHistoryProcessing) return;
  const json = JSON.stringify(canvas.toJSON(['name', 'sides', 'ratioLocked', 'lockUniScaling', 'points', 'pathOffset']));
  if (undoStack.length > 0 && undoStack[undoStack.length - 1] === json) {
    return;
  }
  undoStack.push(json);
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  redoStack.length = 0;
  updateHistoryButtons();
}

function undo() {
  if (undoStack.length <= 1 || isHistoryProcessing) return;
  isHistoryProcessing = true;
  const currentState = undoStack.pop();
  redoStack.push(currentState);
  const prevState = undoStack[undoStack.length - 1];
  canvas.loadFromJSON(prevState, () => {
    resizeCanvas();
    canvas.renderAll();
    isHistoryProcessing = false;
    updatePropertiesPanel();
    updateHistoryButtons();
    updateContextMenuState();
  });
}

function redo() {
  if (redoStack.length === 0 || isHistoryProcessing) return;
  isHistoryProcessing = true;
  const nextState = redoStack.pop();
  undoStack.push(nextState);
  canvas.loadFromJSON(nextState, () => {
    resizeCanvas();
    canvas.renderAll();
    isHistoryProcessing = false;
    updatePropertiesPanel();
    updateHistoryButtons();
    updateContextMenuState();
  });
}

function resetCanvas() {
  if (canvas.getObjects().length === 0) return;
  canvas.discardActiveObject();
  canvas.clear();
  canvas.setBackgroundColor('#ffffff', () => {
    canvas.renderAll();
    saveState();
    updatePropertiesPanel();
    updateContextMenuState();
    updateHistoryButtons();
  });
}

const dragItems = document.querySelectorAll('.palette-card, .palette-item');
dragItems.forEach((item) => {
  item.addEventListener('dragstart', (e) => {
    const type = item.dataset.type || item.getAttribute('data-type');
    e.dataTransfer.setData('text/plain', type);
  });
  item.addEventListener('click', () => {
    const type = item.dataset.type || item.getAttribute('data-type');
    let shape;
    if (type === 'polygon') {
      shape = createPolygon(CANVAS_BASE_WIDTH / 2, CANVAS_BASE_HEIGHT / 2, 4);
    } else if (type === 'circle') {
      shape = createCircle(CANVAS_BASE_WIDTH / 2, CANVAS_BASE_HEIGHT / 2);
    }
    if (shape) {
      canvas.add(shape);
      clampToBounds(shape);
      canvas.setActiveObject(shape);
      saveState();
    }
  });
});

const dropTarget = document.querySelector('.canvas-wrapper') || canvas.wrapperEl;

dropTarget.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

dropTarget.addEventListener('drop', (e) => {
  e.preventDefault();

  const shapeType = e.dataTransfer.getData('text/plain');
  const pointer = canvas.getPointer(e);
  const x = pointer.x;
  const y = pointer.y;

  let shape;
  switch (shapeType) {
    case 'polygon':
      shape = createPolygon(x, y, 4);
      break;
    case 'circle':
      shape = createCircle(x, y);
      break;
    default:
      console.warn(`Unknown shape type: ${shapeType}`);
      return;
  }

  if (shape) {
    canvas.add(shape);
    clampToBounds(shape);
    canvas.setActiveObject(shape);
    saveState();
  }
});

let clipboard = null;
let pasteOffset = 20;
let lastRightClickPointer = null;

function copyObject() {
  const active = canvas.getActiveObject();
  if (!active) return;
  active.clone((cloned) => {
    clipboard = cloned;
    pasteOffset = 20;
    updateContextMenuState();
  }, ['name', 'sides', 'ratioLocked', 'lockUniScaling', 'points', 'pathOffset']);
}

function pasteObject(targetX, targetY) {
  if (!clipboard) return;
  clipboard.clone((cloned) => {
    canvas.discardActiveObject();
    if (typeof targetX === 'number' && typeof targetY === 'number') {
      cloned.set({
        left: targetX,
        top: targetY
      });
    } else {
      cloned.set({
        left: cloned.left + pasteOffset,
        top: cloned.top + pasteOffset
      });
      pasteOffset += 20;
    }
    cloned.setCoords();
    if (cloned.type === 'activeSelection') {
      cloned.canvas = canvas;
      cloned.forEachObject((obj) => {
        canvas.add(obj);
        clampToBounds(obj);
      });
      cloned.setCoords();
    } else {
      canvas.add(cloned);
      clampToBounds(cloned);
    }
    canvas.setActiveObject(cloned);
    canvas.requestRenderAll();
    saveState();
    updatePropertiesPanel();
    updateContextMenuState();
  }, ['name', 'sides', 'ratioLocked', 'lockUniScaling', 'points', 'pathOffset']);
}

function deleteSelected() {
  const activeObjects = canvas.getActiveObjects();
  if (activeObjects && activeObjects.length) {
    activeObjects.forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    saveState();
    updatePropertiesPanel();
    updateContextMenuState();
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideContextMenu();
    return;
  }
  const tag = document.activeElement ? document.activeElement.tagName : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) {
    return;
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    deleteSelected();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
    e.preventDefault();
    copyObject();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
    e.preventDefault();
    pasteObject();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
    e.preventDefault();
    redo();
    return;
  }
});

canvas.on('object:moving', (e) => {
  clampToBounds(e.target);
});

canvas.on('object:scaling', (e) => {
  if (!e.transform) return;
  const target = e.target;
  const { originX, originY } = e.transform;
  const anchor = target.getPointByOrigin(originX, originY);
  const minSize = 20;
  let clamped = false;

  if (target.type === 'polygon') {
    if (target.width * target.scaleX < minSize) {
      target.scaleX = minSize / target.width;
      clamped = true;
    }
    if (target.height * target.scaleY < minSize) {
      target.scaleY = minSize / target.height;
      clamped = true;
    }
    if (['ml', 'mr', 'mt', 'mb'].includes(e.transform?.corner)) {
      target.ratioLocked = false;
      target.lockUniScaling = false;
      if (propRatioLock) propRatioLock.checked = false;
    }
  } else if (target.type === 'ellipse') {
    if (target.rx * target.scaleX < minSize / 2) {
      target.scaleX = (minSize / 2) / target.rx;
      clamped = true;
    }
    if (target.ry * target.scaleY < minSize / 2) {
      target.scaleY = (minSize / 2) / target.ry;
      clamped = true;
    }
    if (['ml', 'mr', 'mt', 'mb'].includes(e.transform?.corner)) {
      target.ratioLocked = false;
      target.lockUniScaling = false;
      if (propRatioLock) propRatioLock.checked = false;
    }
  }

  if (clamped) {
    target.setPositionByOrigin(anchor, originX, originY);
  }
  updatePropertiesPanel();
});

canvas.on('before:transform', (e) => {
  const target = e.transform?.target;
  if (target) {
    if (['ml', 'mr', 'mt', 'mb'].includes(e.transform.corner)) {
      target.ratioLocked = false;
      target.lockUniScaling = false;
      if (propRatioLock) propRatioLock.checked = false;
    } else if (target.ratioLocked !== false) {
      target.lockUniScaling = true;
    }
  }
});

canvas.on('object:modified', (e) => {
  const target = e.target;
  if (target.type === 'polygon') {
    const sides = target.sides || 4;
    const newW = Math.round(target.width * target.scaleX);
    const newH = Math.round(target.height * target.scaleY);
    const pts = getRegularPolygonPoints(sides, newW, newH);
    target.set({
      points: pts,
      width: newW,
      height: newH,
      scaleX: 1,
      scaleY: 1,
      pathOffset: { x: 0, y: 0 }
    });
  } else if (target.type === 'ellipse') {
    target.set({
      rx: Math.round(target.rx * target.scaleX),
      ry: Math.round(target.ry * target.scaleY),
      scaleX: 1,
      scaleY: 1
    });
  }
  clampToBounds(target);
  canvas.requestRenderAll();
  saveState();
  updatePropertiesPanel();
});

canvas.on('selection:created', () => {
  updatePropertiesPanel();
  updateContextMenuState();
});
canvas.on('selection:updated', () => {
  updatePropertiesPanel();
  updateContextMenuState();
});
canvas.on('selection:cleared', () => {
  updatePropertiesPanel();
  updateContextMenuState();
  updateHistoryButtons();
});

const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const btnReset = document.getElementById('btn-reset');
const ctxMenu = document.getElementById('context-menu');
const ctxUndo = document.getElementById('ctx-undo');
const ctxRedo = document.getElementById('ctx-redo');
const ctxCopy = document.getElementById('ctx-copy');
const ctxPaste = document.getElementById('ctx-paste');
const ctxDelete = document.getElementById('ctx-delete');

function hideContextMenu() {
  if (ctxMenu) ctxMenu.style.display = 'none';
}

function updateHistoryButtons() {
  const canUndo = undoStack.length > 1;
  const canRedo = redoStack.length > 0;
  const hasObjects = canvas.getObjects().length > 0;
  if (btnUndo) btnUndo.disabled = !canUndo;
  if (btnRedo) btnRedo.disabled = !canRedo;
  if (btnReset) btnReset.disabled = !hasObjects;
  if (ctxUndo) ctxUndo.disabled = !canUndo;
  if (ctxRedo) ctxRedo.disabled = !canRedo;
}

function updateContextMenuState() {
  const hasSelection = !!canvas.getActiveObject();
  const canUndo = undoStack.length > 1;
  const canRedo = redoStack.length > 0;
  if (ctxUndo) ctxUndo.disabled = !canUndo;
  if (ctxRedo) ctxRedo.disabled = !canRedo;
  if (ctxCopy) ctxCopy.disabled = !hasSelection;
  if (ctxPaste) ctxPaste.disabled = !clipboard;
  if (ctxDelete) ctxDelete.disabled = !hasSelection;
}

canvas.upperCanvasEl.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const pointer = canvas.getPointer(e);
  lastRightClickPointer = pointer;
  const target = canvas.findTarget(e);
  if (target) {
    if (canvas.getActiveObject() !== target) {
      canvas.setActiveObject(target);
      canvas.requestRenderAll();
      updatePropertiesPanel();
    }
  } else {
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    updatePropertiesPanel();
  }
  updateContextMenuState();

  const menuW = 160;
  const menuH = 120;
  const posX = (e.clientX + menuW > window.innerWidth) ? (window.innerWidth - menuW - 8) : e.clientX;
  const posY = (e.clientY + menuH > window.innerHeight) ? (window.innerHeight - menuH - 8) : e.clientY;
  ctxMenu.style.left = `${posX}px`;
  ctxMenu.style.top = `${posY}px`;
  ctxMenu.style.display = 'block';
});

document.addEventListener('pointerdown', (e) => {
  if (ctxMenu && !ctxMenu.contains(e.target)) {
    hideContextMenu();
  }
});

window.addEventListener('resize', hideContextMenu);
window.addEventListener('scroll', hideContextMenu, true);

if (btnUndo) {
  btnUndo.addEventListener('click', undo);
}

if (btnRedo) {
  btnRedo.addEventListener('click', redo);
}

if (btnReset) {
  btnReset.addEventListener('click', resetCanvas);
}

if (ctxUndo) {
  ctxUndo.addEventListener('click', () => {
    undo();
    hideContextMenu();
  });
}

if (ctxRedo) {
  ctxRedo.addEventListener('click', () => {
    redo();
    hideContextMenu();
  });
}

if (ctxCopy) {
  ctxCopy.addEventListener('click', () => {
    copyObject();
    hideContextMenu();
  });
}

if (ctxPaste) {
  ctxPaste.addEventListener('click', () => {
    pasteObject(lastRightClickPointer?.x, lastRightClickPointer?.y);
    hideContextMenu();
  });
}

if (ctxDelete) {
  ctxDelete.addEventListener('click', () => {
    deleteSelected();
    hideContextMenu();
  });
}

const noSel = document.getElementById('no-selection');
const selProp = document.getElementById('selection-properties');
const propName = document.getElementById('prop-name');
const propPreview = document.getElementById('prop-preview');
const propWidth = document.getElementById('prop-width');
const propLength = document.getElementById('prop-length');
const propSides = document.getElementById('prop-sides');
const sidesGroup = document.getElementById('prop-sides-group');
const propRatioLock = document.getElementById('prop-ratio-lock');
const ratioGroup = document.getElementById('prop-ratio-group');

function updatePreview(active) {
  if (!propPreview || !active) return;
  const maxW = 24, maxH = 16;
  if (active.type === 'polygon') {
    const w = active.width * active.scaleX;
    const h = active.height * active.scaleY;
    const scale = Math.min((maxW - 2) / w, (maxH - 2) / h);
    const pw = Math.max(6, Math.round(w * scale));
    const ph = Math.max(6, Math.round(h * scale));
    const pts = getRegularPolygonPoints(active.sides || 4, pw, ph);
    const cx = maxW / 2;
    const cy = maxH / 2;
    const svgPts = pts.map(p => `${(cx + p.x).toFixed(1)},${(cy + p.y).toFixed(1)}`).join(' ');
    propPreview.innerHTML = `<svg width="${maxW}" height="${maxH}" viewBox="0 0 ${maxW} ${maxH}" fill="none"><polygon points="${svgPts}" fill="#f8fafc" stroke="#475569" stroke-width="1.2"/></svg>`;
  } else if (active.type === 'ellipse') {
    const w = active.rx * 2 * active.scaleX;
    const h = active.ry * 2 * active.scaleY;
    const scale = Math.min((maxW - 2) / w, (maxH - 2) / h);
    const prx = Math.max(2, (w * scale - 1) / 2);
    const pry = Math.max(2, (h * scale - 1) / 2);
    propPreview.innerHTML = `<svg width="${maxW}" height="${maxH}" viewBox="0 0 ${maxW} ${maxH}" fill="none"><ellipse cx="${maxW / 2}" cy="${maxH / 2}" rx="${prx}" ry="${pry}" fill="#f8fafc" stroke="#475569" stroke-width="1.2"/></svg>`;
  }
}

function setShapeDimension(active, isWidth, val) {
  if (active.type === 'polygon') {
    if (active.ratioLocked !== false) {
      const currentW = active.width * active.scaleX;
      const currentH = active.height * active.scaleY;
      const ratio = currentW > 0 ? (currentH / currentW) : 1;
      let wVal = isWidth ? val : (ratio > 0 ? val / ratio : val);
      let hVal = isWidth ? val * ratio : val;
      if (wVal > CANVAS_BASE_WIDTH) {
        wVal = CANVAS_BASE_WIDTH;
        hVal = wVal * ratio;
      }
      if (hVal > CANVAS_BASE_HEIGHT) {
        hVal = CANVAS_BASE_HEIGHT;
        wVal = ratio > 0 ? hVal / ratio : hVal;
      }
      wVal = Math.max(20, Math.round(wVal));
      hVal = Math.max(20, Math.round(hVal));
      const pts = getRegularPolygonPoints(active.sides || 4, wVal, hVal);
      active.set({
        points: pts,
        width: wVal,
        height: hVal,
        scaleX: 1,
        scaleY: 1,
        pathOffset: { x: 0, y: 0 }
      });
      if (document.activeElement !== propWidth) propWidth.value = wVal;
      if (document.activeElement !== propLength) propLength.value = hVal;
    } else {
      const wVal = isWidth ? val : Math.round(active.width * active.scaleX);
      const hVal = isWidth ? Math.round(active.height * active.scaleY) : val;
      const pts = getRegularPolygonPoints(active.sides || 4, wVal, hVal);
      active.set({
        points: pts,
        width: wVal,
        height: hVal,
        scaleX: 1,
        scaleY: 1,
        pathOffset: { x: 0, y: 0 }
      });
    }
  } else if (active.type === 'ellipse') {
    if (active.ratioLocked !== false) {
      const currentW = active.rx * 2 * active.scaleX;
      const currentH = active.ry * 2 * active.scaleY;
      const ratio = currentW > 0 ? (currentH / currentW) : 1;
      let wVal = isWidth ? val : (ratio > 0 ? val / ratio : val);
      let hVal = isWidth ? val * ratio : val;
      if (wVal > CANVAS_BASE_WIDTH) {
        wVal = CANVAS_BASE_WIDTH;
        hVal = wVal * ratio;
      }
      if (hVal > CANVAS_BASE_HEIGHT) {
        hVal = CANVAS_BASE_HEIGHT;
        wVal = ratio > 0 ? hVal / ratio : hVal;
      }
      wVal = Math.max(20, Math.round(wVal));
      hVal = Math.max(20, Math.round(hVal));
      active.set({
        rx: wVal / 2,
        ry: hVal / 2,
        scaleX: 1,
        scaleY: 1
      });
      if (document.activeElement !== propWidth) propWidth.value = wVal;
      if (document.activeElement !== propLength) propLength.value = hVal;
    } else {
      active.set(isWidth ? 'rx' : 'ry', val / 2);
      active.set(isWidth ? 'scaleX' : 'scaleY', 1);
    }
  }
  active.setCoords();
  clampToBounds(active);
  canvas.requestRenderAll();
  updatePreview(active);
}

function setPolygonSides(active, val) {
  if (active.type !== 'polygon') return;
  active.sides = val;
  const w = Math.round(active.width * active.scaleX);
  const h = Math.round(active.height * active.scaleY);
  const pts = getRegularPolygonPoints(val, w, h);
  active.set({
    points: pts,
    width: w,
    height: h,
    scaleX: 1,
    scaleY: 1,
    pathOffset: { x: 0, y: 0 }
  });
  active.setCoords();
  clampToBounds(active);
  canvas.requestRenderAll();
  updatePreview(active);
}

function bindNumericInput(input, getBounds, onApply) {
  if (!input) return;
  function handle(finalize) {
    const active = canvas.getActiveObject();
    if (!active) return;
    const { min, max } = getBounds(active);
    let val = parseFloat(input.value);
    if (isNaN(val)) {
      if (finalize) {
        input.value = min;
        onApply(active, min);
      }
      return;
    }
    if (val > max) {
      val = max;
      input.value = max;
    }
    if (finalize && val < min) {
      val = min;
      input.value = min;
    }
    if (val >= min) onApply(active, val);
  }
  input.addEventListener('input', () => handle(false));
  input.addEventListener('change', () => {
    handle(true);
    saveState();
  });
}

bindNumericInput(propWidth, () => ({ min: 20, max: CANVAS_BASE_WIDTH }), (active, val) => setShapeDimension(active, true, val));
bindNumericInput(propLength, () => ({ min: 20, max: CANVAS_BASE_HEIGHT }), (active, val) => setShapeDimension(active, false, val));
bindNumericInput(
  propSides,
  () => ({ min: 3, max: 20 }),
  (active, val) => setPolygonSides(active, Math.round(val))
);

if (propName) {
  propName.addEventListener('input', () => {
    const active = canvas.getActiveObject();
    if (!active) return;
    active.name = propName.value;
  });

  propName.addEventListener('change', () => {
    const active = canvas.getActiveObject();
    if (!active) return;
    const trimmed = propName.value.trim();
    const fallback = active.type === 'polygon' ? 'Polygon' : 'Circle';
    active.name = trimmed || fallback;
    propName.value = active.name;
    saveState();
  });

  propName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      propName.blur();
    }
  });
}

if (propRatioLock) {
  propRatioLock.addEventListener('change', () => {
    const active = canvas.getActiveObject();
    if (!active) return;
    active.ratioLocked = propRatioLock.checked;
    active.lockUniScaling = propRatioLock.checked;
    saveState();
  });
}

function updatePropertiesPanel() {
  const active = canvas.getActiveObject();
  if (!noSel || !selProp) return;

  const isSingle = active && active.type !== 'activeSelection';
  noSel.style.display = isSingle ? 'none' : 'block';
  selProp.style.display = isSingle ? 'flex' : 'none';
  if (!isSingle) return;

  const isPolygon = active.type === 'polygon';
  const isCircle = active.type === 'ellipse';

  if (document.activeElement !== propName) {
    propName.value = active.name || (isPolygon ? 'Polygon' : 'Circle');
  }

  const w = Math.round((isCircle ? active.rx * 2 : active.width) * active.scaleX);
  const h = Math.round((isCircle ? active.ry * 2 : active.height) * active.scaleY);
  if (document.activeElement !== propWidth) propWidth.value = w;
  if (document.activeElement !== propLength) propLength.value = h;

  if (sidesGroup) sidesGroup.style.display = isPolygon ? 'flex' : 'none';
  if (ratioGroup) ratioGroup.style.display = 'flex';

  if (isPolygon && propSides) {
    if (active.sides === undefined) active.sides = 4;
    if (document.activeElement !== propSides) {
      propSides.value = active.sides;
    }
  }

  if (propRatioLock) {
    if (active.ratioLocked === undefined) {
      active.ratioLocked = true;
      active.lockUniScaling = true;
    }
    propRatioLock.checked = active.ratioLocked !== false;
  }

  updatePreview(active);
}

function getRegularPolygonPoints(sides, width, height) {
  const points = [];
  const angleStep = (2 * Math.PI) / sides;
  const startAngle = (sides % 2 === 0) ? (-Math.PI / 2 + Math.PI / sides) : (-Math.PI / 2);
  const raw = [];
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (let i = 0; i < sides; i++) {
    const angle = startAngle + i * angleStep;
    const u = Math.cos(angle);
    const v = Math.sin(angle);
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
    raw.push({ u, v });
  }
  const spanU = maxU - minU || 1;
  const spanV = maxV - minV || 1;
  const midU = (maxU + minU) / 2;
  const midV = (maxV + minV) / 2;
  for (let i = 0; i < sides; i++) {
    points.push({
      x: ((raw[i].u - midU) / spanU) * width,
      y: ((raw[i].v - midV) / spanV) * height
    });
  }
  return points;
}

function createPolygon(x, y, sides = 4) {
  const w = 70;
  const h = 70;
  const pts = getRegularPolygonPoints(sides, w, h);
  return new fabric.Polygon(pts, {
    left: x,
    top: y,
    width: w,
    height: h,
    fill: '#ffffff',
    stroke: '#24222d',
    strokeWidth: 1.5,
    originX: 'center',
    originY: 'center',
    objectCaching: false,
    ratioLocked: true,
    lockUniScaling: true,
    name: 'Polygon',
    sides: sides,
    pathOffset: { x: 0, y: 0 }
  });
}

function createCircle(x, y) {
  return new fabric.Ellipse({
    left: x,
    top: y,
    rx: 30,
    ry: 30,
    fill: '#ffffff',
    stroke: '#24222d',
    strokeWidth: 1.5,
    originX: 'center',
    originY: 'center',
    objectCaching: false,
    name: 'Circle',
    ratioLocked: true,
    lockUniScaling: true
  });
}

function createRotationControl() {
  return new fabric.Control({
    x: 0,
    y: -0.5,
    offsetX: 0,
    offsetY: -30,
    actionHandler: fabric.controlsUtils.rotationWithSnapping,
    cursorStyleHandler: fabric.controlsUtils.rotationStyleHandler,
    withConnection: false,
    actionName: 'rotate',
    positionHandler: function(dim, finalMatrix, fabricObject) {
      if (!canvas._currentTransform || canvas._currentTransform.action !== 'rotate') {
        const candidates = [
          { x: 0, y: -0.5, offsetX: 0, offsetY: -30 },
          { x: 0, y: 0.5, offsetX: 0, offsetY: 30 },
          { x: 0.5, y: 0, offsetX: 30, offsetY: 0 },
          { x: -0.5, y: 0, offsetX: -30, offsetY: 0 }
        ];
        const pad = 12;
        let bestCandidate = candidates[0];
        let bestDist = -Infinity;
        for (let i = 0; i < candidates.length; i++) {
          const c = candidates[i];
          const pt = fabric.util.transformPoint({
            x: c.x * dim.x + c.offsetX,
            y: c.y * dim.y + c.offsetY
          }, finalMatrix);
          const dist = Math.min(
            pt.x - pad,
            CANVAS_BASE_WIDTH - pad - pt.x,
            pt.y - pad,
            CANVAS_BASE_HEIGHT - pad - pt.y
          );
          if (dist >= 0) {
            bestCandidate = c;
            break;
          }
          if (dist > bestDist) {
            bestDist = dist;
            bestCandidate = c;
          }
        }
        this.x = bestCandidate.x;
        this.y = bestCandidate.y;
        this.offsetX = bestCandidate.offsetX;
        this.offsetY = bestCandidate.offsetY;
      }
      this.edge = fabric.util.transformPoint({
        x: this.x * dim.x,
        y: this.y * dim.y
      }, finalMatrix);
      return fabric.util.transformPoint({
        x: this.x * dim.x + this.offsetX,
        y: this.y * dim.y + this.offsetY
      }, finalMatrix);
    },
    render: function(ctx, left, top, styleOverride, fabricObject) {
      styleOverride = styleOverride || {};
      const edge = this.edge || fabricObject.getPointByOrigin(
        this.x === 0 ? 'center' : (this.x > 0 ? 'right' : 'left'),
        this.y === 0 ? 'center' : (this.y > 0 ? 'bottom' : 'top')
      );

      ctx.save();
      ctx.strokeStyle = styleOverride.borderColor || fabricObject.borderColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(edge.x, edge.y);
      ctx.lineTo(left, top);
      ctx.stroke();
      ctx.restore();

      fabric.controlsUtils.renderCircleControl.call(this, ctx, left, top, styleOverride, fabricObject);
    }
  });
}

function getShapeBounds(target) {
  const strokeOffset = (target.stroke && target.strokeWidth) ? target.strokeWidth / 2 : 0;

  if (target.type === 'ellipse') {
    const center = target.getCenterPoint();
    const rad = fabric.util.degreesToRadians(target.angle || 0);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const a = target.rx * target.scaleX + strokeOffset;
    const b = target.ry * target.scaleY + strokeOffset;
    const ax = Math.sqrt((a * cos) ** 2 + (b * sin) ** 2);
    const ay = Math.sqrt((a * sin) ** 2 + (b * cos) ** 2);
    return {
      left: center.x - ax,
      top: center.y - ay,
      width: ax * 2,
      height: ay * 2
    };
  }

  if (target.type === 'polygon' && target.points && target.points.length > 0) {
    const matrix = target.calcTransformMatrix();
    const pathOffsetX = target.pathOffset ? target.pathOffset.x : 0;
    const pathOffsetY = target.pathOffset ? target.pathOffset.y : 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < target.points.length; i++) {
      const p = target.points[i];
      const lx = p.x - pathOffsetX;
      const ly = p.y - pathOffsetY;
      const px = matrix[0] * lx + matrix[2] * ly + matrix[4];
      const py = matrix[1] * lx + matrix[3] * ly + matrix[5];
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }

    return {
      left: minX - strokeOffset,
      top: minY - strokeOffset,
      width: (maxX - minX) + strokeOffset * 2,
      height: (maxY - minY) + strokeOffset * 2
    };
  }

  target.setCoords();
  return target.getBoundingRect(true);
}

function clampToBounds(target) {
  const bound = getShapeBounds(target);

  if (bound.width <= CANVAS_BASE_WIDTH) {
    if (bound.left < 0) {
      target.left += -bound.left;
    } else if (bound.left + bound.width > CANVAS_BASE_WIDTH) {
      target.left -= (bound.left + bound.width - CANVAS_BASE_WIDTH);
    }
  }

  if (bound.height <= CANVAS_BASE_HEIGHT) {
    if (bound.top < 0) {
      target.top += -bound.top;
    } else if (bound.top + bound.height > CANVAS_BASE_HEIGHT) {
      target.top -= (bound.top + bound.height - CANVAS_BASE_HEIGHT);
    }
  }

  target.setCoords();
}

resizeCanvas();
saveState();
updateHistoryButtons();