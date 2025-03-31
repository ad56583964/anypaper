import { getStroke } from '../lib/perfect-freehand/packages/perfect-freehand/src';

/**
 * CanvasPencilTool u7c7b - u5904u7406u7ed8u56feu529fu80fd
 * u4f7fu7528CanvasKitu66ffu4ee3u539fu6709u7684Pixi.jsu5b9eu73b0
 */
export default class CanvasPencilTool {
    /**
     * u521bu5efau4e00u4e2au65b0u7684CanvasPencilToolu5b9eu4f8b
     * @param {CanvasTable} table - u8868u683cu5b9eu4f8b
     */
    constructor(table, options) {
        this.table = table;
        this.CanvasKit = table.CanvasKit;
        this.isActive = false;
        
        // u521du59cbu5316u7b14u89e6u6837u5f0f
        this.initStrokeStyles();
        
        // u521du59cbu5316u7b14u89e6u6570u636e
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

        // u5141u8bb8u7684u8f93u5165u8bbeu5907u7c7bu578b
        this.allowedInputTypes = ['mouse', 'pen'];
        
        console.log('CanvasPencilTool initialized');
    }
    
    /**
     * u521du59cbu5316u7b14u89e6u6837u5f0f
     */
    initStrokeStyles() {
        // u521bu5efaSkPaintu5bf9u8c61u7528u4e8eu7ed8u5236u7b14u89e6
        this.defaultPaint = new this.CanvasKit.Paint();
        this.defaultPaint.setColor(this.CanvasKit.Color4f(0, 0, 0, 1.0)); // u9ed1u8272
        this.defaultPaint.setAntiAlias(true);
        this.defaultPaint.setStyle(this.CanvasKit.PaintStyle.Fill);
        this.defaultPaint.setStrokeJoin(this.CanvasKit.StrokeJoin.Round);
        this.defaultPaint.setStrokeCap(this.CanvasKit.StrokeCap.Round);
    }
    
    /**
     * u68c0u67e5u70b9u662fu5426u5728paperu8303u56f4u5185
     * @param {number} x - Xu5750u6807
     * @param {number} y - Yu5750u6807
     * @returns {boolean} - u662fu5426u5728paperu8303u56f4u5185
     */
    isPointInPaper(x, y) {
        if (!this.table.paper) {
            return false;
        }
        
        // u4f7fu7528Paperu7684u65b9u6cd5u68c0u67e5u70b9u662fu5426u5728u7eb8u5f20u5185u90e8
        return this.table.paper.isPointInside(x, y);
    }
    
    /**
     * u68c0u67e5u8f93u5165u8bbeu5907u662fu5426u88abu5141u8bb8
     * @param {PointerEvent} e - u6307u9488u4e8bu4ef6
     * @returns {boolean} - u662fu5426u5141u8bb8u8be5u8f93u5165u8bbeu5907
     */
    isInputAllowed(e) {
        return this.allowedInputTypes.includes(e.pointerType);
    }
    
    /**
     * u83b7u53d6u5f62u6210u7b14u89e6u8defu5f84u7684u70b9
     * @param {Array} points - u8f93u5165u70b9u6570u7ec4
     * @param {Object} options - u9009u9879
     * @returns {Array} u8f93u51fau70b9u6570u7ec4uff0cu7528u4e8eu521bu5efaSkPath
     */
    getStrokePathPoints(points, options = {}) {
        // u9ed8u8ba4u9009u9879
        const defaultOptions = {
            size: 8,
            thinning: 0.5,
            smoothing: 0.5,
            streamline: 0.5,
            easing: (t) => t,
            simulatePressure: true,
            last: false
        };
        
        // u5408u5e76u9009u9879
        const mergedOptions = {...defaultOptions, ...options};
        
        // u4f7fu7528perfect-freehandu83b7u53d6u7b14u89e6u8f68u8ff9u5916u8f6eu5ed3u8defu5f84
        const outlinePoints = getStroke(points, mergedOptions);
        
        if (!outlinePoints || outlinePoints.length < 2) return [];
        
        // u8fd4u56deu5f62u6210u8defu5f84u7684u70b9
        return outlinePoints;
    }
    
    /**
     * u521bu5efaSkPathu8defu5f84
     * @param {Array} pathPoints - u8defu5f84u70b9u6570u7ec4
     * @returns {SkPath} - CanvasKitu8defu5f84u5bf9u8c61
     */
    createPath(pathPoints) {
        if (!pathPoints || pathPoints.length < 2) {
            return null;
        }
        
        // u521bu5efau65b0u7684SkPath
        const path = new this.CanvasKit.Path();
        
        // u79fbu52a8u5230u7b2cu4e00u4e2au70b9
        path.moveTo(pathPoints[0][0], pathPoints[0][1]);
        
        // u8fdeu63a5u6240u6709u5176u4ed6u70b9
        for (let i = 1; i < pathPoints.length; i++) {
            path.lineTo(pathPoints[i][0], pathPoints[i][1]);
        }
        
        // u95edu5408u8defu5f84
        path.close();
        
        return path;
    }
    
