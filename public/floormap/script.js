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

const canvas = new fabric.Canvas('c');
fabric.Object.prototype.controls.mtr = createRotationControl();

const dragItems = document.querySelectorAll('.palette-card, .palette-item');
dragItems.forEach((item) => {
  item.addEventListener('dragstart', (e) => {
    const type = item.dataset.type || item.getAttribute('data-type');
    e.dataTransfer.setData('text/plain', type);
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

  const rect = canvas.upperCanvasEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  let shape;
  switch (shapeType) {
    case 'rectangle':
      shape = createRectangle(x, y);
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
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key !== 'Delete' && e.key !== 'Backspace') return;
  const tag = document.activeElement ? document.activeElement.tagName : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) {
    return;
  }
  const activeObjects = canvas.getActiveObjects();
  if (activeObjects && activeObjects.length) {
    e.preventDefault();
    activeObjects.forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
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

  if (target.type === 'rect') {
    if (target.width * target.scaleX < minSize) {
      target.scaleX = minSize / target.width;
      clamped = true;
    }
    if (target.height * target.scaleY < minSize) {
      target.scaleY = minSize / target.height;
      clamped = true;
    }
    target.rx = 4 / target.scaleX;
    target.ry = 4 / target.scaleY;
  } else if (target.type === 'ellipse') {
    if (target.rx * target.scaleX < minSize / 2) {
      target.scaleX = (minSize / 2) / target.rx;
      clamped = true;
    }
    if (target.ry * target.scaleY < minSize / 2) {
      target.scaleY = (minSize / 2) / target.ry;
      clamped = true;
    }
  }

  if (clamped) {
    target.setPositionByOrigin(anchor, originX, originY);
  }
  updatePropertiesPanel();
});

canvas.on('object:modified', (e) => {
  const target = e.target;
  if (target.type === 'rect') {
    target.set({
      width: Math.round(target.width * target.scaleX),
      height: Math.round(target.height * target.scaleY),
      scaleX: 1,
      scaleY: 1,
      rx: 4,
      ry: 4
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
  updatePropertiesPanel();
});

canvas.on('selection:created', updatePropertiesPanel);
canvas.on('selection:updated', updatePropertiesPanel);
canvas.on('selection:cleared', updatePropertiesPanel);

const noSel = document.getElementById('no-selection');
const selProp = document.getElementById('selection-properties');
const propName = document.getElementById('prop-name');
const propPreview = document.getElementById('prop-preview');
const propWidth = document.getElementById('prop-width');
const propLength = document.getElementById('prop-length');
const propRadius = document.getElementById('prop-radius');
const radiusGroup = document.getElementById('prop-radius-group');

function setShapeDimension(active, isWidth, val) {
  if (active.type === 'rect') {
    active.set(isWidth ? 'width' : 'height', val);
    active.set(isWidth ? 'scaleX' : 'scaleY', 1);
  } else if (active.type === 'ellipse') {
    active.set(isWidth ? 'rx' : 'ry', val / 2);
    active.set(isWidth ? 'scaleX' : 'scaleY', 1);
  }
  active.setCoords();
  clampToBounds(active);
  canvas.requestRenderAll();
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
  input.addEventListener('change', () => handle(true));
}

bindNumericInput(propWidth, () => ({ min: 20, max: canvas.width }), (active, val) => setShapeDimension(active, true, val));
bindNumericInput(propLength, () => ({ min: 20, max: canvas.height }), (active, val) => setShapeDimension(active, false, val));
bindNumericInput(
  propRadius,
  (active) => ({
    min: 0,
    max: Math.floor(Math.min(active.width * active.scaleX, active.height * active.scaleY) / 2)
  }),
  (active, val) => {
    active.set({ rx: val / active.scaleX, ry: val / active.scaleY });
    canvas.requestRenderAll();
  }
);

function updatePropertiesPanel() {
  const active = canvas.getActiveObject();
  if (!noSel || !selProp) return;

  const isSingle = active && active.type !== 'activeSelection';
  noSel.style.display = isSingle ? 'none' : 'block';
  selProp.style.display = isSingle ? 'flex' : 'none';
  if (!isSingle) return;

  const isRect = active.type === 'rect';
  propName.value = isRect ? 'Rectangle' : 'Circle';
  propPreview.innerHTML = isRect
    ? '<svg width="18" height="13" viewBox="0 0 18 13" fill="none"><rect x="1" y="1" width="16" height="11" rx="2" fill="#f8fafc" stroke="#475569" stroke-width="1.2"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" fill="#f8fafc" stroke="#475569" stroke-width="1.2"/></svg>';

  const w = Math.round((isRect ? active.width : active.rx * 2) * active.scaleX);
  const h = Math.round((isRect ? active.height : active.ry * 2) * active.scaleY);
  if (document.activeElement !== propWidth) propWidth.value = w;
  if (document.activeElement !== propLength) propLength.value = h;

  if (radiusGroup) radiusGroup.style.display = isRect ? 'flex' : 'none';
  if (isRect && propRadius) {
    propRadius.max = Math.floor(Math.min(w, h) / 2);
    if (document.activeElement !== propRadius) {
      propRadius.value = Math.round((active.rx || 0) * active.scaleX);
    }
  }
}

function createRectangle(x, y) {
  return new fabric.Rect({
    left: x,
    top: y,
    width: 80,
    height: 50,
    fill: '#ffffff',
    stroke: '#24222d',
    strokeWidth: 1.5,
    rx: 4,
    ry: 4,
    originX: 'center',
    originY: 'center',
    objectCaching: false
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
    objectCaching: false
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
            canvas.width - pad - pt.x,
            pt.y - pad,
            canvas.height - pad - pt.y
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
      return fabric.util.transformPoint({
        x: this.x * dim.x + this.offsetX,
        y: this.y * dim.y + this.offsetY
      }, finalMatrix);
    },
    render: function(ctx, left, top, styleOverride, fabricObject) {
      styleOverride = styleOverride || {};
      const dim = fabricObject._calculateCurrentDimensions();
      const matrix = fabricObject.calcTransformMatrix();
      const edge = fabric.util.transformPoint({
        x: this.x * dim.x,
        y: this.y * dim.y
      }, matrix);

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
  const center = target.getCenterPoint();
  const rad = fabric.util.degreesToRadians(target.angle || 0);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const strokeOffset = (target.stroke && target.strokeWidth) ? target.strokeWidth / 2 : 0;

  if (target.type === 'ellipse') {
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

  if (target.type === 'rect') {
    const w = target.width * target.scaleX;
    const h = target.height * target.scaleY;
    const r = Math.min((target.rx || 0) * target.scaleX, w / 2, h / 2);
    const w_inner = Math.max(0, w - 2 * r);
    const h_inner = Math.max(0, h - 2 * r);
    const ax = (w_inner / 2) * Math.abs(cos) + (h_inner / 2) * Math.abs(sin) + r + strokeOffset;
    const ay = (w_inner / 2) * Math.abs(sin) + (h_inner / 2) * Math.abs(cos) + r + strokeOffset;
    return {
      left: center.x - ax,
      top: center.y - ay,
      width: ax * 2,
      height: ay * 2
    };
  }

  target.setCoords();
  return target.getBoundingRect(true);
}

function clampToBounds(target) {
  const bound = getShapeBounds(target);

  if (bound.width <= canvas.width) {
    if (bound.left < 0) {
      target.left += -bound.left;
    } else if (bound.left + bound.width > canvas.width) {
      target.left -= (bound.left + bound.width - canvas.width);
    }
  }

  if (bound.height <= canvas.height) {
    if (bound.top < 0) {
      target.top += -bound.top;
    } else if (bound.top + bound.height > canvas.height) {
      target.top -= (bound.top + bound.height - canvas.height);
    }
  }

  target.setCoords();
}