import * as PIXI from 'pixi.js';
import { getStroke } from '../lib/perfect-freehand/packages/perfect-freehand/src';
import { convertPointToLocalCoordinates } from '../pixi/utils';

/**
 * PencilTool 类 - 处理绘图功能
 * 替代原有的 Konva PencilTool
 * 使用 PixiJS 8.0 API
 */
export default class PencilTool {
    /**
     * 创建一个新的 PencilTool 实例
     * @param {Table} table - 表格实例
     */
    constructor(table, options) {
        this.table = table;
        this.isActive = false;
        
        // 创建绘图容器（如果不存在）
        if (!this.table.drawingContainer) {
            this.table.drawingContainer = new PIXI.Container();
            this.table.drawingContainer.label = 'drawing';
            this.table.contentLayer.addChild(this.table.drawingContainer);
        }
        
        // 初始化笔触数据
        this.strokeData = {
            points: [],
            pressure: [],
            lastPoint: null,
            currentLine: null,
            currentStrokeGraphics: null,
            lastStrokePoints: 0,
            lastStrokeTime: 0,
            totalDrawingTime: 0
        };

        // 允许的输入设备类型
        this.allowedInputTypes = ['mouse', 'pen'];
        
        // 应用 paper 遮罩
        if (this.table.paper && this.table.paper.mask) {
            this.table.drawingContainer.mask = this.table.paper.mask;
            this.table.drawingContainer.addChild(this.table.paper.mask);
        }
        
        console.log('PencilTool initialized');
    }
    
    /**
     * 检查点是否在 paper 范围内
     * @param {number} x - X 坐标
     * @param {number} y - Y 坐标
     * @returns {boolean} - 是否在 paper 范围内
     */
    isPointInPaper(x, y) {
        if (!this.table.paper) {
            return false;
        }
        
        // 使用 Paper 的方法检查点是否在纸张内部
        return this.table.paper.isPointInside(x, y);
    }
    
    /**
     * 检查输入设备是否被允许
     * @param {PointerEvent} e - 指针事件
     * @returns {boolean} - 是否允许该输入设备
     */
    isInputAllowed(e) {
        return this.allowedInputTypes.includes(e.pointerType);
    }
    
    /**
     * 获取可变宽度笔画
     * 基于 perfect-freehand 的原理，但返回中心线点和半径
     * @param {Array} points - 输入点数组
     * @param {Object} options - 选项
     * @returns {Array} 中心线点及其对应的半径
     */
    getVariableWidthStroke(points, options = {}) {
        // // 使用 perfect-freehand 的 getStroke 函数获取轮廓点
        // const outlinePoints = getStroke(points, options);
        
        // if (!outlinePoints || outlinePoints.length < 2) return [];
        
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
        // 确保 drawingContainer 使用了 paper 遮罩
        if (this.paperMask && !this.table.drawingContainer.mask) {
            this.table.drawingContainer.mask = this.paperMask;
        }
        
        console.log('PencilTool activated');
    }
    
    /**
     * 停用工具
     */
    deactivate() {
        console.log('PencilTool deactivated');
        
        // 确保在工具停用时结束任何进行中的绘画
        if (this.isActive) {
            this.finishStroke();
        }
    }
    
    /**
     * 处理指针按下事件
     * @param {PointerEvent} e - 指针事件
     */
    pointerdown(e) {
        // 检查输入设备是否被允许
        if (!this.isInputAllowed(e)) {
            console.log('Pencil mode: 不允许使用手指触摸进行绘制');
            return;
        }

        // 获取本地坐标
        const localPoint = convertPointToLocalCoordinates(this.table.app, e.clientX, e.clientY, this.table.contentLayer);
        console.log('localPoint', localPoint);
        // 检查是否在 paper 范围内 - 只在开始绘制时检查
        if (!this.isPointInPaper(localPoint.x, localPoint.y)) {
            console.log('Pencil mode: 只能在 paper 范围内开始绘制');
            return;
        }

        // 如果已经在绘制中，先结束当前笔画
        if (this.isActive) {
            this.finishStroke();
        }
        
        // 开始新的笔画
        this.startStroke(localPoint.x, localPoint.y, e.pressure || 0.5);
    }
    
    /**
     * 处理指针移动事件
     * @param {PointerEvent} e - 指针事件
     */
    pointermove(e) {
        // 检查输入设备是否被允许
        if (!this.isInputAllowed(e)) {
            return;
        }

        if (!this.isActive) return;
        
        // 获取本地坐标
        const localPoint = convertPointToLocalCoordinates(this.table.app, e.clientX, e.clientY, this.table.contentLayer);
        
        // 不再进行边界检查，允许绘制超出边界
        // 超出部分会被遮罩掉
        
        // 更新笔画
        this.updateStroke(localPoint.x, localPoint.y, e.pressure || 0.5);
    }
    
