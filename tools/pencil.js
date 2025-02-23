import Konva from 'konva';
import { getStroke } from 'perfect-freehand';
import { updateDebugInfo } from '../debug';

let DEBUG_INFO = console.log;

export default class PencilTool {
    constructor(table){
        DEBUG_INFO("Init PencilTool");
        DEBUG_INFO("Device Pixel Ratio:", window.devicePixelRatio);
        this.table = table;
        this.initHitDebug();

        this.isdrawing = false;
        this.currentPoints = [];
        this.currentPressures = [];
        this.lastCommittedPoint = null;

        // 更新设备像素比信息
        updateDebugInfo('pixelRatio', {
            devicePixelRatio: window.devicePixelRatio,
            actualPixelRatio: 0
        });
    }

    activate(){
        DEBUG_INFO("PencilTool activate");
    }

    deactivate(){
        DEBUG_INFO("PencilTool deactivate");
    }

    getSvgPathFromStroke(points) {
        if (!points.length) {
            return "";
        }
        
        const max = points.length - 1;
        
        const med = (A, B) => [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
        
        return points
            .reduce(
                (acc, point, i, arr) => {
                    if (i === max) {
                        acc.push(point, med(point, arr[0]), "L", arr[0], "Z");
                    } else {
                        acc.push(point, med(point, arr[i + 1]));
                    }
                    return acc;
                },
                ["M", points[0], "Q"],
            )
            .join(" ");
    }

    drawStroke() {
        if (this.currentPoints.length < 2) return;

        const options = {
            size: this.table.pixel * 2,
            thinning: 0.6,
            smoothing: 0.5,
            streamline: 0.5,
            easing: (t) => Math.sin((t * Math.PI) / 2),
            simulatePressure: true,
            last: !!this.lastCommittedPoint,
        };

        const stroke = getStroke(this.currentPoints, options);
        const pathData = this.getSvgPathFromStroke(stroke);

        // Remove previous path if exists
        if (this.currentPath) {
            this.currentPath.destroy();
        }

        // Create new path
        this.currentPath = new Konva.Path({
            data: pathData,
            fill: 'black',
            listening: false,
            draggable: false,
        });

        this.stylusgroup.add(this.currentPath);
        this.table.gLayer.batchDraw();
    }

    pointerdown(e) {
        DEBUG_INFO("PencilTool pointerdown");
        this.isdrawing = true;
        
        this.currentPoints = [[this.table.currentPointer.x, this.table.currentPointer.y]];
        this.stylusgroup = new Konva.Group();
        this.table.gLayer.add(this.stylusgroup);
        
        this.drawStroke();
        
        this.table.updateCurrentPointer();
        this.updateHit();
        
        DEBUG_INFO("Start drawing");
    }

    pointerup(e) {
        DEBUG_INFO("finish drawing");
        this.lastCommittedPoint = [...this.currentPoints[this.currentPoints.length - 1]];
        this.drawStroke(); // Final stroke with lastCommittedPoint
        
        const actualPixelRatio = Math.max(3, window.devicePixelRatio || 2);
        
        // 更新像素比信息
        updateDebugInfo('pixelRatio', {
            devicePixelRatio: window.devicePixelRatio,
            actualPixelRatio
        });
        
        // 使用更高的缓存比例来提高清晰度
        this.stylusgroup.cache({
            pixelRatio: actualPixelRatio,
            imageSmoothingEnabled: false,
            clearBeforeDraw: true,
        });
        
        this.isdrawing = false;
        this.currentPoints = [];
    }

    pointermove(e) {
        if (this.isdrawing) {
            const point = [this.table.currentPointer.x, this.table.currentPointer.y];
            this.currentPoints.push(point);
            this.drawStroke();
        }
        
        this.table.updateCurrentPointer();
        this.updateHit();
        
        // 更新鼠标位置信息
        updateDebugInfo('mousePosition', {
            x: this.table.currentPointer.x,
            y: this.table.currentPointer.y
        });
    }

    wheel(e){
        DEBUG_INFO("PencilTool wheel");
        this.table.updateZoom(e);
    }

    updateHit(){
        this.hit.setAttrs({
            x: this.table.currentPointer.x,
            y: this.table.currentPointer.y
        })
        this.table.gLayer.batchDraw();
    }

    initHitDebug(){
        // debug shape
        this.hit = new Konva.Rect({
            width: 10,
            height: 10,
            fill:"red",
            offsetX: 5,
            offsetY: 5,
            listening: false,
            draggable: false,
        })

        this.table.gLayer.add(this.hit);
    }
}
