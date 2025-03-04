import Konva from '../src/konva';
import { getStroke } from 'perfect-freehand';
import { updateDebugInfo } from '../debug';

export default class PencilTool {
    constructor(table){
        this.table = table;
        this.initHitDebug();

        this.isdrawing = false;
        this.currentPoints = [];
        this.currentPressures = [];
        this.lastCommittedPoint = null;
        
        // 添加触摸状态跟踪
        this.touchState = {
            isMultiTouch: false
        };

        // 初始化调试信息
        updateDebugInfo('pixelRatio', {
            devicePixelRatio: window.devicePixelRatio,
            actualPixelRatio: 0
        });
    }

    activate(){
        console.log("PencilTool activate");
    }

    deactivate(){
        console.log("PencilTool deactivate");
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

        // Check if stylusgroup exists before adding to it
        if (!this.stylusgroup) {
            this.stylusgroup = new Konva.Group();
            this.table.gLayer.add(this.stylusgroup);
        }
        
        this.stylusgroup.add(this.currentPath);
        this.table.gLayer.batchDraw();
    }

    // 处理触摸事件
    touchstart(e) {
        if (e.touches.length === 2) {
            // 双指触摸开始
            this.touchState.isMultiTouch = true;
            
            // 如果正在绘画，保存当前状态并停止绘画
            if (this.isdrawing) {
                this.pauseDrawing();
            }
        } else if (e.touches.length === 1 && !this.touchState.isMultiTouch) {
            // 单指触摸且不是从双指切换来的，开始绘画
            this.pointerdown(e.touches[0]);
        }
    }

    touchmove(e) {
        if (e.touches.length === 2) {
            // 双指移动，交给 Table 处理缩放
            return;
        } else if (e.touches.length === 1 && !this.touchState.isMultiTouch) {
            // 单指移动且不是从双指切换来的，继续绘画
            this.pointermove(e.touches[0]);
        }
    }

    touchend(e) {
        if (e.touches.length === 0) {
            // 所有手指离开
            if (this.touchState.isMultiTouch) {
                // 如果是从双指状态结束，重置状态
                this.touchState.isMultiTouch = false;
            } else if (this.isdrawing) {
                // 如果是从绘画状态结束，完成绘画
                this.pointerup(e);
            }
        } else if (e.touches.length === 1) {
            // 从双指变成单指，不立即开始绘画，等待下一次触摸
            this.touchState.isMultiTouch = false;
        }
    }

    // 暂停绘画，保存当前状态
    pauseDrawing() {
        if (this.isdrawing) {
            this.pointerup({ type: 'pointerup' });  // 发送一个模拟的 pointerup 事件
        }
    }

    pointerdown(e) {
        // 如果是双指状态，不处理
        if (this.touchState.isMultiTouch) return;

        console.log("PencilTool pointerdown");
        this.isdrawing = true;
        
        this.currentPoints = [[this.table.currentPointer.x, this.table.currentPointer.y]];
        this.stylusgroup = new Konva.Group();
        this.table.gLayer.add(this.stylusgroup);
        
        this.drawStroke();
        
        this.table.updateCurrentPointer();
        this.updateHit();
        
        console.log("Start drawing");
    }

    pointerup(e) {
        // 如果是双指状态，不处理
        if (this.touchState.isMultiTouch) return;

        console.log("finish drawing");
        this.lastCommittedPoint = this.currentPoints[this.currentPoints.length - 1];
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
        // 如果是双指状态，不处理
        if (this.touchState.isMultiTouch) return;

        // 先更新指针位置
        this.table.updateCurrentPointer();
        
        if (this.isdrawing) {
            const point = [this.table.currentPointer.x, this.table.currentPointer.y];
            this.currentPoints.push(point);
            this.drawStroke();
        }
        
        this.updateHit();
        
        // 更新鼠标位置信息（使用 requestAnimationFrame 来限制更新频率）
        if (!this._updateDebugScheduled) {
            this._updateDebugScheduled = true;
            requestAnimationFrame(() => {
                updateDebugInfo('mousePosition', {
                    x: this.table.currentPointer.x,
                    y: this.table.currentPointer.y
                });
                this._updateDebugScheduled = false;
            });
        }
    }

    wheel(e){
        console.log("PencilTool wheel");
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
