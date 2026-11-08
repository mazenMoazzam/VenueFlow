fabric.Object.prototype.objectCaching = false;
fabric.Object.prototype.strokeUniform = true;

const canvas = new fabric.Canvas('c');

// Set up dragstart on all palette items
const dragItems = document.querySelectorAll('.palette-item');
dragItems.forEach((item) => {
  item.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', e.target.dataset.type);
  });
});

const canvasContainer = canvas.wrapperEl;

canvasContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

canvasContainer.addEventListener('drop', (e) => {
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
    width: 50,
    height: 50,
    fill: 'white',
    stroke: 'black',
    strokeWidth: 1,
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
    radius: 25,
    fill: 'white',
    stroke: 'black',
    strokeWidth: 1,
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