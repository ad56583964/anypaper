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
        // 默认选项
        const defaultOptions = {
            size: 8,
            thinning: 0.5,
            smoothing: 0.5,
            streamline: 0.5,
            easing: (t) => t,
            simulatePressure: true,
            last: false
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
     * @param {Array} pathPoints - 路径点数组
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
        
        // 连接所有其他点
        for (let i = 1; i < pathPoints.length; i++) {
            path.lineTo(pathPoints[i][0], pathPoints[i][1]);
        }
        
        // 闭合路径
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
        
        // u66f4u65b0u7ed8u5236u6570u636e
        this.updateDrawPath();
    }
    
    /**
     * u66f4u65b0u7ed8u5236u8defu5f84
     */
    updateDrawPath() {
        // u4f7fu7528perfect-freehandu751fu6210u7b14u89e6u5916u8f6eu5ed3
        const pathPoints = this.getStrokePathPoints(this.strokeData.points, {
            size: 8,
            thinning: 0.5,
            smoothing: 0.5,
            streamline: 0.5,
            last: false
        });
        
        // u521bu5efaSkPath
        const skPath = this.createPath(pathPoints);
        
        if (skPath) {
            // u5b58u50a8u5f53u524du8defu5f84
            this.strokeData.currentPath = skPath;
            
            // u5c06u8defu5f84u6dfbu52a0u5230tableu7684u8defu5f84u5217u8868
            // u5148u5220u9664u6b63u5728u7ed8u5236u4e2du7684u8defu5f84(u5982u679cu5b58u5728)
            if (this.table.drawingPaths && this.table.drawingPaths.length > 0) {
                const lastPath = this.table.drawingPaths[this.table.drawingPaths.length - 1];
                if (lastPath && lastPath.isActive) {
                    this.table.drawingPaths.pop();
                }
            }
            
            // u6dfbu52a0u65b0u8defu5f84
            this.table.drawingPaths.push({
                skPath,
                paint: this.strokeData.currentPaint,
                isActive: true
            });
        }
    }
    
    /**
     * u5b8cu6210u7b14u753b
     */
    finishStroke() {
        if (!this.isActive) return;
        
        // u66f4u65b0u7ed8u5236u6570u636euff0cu4f20u5165last=trueu4f7fu7528perfect-freehandu751fu6210u6700u7ec8u6548u679c
        const pathPoints = this.getStrokePathPoints(this.strokeData.points, {
            size: 8,
            thinning: 0.5,
            smoothing: 0.5,
            streamline: 0.5,
            last: true
        });
        
        // u521bu5efau6700u7ec8SkPath
        const finalPath = this.createPath(pathPoints);
        
        if (finalPath) {
            // u5c06u8defu5f84u6dfbu52a0u5230tableu7684u8defu5f84u5217u8868
            // u5148u5220u9664u6b63u5728u7ed8u5236u4e2du7684u8defu5f84(u5982u679cu5b58u5728)
            if (this.table.drawingPaths && this.table.drawingPaths.length > 0) {
                const lastPath = this.table.drawingPaths[this.table.drawingPaths.length - 1];
                if (lastPath && lastPath.isActive) {
                    this.table.drawingPaths.pop();
                }
            }
            
            // u6dfbu52a0u6700u7ec8u8defu5f84
            this.table.drawingPaths.push({
                skPath: finalPath,
                paint: this.strokeData.currentPaint,
                isActive: false  // u6807u8bb0u4e3au975eu6d3bu52a8u8defu5f84
            });
        }
        
        // u8ba1u7b97u7ed8u5236u65f6u95f4
        const currentTime = Date.now();
        const strokeTime = currentTime - this.strokeData.lastStrokeTime;
        this.strokeData.totalDrawingTime += strokeTime;
        
        // u91cdu7f6eu72b6u6001
        this.isActive = false;
        this.strokeData.currentPath = null;
        
        console.log('CanvasPencilTool: u5b8cu6210u7b14u89e6', {
            points: this.strokeData.points.length,
            time: strokeTime,
            totalTime: this.strokeData.totalDrawingTime
        });
    }
}
