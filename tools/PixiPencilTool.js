import * as PIXI from 'pixi.js';
import { getStroke } from '../lib/perfect-freehand/packages/perfect-freehand/src';
import { updateDebugInfo } from '../debug.jsx';

/**
 * PixiPencilTool 类 - 处理绘图功能
 * 替代原有的 Konva PencilTool
 * 使用 PixiJS 8.0 API
 */
export default class PixiPencilTool {
    /**
     * 创建一个新的 PixiPencilTool 实例
     * @param {PixiTable} table - 表格实例
     */
    constructor(table) {
        this.table = table;
        this.isDrawing = false;
        this.currentPoints = [];
        this.currentPressures = [];
        
        // 触摸延迟相关属性
        this.touchTimer = null;
        this.pendingTouch = null;
        
        // 当前绘制的图形
        this.currentGraphics = null;
        
        // 存储所有绘制的图形
        this.drawings = [];
        
        // 绘制选项
        this.options = {
            size: this.table.pixel,
            thinning: 0.6,
            smoothing: 0.5,
            streamline: 0.5,
            easing: (t) => Math.sin((t * Math.PI) / 2),
            simulatePressure: true
        };
        
        // 笔迹统计
        this.stats = {
            strokeCount: 0,
            totalPoints: 0,
            lastStrokePoints: 0,
            lastStrokeTime: 0,
            totalDrawingTime: 0
        };
        
        console.log('PixiPencilTool initialized');
    }
    
    /**
     * 激活工具
     */
    activate() {
        console.log('PixiPencilTool activated');
        
        // 更新调试信息
        updateDebugInfo('pencilTool', {
            status: 'activated',
            strokeCount: this.stats.strokeCount,
            totalPoints: this.stats.totalPoints
        });
    }
    
    /**
     * 停用工具
     */
    deactivate() {
        console.log('PixiPencilTool deactivated');
        
        // 确保在工具停用时结束任何进行中的绘画
        if (this.isDrawing) {
            this.finishStroke();
        }
        
        // 更新调试信息
        updateDebugInfo('pencilTool', {
            status: 'deactivated',
            strokeCount: this.stats.strokeCount,
            totalPoints: this.stats.totalPoints
        });
    }
    
    /**
     * 处理指针按下事件
     * @param {PointerEvent} e - 指针事件
     */
    pointerdown(e) {
        // 如果已经在绘制中，先结束当前笔画
        if (this.isDrawing) {
            this.finishStroke();
        }
        
        // 获取世界坐标
        const worldPoint = this.table.getWorldPoint(e);
        
        // 开始新的笔画
        this.startStroke(worldPoint.x, worldPoint.y, e.pressure || 0.5);
    }
    
    /**
     * 处理指针移动事件
     * @param {PointerEvent} e - 指针事件
     */
    pointermove(e) {
        if (!this.isDrawing) return;
        
        // 获取世界坐标
        const worldPoint = this.table.getWorldPoint(e);
        
        // 更新笔画
        this.updateStroke(worldPoint.x, worldPoint.y, e.pressure || 0.5);
    }
    
    /**
     * 处理指针抬起事件
     * @param {PointerEvent} e - 指针事件
     */
    pointerup(e) {
        if (!this.isDrawing) return;
        
        // 完成笔画
        this.finishStroke();
    }
    
    /**
     * 开始绘制笔画
     * @param {number} x - X 坐标
     * @param {number} y - Y 坐标
     * @param {number} pressure - 压力值
     */
    startStroke(x, y, pressure = 0.5) {
        this.isDrawing = true;
        
        // 重置点集合
        this.currentPoints = [[x, y]];
        this.currentPressures = [pressure];
        
        // 创建新的图形对象 - PixiJS 8.0 风格
        this.currentGraphics = new PIXI.Graphics();
        this.currentGraphics.label = 'drawing'; // 添加标签，用于视口裁剪（在 PixiJS 8.0 中使用 label 代替 name）
        
        // 添加到绘图层
        this.table.drawingLayer.add(this.currentGraphics);
        
        // 绘制初始点
        this.drawCurrentStroke(false);
        
        // 记录开始时间
        this.stats.strokeStartTime = performance.now();
        
        // 更新调试信息
        updateDebugInfo('pencilTool', {
            status: 'drawing',
            currentPoints: 1,
            position: { x, y },
            pressure
        });
    }
    
    /**
     * 更新笔画
     * @param {number} x - X 坐标
     * @param {number} y - Y 坐标
     * @param {number} pressure - 压力值
     */
    updateStroke(x, y, pressure = 0.5) {
        if (!this.isDrawing) return;
        
        // 添加新点
        this.currentPoints.push([x, y]);
        this.currentPressures.push(pressure);
        
        // 重新绘制
        this.drawCurrentStroke(false);
        
        // 更新调试信息
        updateDebugInfo('pencilTool', {
            status: 'drawing',
            currentPoints: this.currentPoints.length,
            position: { x, y },
            pressure
        });
    }
    
