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
        this.isActive = false;
        
        // 确保 paper 存在
        if (!this.table.paper || !this.table.paper.paperContainer) {
            console.error('PixiPencilTool 需要 PixiPaper 实例');
            return;
        }
        
        // 创建绘图容器，并添加到 paper 容器中
        this.drawingContainer = new PIXI.Container();
        this.drawingContainer.label = 'drawing';
        
        // 将绘图容器添加到 paper 容器而不是 contentLayer
        // 这样绘图坐标系将以 paper 的 (0,0) 点为原点
        this.table.paper.paperContainer.addChild(this.drawingContainer);
        
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
        
        console.log('PixiPencilTool initialized with paper-based coordinate system');
    }
    
    /**
     * 将全局坐标转换为 paper 相对坐标
     * @param {number} globalX - 全局 X 坐标
     * @param {number} globalY - 全局 Y 坐标
     * @returns {PIXI.Point} - paper 相对坐标
     */
    convertToPaperCoordinates(globalX, globalY) {
        // 创建全局坐标点
        const globalPoint = new PIXI.Point(globalX, globalY);
        
        // 将全局坐标转换为 paper 容器中的本地坐标
        return this.table.paper.paperContainer.toLocal(globalPoint);
    }
    
    /**
     * 检查点是否在 paper 范围内
     * @param {number} globalX - 全局 X 坐标
     * @param {number} globalY - 全局 Y 坐标
     * @returns {boolean} - 是否在 paper 范围内
     */
    isPointInPaper(globalX, globalY) {
        // 转换为 paper 相对坐标
        const paperPoint = this.convertToPaperCoordinates(globalX, globalY);
        
        // 判断点是否在 paper 的边界内（就是判断点是否在 0,0 到 width,height 之间）
        return paperPoint.x >= 0 && 
               paperPoint.x <= this.table.paper.width && 
               paperPoint.y >= 0 && 
               paperPoint.y <= this.table.paper.height;
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

        // 创建屏幕坐标点
        const screenPoint = new PIXI.Point(e.clientX, e.clientY);
        
        // 转换为舞台坐标
        const stagePoint = new PIXI.Point();
        this.table.app.stage.worldTransform.applyInverse(screenPoint, stagePoint);
        
        // 检查点是否在 paper 范围内
        if (!this.isPointInPaper(stagePoint.x, stagePoint.y)) {
            console.log('Pencil mode: 只能在 paper 范围内开始绘制');
            return;
        }

        // 获取 paper 相对坐标
        const paperPoint = this.convertToPaperCoordinates(stagePoint.x, stagePoint.y);
        
        // 如果已经在绘制中，先结束当前笔画
        if (this.isActive) {
            this.finishStroke();
        }
        
        // 开始新的笔画 - 使用 paper 相对坐标
        this.startStroke(paperPoint.x, paperPoint.y, e.pressure || 0.5);
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
        
        // 创建屏幕坐标点
        const screenPoint = new PIXI.Point(e.clientX, e.clientY);
        
        // 转换为舞台坐标
        const stagePoint = new PIXI.Point();
        this.table.app.stage.worldTransform.applyInverse(screenPoint, stagePoint);
        
        // 获取 paper 相对坐标
        const paperPoint = this.convertToPaperCoordinates(stagePoint.x, stagePoint.y);
        
        // 更新笔画 - 使用 paper 相对坐标
        this.updateStroke(paperPoint.x, paperPoint.y, e.pressure || 0.5);
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
     * @param {number} x - X 坐标（相对于 paper）
     * @param {number} y - Y 坐标（相对于 paper）
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
        
        // 添加到绘图层 - 现在是 paper 的绘图容器
        this.drawingContainer.addChild(this.strokeData.currentStrokeGraphics);
        
        // 绘制初始点
        this.drawCurrentStroke(false);
        
        // 记录开始时间
        this.strokeData.strokeStartTime = performance.now();
    }
    
    /**
     * 更新笔画
     * @param {number} x - X 坐标（相对于 paper）
     * @param {number} y - Y 坐标（相对于 paper）
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
        if (this.strokeData.currentStrokeGraphics) {
            this.drawings = this.drawings || [];
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
        
        // 绘制连接部分（点之间的多边形）
        for (let i = 1; i < centerPoints.length; i++) {
            const prev = centerPoints[i - 1];
            const curr = centerPoints[i];
            
            // 计算线段的方向向量
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            
            // 线段长度
            const length = Math.sqrt(dx * dx + dy * dy);
            
            // 避免除以零
            if (length === 0) continue;
            
            // 单位向量
            const ux = dx / length;
            const uy = dy / length;
            
            // 法线向量（垂直于线段）
            const nx = -uy;
            const ny = ux;
            
            // 计算四边形的四个顶点
            const x1 = prev.x + nx * prev.radius;
            const y1 = prev.y + ny * prev.radius;
            const x2 = prev.x - nx * prev.radius;
            const y2 = prev.y - ny * prev.radius;
            const x3 = curr.x - nx * curr.radius;
            const y3 = curr.y - ny * curr.radius;
            const x4 = curr.x + nx * curr.radius;
            const y4 = curr.y + ny * curr.radius;
            
            // 绘制连接多边形
            this.strokeData.currentStrokeGraphics.beginPath();
            this.strokeData.currentStrokeGraphics.moveTo(x1, y1);
            this.strokeData.currentStrokeGraphics.lineTo(x2, y2);
            this.strokeData.currentStrokeGraphics.lineTo(x3, y3);
            this.strokeData.currentStrokeGraphics.lineTo(x4, y4);
            this.strokeData.currentStrokeGraphics.closePath();
            this.strokeData.currentStrokeGraphics.fill(0x000000);
        }
        
        // 绘制端点（圆形）
        for (let i = 0; i < centerPoints.length; i++) {
            // 只绘制第一个点和最后一个点的端点
            if (i > 0 && i < centerPoints.length - 1 && !isLast) continue;
            
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
        
        // 移除所有图形
        this.drawings = [];
        this.drawingContainer.removeChildren();
        
        // 重置统计信息
        this.strokeData.strokeCount = 0;
        this.strokeData.totalPoints = 0;
        this.strokeData.lastStrokePoints = 0;
        this.strokeData.lastStrokeTime = 0;
        this.strokeData.totalDrawingTime = 0;
    }
} 