    /**
     * 处理指针抬起事件
     * @param {PointerEvent} e - 指针事件
     */
    pointerup(e) {
        if (!this.isActive) return;
        
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
        this.isActive = true;
        
        // 重置点集合
        this.strokeData.points = [[x, y, pressure]];
        this.strokeData.pressure = [pressure];
        
        // 创建新的图形对象 - PixiJS 8.0 风格
        this.strokeData.currentStrokeGraphics = new PIXI.Graphics();
        this.strokeData.currentStrokeGraphics.label = 'drawing'; // 添加标签，用于视口裁剪（在 PixiJS 8.0 中使用 label 代替 name）
        
        // 添加到绘图层
        this.table.drawingContainer.addChild(this.strokeData.currentStrokeGraphics);
        
        // 绘制初始点
        this.drawCurrentStroke(false);
        
        // 记录开始时间
        this.strokeData.strokeStartTime = performance.now();
    }
    
    /**
     * 更新笔画
     * @param {number} x - X 坐标
     * @param {number} y - Y 坐标
     * @param {number} pressure - 压力值
     */
    updateStroke(x, y, pressure = 0.5) {
        if (!this.isActive) return;
        
        // 添加新点
        this.strokeData.points.push([x, y, pressure]);
        this.strokeData.pressure.push(pressure);
        
        // 重新绘制
        this.drawCurrentStroke(false);
    }
    
    /**
     * 完成笔画
     */
    finishStroke() {
        if (!this.isActive) return;
        
        // 绘制最终笔画
        this.drawCurrentStroke(true);
        
        // 更新统计信息
        this.strokeData.strokeCount++;
        this.strokeData.lastStrokePoints = this.strokeData.points.length;
        this.strokeData.totalPoints += this.strokeData.points.length;
        
        // 计算绘制时间
        const strokeEndTime = performance.now();
        this.strokeData.lastStrokeTime = strokeEndTime - this.strokeData.strokeStartTime;
        this.strokeData.totalDrawingTime += this.strokeData.lastStrokeTime;
        
        // 将当前图形添加到绘图列表
        if (this.drawings && this.strokeData.currentStrokeGraphics) {
            this.drawings.push(this.strokeData.currentStrokeGraphics);
        }
        
        // 重置状态
        this.isActive = false;
        this.strokeData.points = [];
        this.strokeData.pressure = [];
        this.strokeData.currentStrokeGraphics = null;
    }
    
    /**
     * 绘制当前笔画
     * @param {boolean} isLast - 是否为最后一次绘制
     */
    drawCurrentStroke(isLast) {
        if (!this.strokeData.currentStrokeGraphics || this.strokeData.points.length === 0) return;
        
        // 设置绘制选项
        const options = {
            size: 6, // 固定尺寸，不再依赖 pixel
            thinning: 0.6,             // 压力对笔画宽度的影响程度
            smoothing: 0.5,            // 平滑程度
            streamline: 0.5,           // 流线化程度
            easing: (t) => Math.sin((t * Math.PI) / 2), // 缓动函数
            simulatePressure: true     // 是否模拟压力
        };
        
        // 清除当前图形
        this.strokeData.currentStrokeGraphics.clear();
        
        // 获取可变宽度笔画（中心线点和半径）
        const centerPoints = this.getVariableWidthStroke(this.strokeData.points, options);
        
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
            this.strokeData.currentStrokeGraphics.beginPath();
            this.strokeData.currentStrokeGraphics.moveTo(x1, y1);
            this.strokeData.currentStrokeGraphics.lineTo(x2, y2);
            this.strokeData.currentStrokeGraphics.lineTo(x3, y3);
            this.strokeData.currentStrokeGraphics.lineTo(x4, y4);
            this.strokeData.currentStrokeGraphics.closePath();
            this.strokeData.currentStrokeGraphics.fill(0x000000);
        }
        
        // 然后绘制圆形端点（确保圆形绘制在连接线上方）
        for (let i = 0; i < centerPoints.length; i++) {
            const point = centerPoints[i];
            
            // 绘制圆形端点
            this.strokeData.currentStrokeGraphics.beginPath();
            this.strokeData.currentStrokeGraphics.circle(point.x, point.y, point.radius);
            this.strokeData.currentStrokeGraphics.fill(0x000000);
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
        if (this.isActive) {
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
        this.strokeData.strokeCount = 0;
        this.strokeData.totalPoints = 0;
        this.strokeData.lastStrokePoints = 0;
        this.strokeData.lastStrokeTime = 0;
        this.strokeData.totalDrawingTime = 0;
        
        // 重新添加遮罩
        if (this.paperMask) {
            this.table.drawingContainer.mask = this.paperMask;
        }
    }
}