    /**
     * u521bu5efau7b14u89e6u7684SkPaint
     * @param {Object} options - u7b14u89e6u9009u9879
     * @returns {SkPaint} - CanvasKitu753bu7b14u5bf9u8c61
     */
    createStrokePaint(options = {}) {
        // u590du5236u9ed8u8ba4u7b14u89e6u6837u5f0f
        const paint = this.defaultPaint.copy();
        
        // u8bbeu7f6eu989cu8272
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
     * u6fc0u6d3bu5de5u5177
     */
    activate() {
        // u6fc0u6d3bu7ed8u56feu5de5u5177
        console.log('CanvasPencilTool activated');
    }
    
    /**
     * u505cu7528u5de5u5177
     */
    deactivate() {
        console.log('CanvasPencilTool deactivated');
        
        // u7ed3u675fu8fdbu884cu4e2du7684u7ed8u5236
        if (this.isActive) {
            this.finishStroke();
        }
    }
    
    /**
     * u5904u7406u6307u9488u6309u4e0bu4e8bu4ef6
     * @param {PointerEvent} e - u6307u9488u4e8bu4ef6
     */
    pointerdown(e) {
        // u68c0u67e5u8f93u5165u8bbeu5907u662fu5426u88abu5141u8bb8
        if (!this.isInputAllowed(e)) {
            console.log('CanvasPencilTool: u4e0du5141u8bb8u4f7fu7528u624bu6307u89e6u6478u8fdbu884cu7ed8u5236');
            return;
        }

        // u5c06u5ba2u6237u7aefu5750u6807u8f6cu6362u4e3au753bu5e03u5750u6807
        const x = e.clientX;
        const y = e.clientY;
        
        // u5e94u7528u53cdu5411u53d8u6362u77e9u9635u83b7u53d6u5185u5bb9u5c42u5750u6807
        const localPoint = this.viewToContentCoordinates(x, y);
        
        // u68c0u67e5u662fu5426u5728paperu8303u56f4u5185
        if (!this.isPointInPaper(localPoint.x, localPoint.y)) {
            console.log('CanvasPencilTool: u53eau80fdu5728paperu8303u56f4u5185u5f00u59cbu7ed8u5236');
            return;
        }

        // u5982u679cu5df2u7ecfu5728u7ed8u5236u4e2duff0cu5148u7ed3u675fu5f53u524du7b14u753b
        if (this.isActive) {
            this.finishStroke();
        }
        
        // u5f00u59cbu65b0u7684u7b14u753b
        this.startStroke(localPoint.x, localPoint.y, e.pressure || 0.5);
    }
    
    /**
     * u5904u7406u6307u9488u79fbu52a8u4e8bu4ef6
     * @param {PointerEvent} e - u6307u9488u4e8bu4ef6
     */
    pointermove(e) {
        // u68c0u67e5u8f93u5165u8bbeu5907u662fu5426u88abu5141u8bb8
        if (!this.isInputAllowed(e)) {
            return;
        }

        if (!this.isActive) return;
        
        // u5c06u5ba2u6237u7aefu5750u6807u8f6cu6362u4e3au753bu5e03u5750u6807
        const x = e.clientX;
        const y = e.clientY;
        
        // u5e94u7528u53cdu5411u53d8u6362u77e9u9635u83b7u53d6u5185u5bb9u5c42u5750u6807
        const localPoint = this.viewToContentCoordinates(x, y);
        
        // u66f4u65b0u7b14u753b
        this.updateStroke(localPoint.x, localPoint.y, e.pressure || 0.5);
    }
    
    /**
     * u5904u7406u6307u9488u62acu8d77u4e8bu4ef6
     * @param {PointerEvent} e - u6307u9488u4e8bu4ef6
     */
    pointerup(e) {
        if (!this.isActive) return;
        
        // u5b8cu6210u7b14u753b
        this.finishStroke();
    }
    
    /**
     * u5c06u89c6u56feu5750u6807u8f6cu6362u4e3au5185u5bb9u5750u6807
     * @param {number} viewX - u89c6u56fe X u5750u6807
     * @param {number} viewY - u89c6u56fe Y u5750u6807
     * @returns {Object} u5185u5bb9u5c42u5750u6807
     */
    viewToContentCoordinates(viewX, viewY) {
        // u83b7u53d6u5f53u524du53d8u6362u4fe1u606f
        const { scale, translateX, translateY } = this.table.transform;
        
        // u8ba1u7b97u5c45u4e2du504fu79fb
        const centerX = (this.table.stageWidth - this.table.width * scale) / 2;
        const centerY = (this.table.stageHeight - this.table.height * scale) / 2;
        
        // u8ba1u7b97u5b9eu9645u5e73u79fb
        const actualTranslateX = centerX + translateX;
        const actualTranslateY = centerY + translateY;
        
        // u5e94u7528u53cdu5411u53d8u6362
        const contentX = (viewX - actualTranslateX) / scale;
        const contentY = (viewY - actualTranslateY) / scale;
        
        return { x: contentX, y: contentY };
    }
    
    /**
     * u5f00u59cbu65b0u7684u7b14u753b
     * @param {number} x - Xu5750u6807
     * @param {number} y - Yu5750u6807
     * @param {number} pressure - u538bu529bu503c(0-1)
     */
    startStroke(x, y, pressure) {
        this.isActive = true;
        
        // u521du59cbu5316u7b14u89e6u6570u636e
        this.strokeData.points = [[x, y, pressure]];
        this.strokeData.pressure = [pressure];
        this.strokeData.lastPoint = { x, y };
        this.strokeData.lastStrokeTime = Date.now();
        
        // u521bu5efaSkPaint
        this.strokeData.currentPaint = this.createStrokePaint({
            color: 0x000000,  // u9ed1u8272
            opacity: 1.0
        });
        
        console.log('CanvasPencilTool: u5f00u59cbu7b14u89e6', { x, y, pressure });
    }
    
    /**
     * u66f4u65b0u7b14u753b
     * @param {number} x - Xu5750u6807
     * @param {number} y - Yu5750u6807
     * @param {number} pressure - u538bu529bu503c(0-1)
     */
    updateStroke(x, y, pressure) {
        if (!this.isActive) return;
        
        // u6dfbu52a0u65b0u70b9
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
