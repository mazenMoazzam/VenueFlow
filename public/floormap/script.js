fabric.Object.prototype.objectCaching = false;
fabric.Object.prototype.strokeUniform = true;

fabric.Object.prototype.transparentCorners = false;
fabric.Object.prototype.borderColor = '#22c55e';
fabric.Object.prototype.cornerColor = '#ffffff';
fabric.Object.prototype.cornerStrokeColor = '#22c55e';
fabric.Object.prototype.cornerStyle = 'circle';
fabric.Object.prototype.cornerSize = 8;
fabric.Object.prototype.padding = 10;

const canvas = new fabric.Canvas('c');

// Set up dragstart on all palette items
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

function createRectangle(x, y) {
  const rect = new fabric.Rect({
    width: 80,
    height: 50,
    fill: '#ffffff',
    stroke: '#24222d',
    strokeWidth: 1.5,
    rx: 4,
    ry: 4,
    originX: 'center',
    originY: 'center'
  });

  return new fabric.Group([rect], {
    left: x,
    top: y,
    originX: 'center',
    originY: 'center',
    objectCaching: false
  });
}

function createCircle(x, y) {
  const circle = new fabric.Circle({
    radius: 30,
    fill: '#ffffff',
    stroke: '#24222d',
    strokeWidth: 1.5,
    originX: 'center',
    originY: 'center'
  });

  return new fabric.Group([circle], {
    left: x,
    top: y,
    originX: 'center',
    originY: 'center',
    objectCaching: false
  });
}
