// 导入 Konva
import Konva from 'konva';

// 获取窗口宽高
const width = window.innerWidth;
const height = window.innerHeight - 25;

// 创建 Konva 舞台和图层
const stage = new Konva.Stage({
  container: 'container',
  width: width,
  height: height,
});

const layer = new Konva.Layer();
stage.add(layer);

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
    points: [pos.x, pos.y, pos.x, pos.y],
  });
  layer.add(lastLine);
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