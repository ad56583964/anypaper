import Konva from '../src/konva';
import { getStroke } from '../src/perfect-freehand/packages/perfect-freehand/src';
import { updateDebugInfo } from '../debug';

export default class PencilTool {
    constructor(table){
        this.table = table;
        this.initHitDebug();

        this.isdrawing = false;
        this.currentPoints = [];
        this.currentPressures = [];
        
        // 触摸延迟相关属性
        this.touchTimer = null;
        this.pendingTouch = null;
        
        // 存储所有绘画的主组
        this.mainGroup = new Konva.Group();
        this.table.gLayer.add(this.mainGroup);
        
        // 当前绘画的临时组
        this.currentStrokeGroup = null;

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
        // 确保在工具停用时结束任何进行中的绘画
        if (this.isdrawing) {
            this.finishStroke();
        }
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

    // 开始一个新的笔画
    startStroke(point) {
        // 创建新的绘画组
        this.currentStrokeGroup = new Konva.Group();
        this.mainGroup.add(this.currentStrokeGroup);
        
        // 重置点数组
        this.currentPoints = [point];
        this.currentPath = null;
        this.isdrawing = true;
    }
    
    // 更新当前笔画
    updateStroke(point) {
        if (!this.isdrawing || !this.currentStrokeGroup) return;
        
        // 添加新点
        this.currentPoints.push(point);
        
        // 至少需要两个点才能绘制
        if (this.currentPoints.length < 2) return;
        
        // 绘制笔画
        this.drawCurrentStroke(false);
    }
    
    // 完成当前笔画
    finishStroke() {
        if (!this.isdrawing || !this.currentStrokeGroup) return;
        
        // 绘制最终笔画
        this.drawCurrentStroke(true);
        
        // 缓存当前笔画组以提高性能
        const actualPixelRatio = Math.max(3, window.devicePixelRatio || 2);
        this.currentStrokeGroup.cache({
            pixelRatio: actualPixelRatio,
            imageSmoothingEnabled: false,
            clearBeforeDraw: true,
        });
        
        // 重置状态
        this.isdrawing = false;
        this.currentPoints = [];
        this.currentPath = null;
        this.currentStrokeGroup = null;
        
        // 更新调试信息
        updateDebugInfo('pixelRatio', {
            devicePixelRatio: window.devicePixelRatio,
            actualPixelRatio
        });
    }
    
    // 绘制当前笔画
    drawCurrentStroke(isLast) {
        if (!this.currentStrokeGroup) return;
        
        const options = {
            size: this.table.pixel * 2,
            thinning: 0.6,
            smoothing: 0.5,
            streamline: 0.5,
            easing: (t) => Math.sin((t * Math.PI) / 2),
            simulatePressure: true,
            last: isLast, // 只在最后一次绘制时设置为 true
        };

        const stroke = getStroke(this.currentPoints, options);
        const pathData = this.getSvgPathFromStroke(stroke);

        // 移除之前的路径
        if (this.currentPath) {
            this.currentPath.destroy();
        }

        // 创建新路径
        this.currentPath = new Konva.Path({
            data: pathData,
            fill: 'black',
            listening: false,
            draggable: false,
        });

        this.currentStrokeGroup.add(this.currentPath);
        this.table.gLayer.batchDraw();
    }

    // 处理触摸事件
    touchstart(e) {
        // 如果已经在绘画中，阻止任何其他触摸事件
        if (this.isdrawing) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        // 只处理单指触摸开始绘画，但添加延迟以检测可能的多指触摸
        if (e.touches.length === 1) {
            e.preventDefault();
            e.stopPropagation();
            
            // 存储触摸信息，但不立即开始绘画
            this.pendingTouch = {
                touch: e.touches[0],
                timestamp: Date.now()
            };
            
            // 设置延迟定时器，如果在短时间内没有第二个手指触摸，才开始绘画
            this.touchTimer = setTimeout(() => {
                // 如果定时器触发时仍然只有一个触摸点，才开始绘画
                if (this.pendingTouch && !this.isdrawing) {
                    this.table.updateCurrentPointer();
                    this.startStroke([this.table.currentPointer.x, this.table.currentPointer.y]);
                    this.pendingTouch = null;
                }
            }, 50); // 50毫秒的延迟，足够检测到第二个手指但不会有明显的延迟感
        } else {
            // 如果已经有多个触摸点，取消待处理的触摸
            if (this.touchTimer) {
                clearTimeout(this.touchTimer);
                this.touchTimer = null;
            }
            this.pendingTouch = null;
        }
    }

    touchmove(e) {
        // 如果有待处理的触摸但还没开始绘画，取消它
        if (this.pendingTouch && !this.isdrawing && e.touches.length > 1) {
            clearTimeout(this.touchTimer);
            this.touchTimer = null;
            this.pendingTouch = null;
            return;
        }
        
        // 如果正在绘画，阻止任何其他触摸事件
        if (this.isdrawing) {
            e.preventDefault();
            e.stopPropagation();
            
            // 只处理单指移动
            if (e.touches.length === 1) {
                this.table.updateCurrentPointer();
                this.updateStroke([this.table.currentPointer.x, this.table.currentPointer.y]);
            }
        }
    }

    touchend(e) {
        // 取消任何待处理的触摸
        if (this.touchTimer) {
            clearTimeout(this.touchTimer);
            this.touchTimer = null;
        }
        this.pendingTouch = null;
        
        // 如果正在绘画，先阻止事件传播
        if (this.isdrawing) {
            e.preventDefault();
            e.stopPropagation();
            
            // 如果所有手指都离开了，结束绘画
            if (e.touches.length === 0) {
                this.finishStroke();
            }
        }
    }

    // 添加对 touchcancel 事件的处理
    touchcancel(e) {
        // 取消任何待处理的触摸
        if (this.touchTimer) {
            clearTimeout(this.touchTimer);
            this.touchTimer = null;
        }
        this.pendingTouch = null;
        
        // 如果正在绘画，强制结束绘画
        if (this.isdrawing) {
            e.preventDefault();
            e.stopPropagation();
            this.finishStroke();
        }
    }

    pointerdown(e) {
        console.log("PencilTool pointerdown");
        this.table.updateCurrentPointer();
        this.startStroke([this.table.currentPointer.x, this.table.currentPointer.y]);
        this.updateHit();
        
        console.log("Start drawing");
    }

    pointerup(e) {
        console.log("finish drawing");
        
        // 只有在绘画状态时才处理
        if (!this.isdrawing) return;
        
        this.finishStroke();
    }

    pointermove(e) {
        // 先更新指针位置
        this.table.updateCurrentPointer();
        
        if (this.isdrawing) {
            this.updateStroke([this.table.currentPointer.x, this.table.currentPointer.y]);
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
        // 如果正在绘画，阻止滚轮事件
        if (this.isdrawing) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
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
        this.hit = new Konva.Circle({
            radius: 5,
            fill:"red",
            x: 0,
            y: 0,
            listening: false,
            draggable: false,
        })

        this.table.gLayer.add(this.hit);
    }
}
