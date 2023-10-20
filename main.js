import Konva from 'konva';

class DrawingApp {
    constructor(containerId, toolSelectorId, paperWidth, paperHeight) {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.paperWidth = paperWidth || 300;
        this.paperHeight = paperHeight || 400;
        this.toolSelectorId = toolSelectorId;


        // Setup the stage
        this.stage = new Konva.Stage({
            container: containerId,
            width: this.width,
            height: this.height,
        });

        // Setup the layers
        this.layer = new Konva.Layer();
        this.stage.add(this.layer);

        // Draw table and paper
        this.drawTable();
        this.drawPaper();

        this.isPainting = false;
        this.lastLine = null;
        this.mode = 'brush';  // or 'eraser'

        // Event listeners for drawing
        this.stage.on('mousedown touchstart', (e) => this.startPainting(e));
        this.stage.on('mouseup touchend', () => this.stopPainting());
        this.stage.on('mousemove touchmove', (e) => this.paint(e));
        this.stage.on('wheel', (e) => this.handleWheel(e));

        // Event listener for tool change
        document.getElementById(toolSelectorId).addEventListener('change', (e) => {
            this.mode = e.target.value;
        });
    }

    drawTable() {
        const table = new Konva.Rect({
            width: this.width,
            height: this.height,
            fill: '#ddd',
        });
        this.layer.add(table);
        this.layer.draw();
    }

    drawPaper() {
        this.paper = new Konva.Rect({
            x: (this.width - this.paperWidth) / 2,
            y: (this.height - this.paperHeight) / 2,
            width: this.paperWidth,
            height: this.paperHeight,
            fill: '#fff',
        });
        this.layer.add(this.paper);
        this.layer.draw();
    }

    startPainting(e) {
        this.isPainting = true;
        const pos = this.stage.getPointerPosition();
        
        if(pos.x > this.paper.x() && pos.x < this.paper.x() + this.paperWidth &&
           pos.y > this.paper.y() && pos.y < this.paper.y() + this.paperHeight) {
            this.lastLine = new Konva.Line({
                stroke: '#df4b26',
                strokeWidth: 5,
                globalCompositeOperation: this.mode === 'brush' ? 'source-over' : 'destination-out',
                lineCap: 'round',
                lineJoin: 'round',
                points: [pos.x, pos.y],
            });
            this.layer.add(this.lastLine);
        } else {
            this.isPainting = false;
        }
    }

    stopPainting() {
        this.isPainting = false;
    }

    paint(e) {
        if (!this.isPainting) {
            return;
        }
        const pos = this.stage.getPointerPosition();
        if(pos.x > this.paper.x() && pos.x < this.paper.x() + this.paperWidth &&
           pos.y > this.paper.y() && pos.y < this.paper.y() + this.paperHeight) {
            const newPoints = this.lastLine.points().concat([pos.x, pos.y]);
            this.lastLine.points(newPoints);
            this.layer.batchDraw();
        } else {
            this.stopPainting();
        }
    }

    handleWheel(e) {
        e.evt.preventDefault();
        const oldScale = this.stage.scaleX();
        const pointer = this.stage.getPointerPosition();
        const mousePointTo = {
            x: (pointer.x - this.stage.x()) / oldScale, 
            y: (pointer.y - this.stage.y()) / oldScale,
        };
        const newScale = e.evt.deltaY > 0 ? oldScale * 0.9 : oldScale * 1.1;
        this.stage.scale({ x: newScale, y: newScale });
        const newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        };
        this.stage.position(newPos);
        this.stage.batchDraw();
    }
}

// Usage:
const myDrawingApp = new DrawingApp('konva-container', 'tool', 300, 400);

