import * as PIXI from 'pixi.js';
import { getStroke } from '../lib/perfect-freehand/packages/perfect-freehand/src';
import { convertPointToLocalCoordinates } from '../pixi/utils';

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
            size: this.table.pixel * 2, // 增大基础尺寸
            thinning: 0.6,             // 压力对笔画宽度的影响程度
            smoothing: 0.5,            // 平滑程度
            streamline: 0.5,           // 流线化程度
            easing: (t) => Math.sin((t * Math.PI) / 2), // 缓动函数
            simulatePressure: true     // 是否模拟压力
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
     * 获取可变宽度笔画
     * 基于 perfect-freehand 的原理，但返回中心线点和半径
     * @param {Array} points - 输入点数组
     * @param {Object} options - 选项
     * @returns {Array} 中心线点及其对应的半径
     */
    getVariableWidthStroke(points, options = {}) {
        // 使用 perfect-freehand 的 getStroke 函数获取轮廓点
        const outlinePoints = getStroke(points, options);
        
        if (!outlinePoints || outlinePoints.length < 2) return [];
        
        // 原始输入点（用作中心线）
        const centerPoints = [];
        
        // 计算每个输入点的平均半径
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            const x = Array.isArray(point) ? point[0] : point.x;
            const y = Array.isArray(point) ? point[1] : point.y;
            const pressure = Array.isArray(point) ? (point[2] || 0.5) : (point.pressure || 0.5);
            
            // 基于压力计算半径
            let radius = options.size / 2;
            if (options.thinning > 0) {
                // 模拟 perfect-freehand 中的半径计算
                const thinning = Math.max(0, Math.min(1, options.thinning));
                const scale = 1 - thinning * (1 - pressure);
                radius = options.size * scale / 2;
            }
            
            centerPoints.push({
                x,
                y,
                radius
            });
        }
        
        return centerPoints;
    }
    
    /**
     * 激活工具
     */
    activate() {
        console.log('PixiPencilTool activated');
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
        
        // 获取本地坐标
        const localPoint = convertPointToLocalCoordinates(this.table.app, e.clientX, e.clientY, this.table.contentLayer);
        
        // 开始新的笔画
        this.startStroke(localPoint.x, localPoint.y, e.pressure || 0.5);
    }
    
    /**
     * 处理指针移动事件
     * @param {PointerEvent} e - 指针事件
     */
    pointermove(e) {
        if (!this.isDrawing) return;
        
        // 获取本地坐标
        const localPoint = convertPointToLocalCoordinates(this.table.app, e.clientX, e.clientY, this.table.contentLayer);
        
        // 更新笔画
        this.updateStroke(localPoint.x, localPoint.y, e.pressure || 0.5);
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
        this.currentPoints = [[x, y, pressure]];
        this.currentPressures = [pressure];
        
        // 创建新的图形对象 - PixiJS 8.0 风格
        this.currentGraphics = new PIXI.Graphics();
        this.currentGraphics.label = 'drawing'; // 添加标签，用于视口裁剪（在 PixiJS 8.0 中使用 label 代替 name）
        
        // 添加到绘图层
        this.table.drawingContainer.addChild(this.currentGraphics);
        
        // 绘制初始点
        this.drawCurrentStroke(false);
        
        // 记录开始时间
        this.stats.strokeStartTime = performance.now();
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
        this.currentPoints.push([x, y, pressure]);
        this.currentPressures.push(pressure);
        
        // 重新绘制
        this.drawCurrentStroke(false);
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
        
        // 清除当前图形
        this.currentGraphics.clear();
        
        // 获取可变宽度笔画（中心线点和半径）
        const centerPoints = this.getVariableWidthStroke(this.currentPoints, options);
        
        if (centerPoints.length < 2) return;
        
        // 先绘制连接线
        for (let i = 0; i < centerPoints.length - 1; i++) {
            const current = centerPoints[i];
            const next = centerPoints[i + 1];
            
            // 计算连接线
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 0.1) continue; // 避免点太近时出现问题
            
            // 计算线段的法向量（垂直于线段的单位向量）
            const nx = -dy / distance;
            const ny = dx / distance;
            
            // 计算连接两点的多边形顶点
            const radius1 = current.radius;
            const radius2 = next.radius;
            
            // 创建连接多边形的四个顶点
            const x1 = current.x + nx * radius1;
            const y1 = current.y + ny * radius1;
            const x2 = current.x - nx * radius1;
            const y2 = current.y - ny * radius1;
            const x3 = next.x - nx * radius2;
            const y3 = next.y - ny * radius2;
            const x4 = next.x + nx * radius2;
            const y4 = next.y + ny * radius2;
            
            // 绘制连接多边形
            this.currentGraphics.beginPath();
            this.currentGraphics.moveTo(x1, y1);
            this.currentGraphics.lineTo(x2, y2);
            this.currentGraphics.lineTo(x3, y3);
            this.currentGraphics.lineTo(x4, y4);
            this.currentGraphics.closePath();
            this.currentGraphics.fill(0x000000);
        }
        
        // 然后绘制圆形端点（确保圆形绘制在连接线上方）
        for (let i = 0; i < centerPoints.length; i++) {
            const point = centerPoints[i];
            
            // 绘制圆形端点
            this.currentGraphics.beginPath();
            this.currentGraphics.circle(point.x, point.y, point.radius);
            this.currentGraphics.fill(0x000000);
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
        this.table.drawingContainer.removeChildren();
        
        // 重置统计信息
        this.stats.strokeCount = 0;
        this.stats.totalPoints = 0;
        this.stats.lastStrokePoints = 0;
        this.stats.lastStrokeTime = 0;
        this.stats.totalDrawingTime = 0;
    }
    
    // /**
    //  * 处理滚轮事件
    //  * 铅笔工具不需要处理滚轮事件，但需要提供此方法以保持接口一致
    //  * @param {WheelEvent} e - 滚轮事件
    //  */
    // wheel(e) {
    //     // 铅笔工具不处理滚轮事件
    //     // 如果需要在铅笔工具激活时处理缩放，可以在这里调用 ZoomTool 的方法
    // }
} 