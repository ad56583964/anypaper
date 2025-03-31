import { getStroke } from '../lib/perfect-freehand/packages/perfect-freehand/src';

/**
 * CanvasPencilTool 类 - 处理绘图功能
 * 使用CanvasKit替代原有的Pixi.js实现
 */
export default class CanvasPencilTool {
    /**
     * 创建一个新的CanvasPencilTool实例
     * @param {CanvasTable} table - 表格实例
     */
    constructor(table, options) {
        this.table = table;
        this.CanvasKit = table.CanvasKit;
        this.isActive = false;
        
        // 初始化笔触样式
        this.initStrokeStyles();
        
        // 初始化笔触数据
        this.strokeData = {
            points: [],
            pressure: [],
            lastPoint: null,
            currentPath: null,
            currentPaint: null,
            lastStrokePoints: 0,
            lastStrokeTime: 0,
            totalDrawingTime: 0
        };

        // 允许的输入设备类型
        this.allowedInputTypes = ['mouse', 'pen'];
        
        console.log('CanvasPencilTool initialized');
    }
    
    /**
     * 初始化笔触样式
     */
    initStrokeStyles() {
        // 创建SkPaint对象用于绘制笔触
        this.defaultPaint = new this.CanvasKit.Paint();
        this.defaultPaint.setColor(this.CanvasKit.Color4f(0, 0, 0, 1.0)); // 黑色
        this.defaultPaint.setAntiAlias(true);
        this.defaultPaint.setStyle(this.CanvasKit.PaintStyle.Fill);
        this.defaultPaint.setStrokeJoin(this.CanvasKit.StrokeJoin.Round);
        this.defaultPaint.setStrokeCap(this.CanvasKit.StrokeCap.Round);
    }
    
