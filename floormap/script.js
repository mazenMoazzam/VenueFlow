fabric.Object.prototype.objectCaching = false;
fabric.Object.prototype.strokeUniform = true;

const canvas = new fabric.Canvas('c');

const dragItem = document.getElementById('drag-item');

dragItem.addEventListener('dragstart', (e) => {
  e.dataTransfer.setData('text/plain', e.target.dataset.type);
});

const canvasContainer = canvas.wrapperEl;

canvasContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

canvasContainer.addEventListener('drop', (e) => {
  e.preventDefault();

  const shapeType = e.dataTransfer.getData('text/plain');
  if (shapeType !== 'table') return;

  const rect = canvas.upperCanvasEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const table = createRectangle(x, y);
  canvas.add(table);
  canvas.setActiveObject(table);
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

