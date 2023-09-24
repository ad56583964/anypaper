// 导入 Konva
import Konva from 'konva';

// 获取窗口宽高
const width = window.innerWidth;
const height = window.innerHeight - 25;

// 创建 Konva 舞台
const stage = new Konva.Stage({
  container: 'konva-container',
  width: width,
  height: height,
});


// layer1 init
// 创建 Konva 图层
const layer1 = new Konva.Layer();

function init_layer(){
  
  stage.add(layer1);
}

init_layer();

let isPaint = false;
let mode = 'brush';
let lastLine;

stage.on('mousedown touchstart', (e) => {
  isPaint = true;
  const pos = stage.getPointerPosition();
  lastLine = new Konva.Line({
    stroke: '#df4b26',
    strokeWidth: 5,
    globalCompositeOperation:
      mode === 'brush' ? 'source-over' : 'destination-out',
    lineCap: 'round',
    lineJoin: 'round',
    // tension: 0.8,
    // bezier: true,
    points: [pos.x, pos.y, pos.x, pos.y],
  });
  layer1.add(lastLine);
});

stage.on('mouseup touchend', () => {
  isPaint = false;
});

stage.on('mousemove touchmove', (e) => {
  if (!isPaint) {
    return;
  }

  e.evt.preventDefault();
  const pos = stage.getPointerPosition();
  const newPoints = lastLine.points().concat([pos.x, pos.y]);
  lastLine.points(newPoints);
});

const select = document.getElementById('tool');
select.addEventListener('change', () => {
  mode = select.value;
});