    /**
     * 检查点是否在paper范围内
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @returns {boolean} - 是否在paper范围内
     */
    isPointInPaper(x, y) {
        if (!this.table.paper) {
            return false;
        }
        
        // 使用Paper的方法检查点是否在纸张内部
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
     * 获取形成笔触路径的点
     * @param {Array} points - 输入点数组
     * @param {Object} options - 选项
     * @returns {Array} 输出点数组，用于创建SkPath
     */
    getStrokePathPoints(points, options = {}) {
        // 默认选项 - 根据perfect-freehand文档优化参数
        const defaultOptions = {
            size: 6,               // 笔触大小
            thinning: 0.6,         // 压力对笔触宽度的影响程度
            smoothing: 0.5,        // 平滑度
            streamline: 0.5,       // 延迟平滑程度
            easing: (t) => t * t,  // 缓动函数使笔触更自然
            simulatePressure: false, // 如果设备提供压力数据就使用真实数据
            last: false,           // 是否为最后一点
            capStart: true,        // 绘制起点圆形端点
            capEnd: true,          // 绘制终点圆形端点
            correctForViewport: false // 是否校正视口
        };
        
        // 合并选项
        const mergedOptions = {...defaultOptions, ...options};
        
        // 使用perfect-freehand获取笔触轨迹外轮廓路径
        const outlinePoints = getStroke(points, mergedOptions);
        
        if (!outlinePoints || outlinePoints.length < 2) return [];
        
        // 返回形成路径的点
        return outlinePoints;
    }
    
    /**
     * 创建SkPath路径
     * @param {Array} pathPoints - perfect-freehand生成的路径点数组
     * @returns {SkPath} - CanvasKit路径对象
     */
    createPath(pathPoints) {
        if (!pathPoints || pathPoints.length < 2) {
            return null;
        }
        
        // 创建新的SkPath
        const path = new this.CanvasKit.Path();
        
        // 移动到第一个点
        path.moveTo(pathPoints[0][0], pathPoints[0][1]);
        
        // 连接所有其他点 - 使用quadraticCurveTo平滑连接点
        for (let i = 1; i < pathPoints.length; i++) {
            const p0 = pathPoints[i - 1];
            const p1 = pathPoints[i];
            
            // 对于直线连接
            path.lineTo(p1[0], p1[1]);
        }
        
        // 闭合路径 - perfect-freehand生成的是封闭路径
        path.close();
        
        return path;
    }
    
    /**
     * 创建笔触的SkPaint
     * @param {Object} options - 笔触选项
     * @returns {SkPaint} - CanvasKit画笔对象
     */
    createStrokePaint(options = {}) {
        // 复制默认笔触样式
        const paint = this.defaultPaint.copy();
        
        // 设置颜色
        if (options.color) {
            paint.setColor(this.CanvasKit.Color4f(
                ((options.color >> 16) & 0xff) / 255,
                ((options.color >> 8) & 0xff) / 255,
                (options.color & 0xff) / 255,
                options.opacity || 1.0
            ));
        }
        
        return paint;
    }
    
    /**
     * 激活工具
     */
    activate() {
        // 激活绘图工具
        console.log('CanvasPencilTool activated');
    }
    
    /**
     * 停用工具
     */
    deactivate() {
        console.log('CanvasPencilTool deactivated');
        
        // 结束进行中的绘制
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
            console.log('CanvasPencilTool: 不允许使用手指触摸进行绘制');
            return;
        }

        // 将客户端坐标转换为画布坐标
        const x = e.clientX;
        const y = e.clientY;
        
        // 应用反向变换矩阵获取内容层坐标
        const localPoint = this.viewToContentCoordinates(x, y);
        
        // 检查是否在paper范围内
        if (!this.isPointInPaper(localPoint.x, localPoint.y)) {
            console.log('CanvasPencilTool: 只能在paper范围内开始绘制');
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
        
        // 将客户端坐标转换为画布坐标
        const x = e.clientX;
        const y = e.clientY;
        
        // 应用反向变换矩阵获取内容层坐标
        const localPoint = this.viewToContentCoordinates(x, y);
        
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
     * 将视图坐标转换为内容坐标
     * @param {number} viewX - 视图 X 坐标
     * @param {number} viewY - 视图 Y 坐标
     * @returns {Object} 内容层坐标
     */
    viewToContentCoordinates(viewX, viewY) {
        // 获取当前变换信息
        const { scale, translateX, translateY } = this.table.transform;
        
        // 计算居中偏移
        const centerX = (this.table.stageWidth - this.table.width * scale) / 2;
        const centerY = (this.table.stageHeight - this.table.height * scale) / 2;
        
        // 计算实际平移
        const actualTranslateX = centerX + translateX;
        const actualTranslateY = centerY + translateY;
        
        // 应用反向变换
        const contentX = (viewX - actualTranslateX) / scale;
        const contentY = (viewY - actualTranslateY) / scale;
        
        return { x: contentX, y: contentY };
    }
    
    /**
     * 开始新的笔画
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} pressure - 压力值(0-1)
     */
    startStroke(x, y, pressure) {
        this.isActive = true;
        
        // 初始化笔触数据
        this.strokeData.points = [[x, y, pressure]];
        this.strokeData.pressure = [pressure];
        this.strokeData.lastPoint = { x, y };
        this.strokeData.lastStrokeTime = Date.now();
        
        // 创建SkPaint
        this.strokeData.currentPaint = this.createStrokePaint({
            color: 0x000000,  // 黑色
            opacity: 1.0
        });
        
        console.log('CanvasPencilTool: 开始笔触', { x, y, pressure });
    }
    
    /**
     * 更新笔画
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} pressure - 压力值(0-1)
     */
    updateStroke(x, y, pressure) {
        if (!this.isActive) return;
        
        // 添加新点
        this.strokeData.points.push([x, y, pressure]);
        this.strokeData.pressure.push(pressure);
        this.strokeData.lastPoint = { x, y };
        
        // 更新绘制数据
        this.updateDrawPath();
    }
    
    /**
     * 更新绘制路径
     */
    updateDrawPath() {
        // 使用perfect-freehand生成笔触外轮廓
        const pathPoints = this.getStrokePathPoints(this.strokeData.points, {
            size: 10,               // 更大的笔触尺寸
            thinning: 0.6,          // 增强压力变化效果
            smoothing: 0.5,         // 保持中等平滑度
            streamline: 0.5,        // 适当延迟以减少抖动
            easing: (t) => t * t,   // 二次缓动使笔触更自然
            last: false             // 实时绘制状态
        });
        
        // 创建SkPath
        const skPath = this.createPath(pathPoints);
        
        if (skPath) {
            // 存储当前路径
            this.strokeData.currentPath = skPath;
            
            // 将路径添加到table的路径列表
            // 先删除正在绘制中的路径(如果存在)
            if (this.table.drawingPaths && this.table.drawingPaths.length > 0) {
                const lastPath = this.table.drawingPaths[this.table.drawingPaths.length - 1];
                if (lastPath && lastPath.isActive) {
                    this.table.drawingPaths.pop();
                }
            }
            
            // 添加新路径
            this.table.drawingPaths.push({
                skPath,
                paint: this.strokeData.currentPaint,
                isActive: true,
                timestamp: Date.now() // 添加时间戳以便稍后可能的撤销/重做功能
            });
        }
    }
    
    /**
     * 完成笔画
     */
    finishStroke() {
        if (!this.isActive) return;
        
        // 更新绘制数据，传入last=true使用perfect-freehand生成最终效果
        const pathPoints = this.getStrokePathPoints(this.strokeData.points, {
            size: 10,               // 与实时绘制保持一致的笔触尺寸
            thinning: 0.6,          // 增强压力变化效果
            smoothing: 0.5,         // 保持平滑度
            streamline: 0.5,        // 保持一致的延迟性
            easing: (t) => t * t,   // 二次缓动函数使笔触更自然
            last: true              // 最终完成状态
        });
        
        // 创建最终SkPath
        const finalPath = this.createPath(pathPoints);
        
        if (finalPath) {
            // 将路径添加到table的路径列表
            // 先删除正在绘制中的路径(如果存在)
            if (this.table.drawingPaths && this.table.drawingPaths.length > 0) {
                const lastPath = this.table.drawingPaths[this.table.drawingPaths.length - 1];
                if (lastPath && lastPath.isActive) {
                    this.table.drawingPaths.pop();
                }
            }
            
            // 添加最终路径
            this.table.drawingPaths.push({
                skPath: finalPath,
                paint: this.strokeData.currentPaint,
                isActive: false,  // 标记为非活动路径
                timestamp: Date.now() // 添加时间戳便于后续处理
            });
        }
        
        // 计算绘制时间
        const currentTime = Date.now();
        const strokeTime = currentTime - this.strokeData.lastStrokeTime;
        this.strokeData.totalDrawingTime += strokeTime;
        
        // 重置状态
        this.isActive = false;
        this.strokeData.currentPath = null;
        
        console.log('CanvasPencilTool: 完成笔触', {
            points: this.strokeData.points.length,
            time: strokeTime,
            totalTime: this.strokeData.totalDrawingTime
        });
    }
}