    /**
     * 完成笔画
     */
    finishStroke() {
        if (!this.isDrawing) return;
        
        // 绘制最终笔画
        this.drawCurrentStroke(true);
        
        // 更新统计信息
        this.stats.strokeCount++;
        this.stats.lastStrokePoints = this.currentPoints.length;
        this.stats.totalPoints += this.currentPoints.length;
        
        // 计算绘制时间
        const strokeEndTime = performance.now();
        this.stats.lastStrokeTime = strokeEndTime - this.stats.strokeStartTime;
        this.stats.totalDrawingTime += this.stats.lastStrokeTime;
        
        // 更新调试信息
        updateDebugInfo('pencilTool', {
            status: 'stroke_completed',
            strokeCount: this.stats.strokeCount,
            lastStrokePoints: this.stats.lastStrokePoints,
            totalPoints: this.stats.totalPoints,
            lastStrokeTime: this.stats.lastStrokeTime.toFixed(2),
            totalDrawingTime: this.stats.totalDrawingTime.toFixed(2)
        });
        
        // 将当前图形添加到绘图列表
        if (this.currentGraphics) {
            this.drawings.push(this.currentGraphics);
        }
        
        // 重置状态
        this.isDrawing = false;
        this.currentPoints = [];
        this.currentPressures = [];
        this.currentGraphics = null;
    }
    
    /**
     * 绘制当前笔画
     * @param {boolean} isLast - 是否为最后一次绘制
     */
    drawCurrentStroke(isLast) {
        if (!this.currentGraphics || this.currentPoints.length === 0) return;
        
        // 设置绘制选项
        const options = {
            ...this.options,
            last: isLast
        };
        
        // 使用 perfect-freehand 生成笔画
        const stroke = getStroke(this.currentPoints, options);
        
        // 清除当前图形 - PixiJS 8.0 风格
        this.currentGraphics.clear();
        
        // 设置填充样式 - PixiJS 8.0 风格
        this.currentGraphics.fill(0x000000);
        
        // 绘制路径 - PixiJS 8.0 风格
        if (stroke.length >= 3) {
            // 开始一个新路径
            this.currentGraphics.beginPath();
            
            // 移动到第一个点
            this.currentGraphics.moveTo(stroke[0][0], stroke[0][1]);
            
            // 绘制线段
            for (let i = 1; i < stroke.length; i++) {
                this.currentGraphics.lineTo(stroke[i][0], stroke[i][1]);
            }
            
            // 闭合路径
            this.currentGraphics.closePath();
        }
    }
    
    /**
     * 从笔画点生成 SVG 路径数据
     * @param {Array} points - 笔画点
     * @returns {string} - SVG 路径数据
     */
    getSvgPathFromStroke(points) {
        if (!points.length) {
            return "";
        }
        
        const max = points.length - 1;
        
        return points
            .reduce(
                (acc, point, i, arr) => {
                    if (i === 0) {
                        return `M ${point[0]},${point[1]}`;
                    }
                    
                    const [x0, y0] = arr[i - 1];
                    const [x1, y1] = point;
                    
                    return `${acc} L ${x1},${y1}`;
                },
                ""
            )
            .concat(points.length > 2 ? "Z" : "");
    }
    
    /**
     * 清除所有绘图
     */
    clear() {
        // 清除当前绘制
        if (this.isDrawing) {
            this.finishStroke();
        }
        
        // 清除所有绘图 - PixiJS 8.0 风格
        this.drawings.forEach(drawing => {
            // 在 PixiJS 8.0 中，直接销毁图形对象
            drawing.destroy();
        });
        
        this.drawings = [];
        this.table.drawingLayer.clear();
        
        // 重置统计信息
        this.stats.strokeCount = 0;
        this.stats.totalPoints = 0;
        this.stats.lastStrokePoints = 0;
        this.stats.lastStrokeTime = 0;
        this.stats.totalDrawingTime = 0;
        
        // 更新调试信息
        updateDebugInfo('pencilTool', {
            status: 'cleared',
            strokeCount: 0,
            totalPoints: 0
        });
    }
    
    /**
     * 处理滚轮事件
     * 铅笔工具不需要处理滚轮事件，但需要提供此方法以保持接口一致
     * @param {WheelEvent} e - 滚轮事件
     */
    wheel(e) {
        // 铅笔工具不处理滚轮事件
        // 如果需要在铅笔工具激活时处理缩放，可以在这里调用 ZoomTool 的方法
    }
} 