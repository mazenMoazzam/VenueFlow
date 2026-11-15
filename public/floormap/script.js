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
    canvas.setActiveObject(shape);
  }
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
});

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
