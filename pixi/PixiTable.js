import * as PIXI from 'pixi.js';
import HitPointer from './HitPointer';
import { updateDebugInfo } from '../debug.jsx';
import PixiPencilTool from '../tools/PixiPencilTool';
import PixiZoomTool from '../tools/PixiZoomTool';
import { convertPointToLocalCoordinates } from './utils';

/**
 * PixiTable 类 - 主要的表格组件
 * 替代原有的 Konva Table 组件
 */
export default class PixiTable {
    /**
     * 创建一个新的 PixiTable 实例
     * @param {string} containerId - 容器元素的 ID
     * @param {Object} options - 表格选项
     * @returns {Promise} - 初始化完成的Promise
     */
    constructor(containerId = 'a4-table', options = {}) {
        // 设置 block 大小 - 使用固定值代替 this.pixel
        this.block = {
            width: 20,  // 固定值 20 (替代 10 * this.pixel)
            height: 20, // 固定值 20 (替代 10 * this.pixel)
        };
        
        // 计算内容大小
        this.width = 240 * this.block.width;
        this.height = 240 * this.block.height;
        
        // 获取容器
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }
        
        console.log('PixiTable constructor', containerId, this.width, this.height);
        
        // 使用Promise处理异步初始化
        return new Promise(async (resolve) => {
            try {
                // 初始化 PIXI 应用
                await this.initApp(container);
                
                // 初始化表格
                this.initTable();
                
                // 初始化工具
                this.initTools();
                
                // 创建光标指示器
                this.initPointer(options.pointerOptions);
                
                // 开始监控 Ticker
                this.monitorTicker();
                
                resolve(this);
            } catch (error) {
                console.error('PixiTable initialization error:', error);
            }
        });
    }
    
    /**
     * 初始化 PIXI 应用
     * @param {HTMLElement} container - 容器元素
     */
    async initApp(container) {
        // 创建 PIXI 应用 - 适配 PixiJS v8
        this.app = new PIXI.Application();
        
        // 使用窗口大小初始化应用 - 在 PixiJS v8 中需要使用 await app.init()
        await this.app.init({
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0xdddddd, // 浅灰色背景
            resolution: 1,
            antialias: true
        });
        
        // 记录舞台尺寸
        this.stageWidth = window.innerWidth;
        this.stageHeight = window.innerHeight;
        
        // 添加到容器 - 在 PixiJS v8 中使用 app.canvas
        container.appendChild(this.app.canvas);
        
        // 创建主要图层
        this.bgLayer = new PIXI.Container(); // 背景层 - 静态内容
        this.contentLayer = new PIXI.Container(); // 内容层 - 动态内容
        this.drawingContainer = new PIXI.Container(); // 绘图层 - 用于绘制笔迹
        this.pointerLayer = new PIXI.Container(); // 指针层 - 专门用于光标指示器
        
        // 添加图层到舞台
        this.app.stage.addChild(this.bgLayer);
        this.app.stage.addChild(this.contentLayer);
        this.app.stage.addChild(this.pointerLayer); // 将指针层添加到最上层
        this.contentLayer.addChild(this.drawingContainer); // 将绘图层添加到内容层中
        
        // 初始化内容位置 - 居中显示内容
        this.centerContent();
        
        // 绘制舞台边框
        this.drawStageBorder();
        
        // 初始化交互管理器
        this.initInteraction();
        
        // 添加窗口大小变化监听
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // 跟踪活动的触摸点
        this.activePointers = new Map();
        
        // 事件监听器
        this.eventListeners = {};
        
        console.log('PixiTable app initialized', {
            width: this.stageWidth,
            height: this.stageHeight,
            resolution: this.app.renderer.resolution,
            devicePixelRatio: window.devicePixelRatio
        });
    }
    
    /**
     * 居中显示内容
     */
    centerContent() {
        // 计算内容应该在舞台中的位置
        const centerX = (this.getScaledStageWidth() - this.width) / 2;
        const centerY = (this.getScaledStageHeight() - this.height) / 2;
        
        // 设置内容层的初始位置
        this.contentLayer.position.set(centerX, centerY);
        this.bgLayer.position.set(centerX, centerY);
        // 指针层不需要居中，它跟随鼠标位置
        
        console.log('Content centered', { centerX, centerY });
    }
    
    /**
     * 获取考虑分辨率的舞台宽度
     * @returns {number} 考虑分辨率的舞台宽度
     */
    getScaledStageWidth() {
        return this.stageWidth / this.app.renderer.resolution;
    }
    
    /**
     * 获取考虑分辨率的舞台高度
     * @returns {number} 考虑分辨率的舞台高度
     */
    getScaledStageHeight() {
        return this.stageHeight / this.app.renderer.resolution;
    }
    
    /**
     * 绘制舞台边框
     * 使用深红色绘制舞台的边界
     */
    drawStageBorder() {
        // 创建一个图形对象用于绘制边框
        const border = new PIXI.Graphics();
        
        // 获取当前分辨率
        const resolution = this.app.renderer.resolution;
        
        // 设置线条样式 - 深红色，宽度为3像素（考虑分辨率）
        const lineWidth = 3;
        border.setStrokeStyle({
            width: lineWidth,
            color: 0x990000, // 深红色
            alignment: 0 // 设置线条对齐方式为居中
        });
        
        // 计算边框内边距，确保边框在视口内
        const padding = Math.max(3, Math.ceil(lineWidth / 2));
        
        // 获取舞台的实际尺寸
        const stageWidth = this.getScaledStageWidth();
        const stageHeight = this.getScaledStageHeight();
        
        // 绘制矩形边框，确保边框完全在舞台内部
        border.rect(padding, padding, stageWidth - padding * 2, stageHeight - padding * 2);
        border.stroke();
        
        // 将边框添加到最顶层
        this.app.stage.addChild(border);
        
        // 保存边框引用，以便后续可能的更新
        this.stageBorder = border;
        
        console.log('Stage border drawn', { 
            width: stageWidth, 
            height: stageHeight,
            resolution: resolution,
            devicePixelRatio: window.devicePixelRatio,
            lineWidth: lineWidth,
            effectiveLineWidth: lineWidth * resolution
        });
    }
    
    /**
     * 初始化交互系统
     */
    initInteraction() {
        // 设置舞台为不接收交互事件
        this.app.stage.eventMode = 'none';
        this.app.stage.hitArea = new PIXI.Rectangle(0, 0, this.app.screen.width, this.app.screen.height);
    }
    
    /**
     * 触发自定义事件
     * @param {string} eventName - 事件名称
     * @param {Object} data - 事件数据
     */
    emit(eventName, data) {
        // 简单的事件系统
        if (this.eventListeners && this.eventListeners[eventName]) {
            this.eventListeners[eventName].forEach(callback => callback(data));
        }
    }
    
    /**
     * 添加事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(eventName, callback) {
        if (!this.eventListeners) {
            this.eventListeners = {};
        }
        
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        
        this.eventListeners[eventName].push(callback);
    }
    
    /**
     * 移除事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(eventName, callback) {
        if (!this.eventListeners || !this.eventListeners[eventName]) {
            return;
        }
        
        if (callback) {
            this.eventListeners[eventName] = this.eventListeners[eventName].filter(cb => cb !== callback);
        } else {
            delete this.eventListeners[eventName];
        }
    }
    
    /**
     * 处理窗口大小变化
     */
    handleResize() {
        this.resize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * 调整渲染器大小
     * @param {number} width - 新宽度
     * @param {number} height - 新高度
     */
    resize(width, height) {
        // 调整渲染器大小 - 在 PixiJS v8 中使用 app.resize
        this.app.resize(width, height);
        
        // 更新尺寸记录
        this.stageWidth = width;
        this.stageHeight = height;
        
        // 重新居中内容
        this.centerContent();
        
        // 更新舞台边框
        if (this.stageBorder) {
            // 获取当前分辨率
            const resolution = this.app.renderer.resolution;
            
            // 清除旧边框
            this.stageBorder.clear();
            
            // 设置线条样式 - 深红色，宽度为3像素
            const lineWidth = 3;
            this.stageBorder.setStrokeStyle({
                width: lineWidth,
                color: 0x990000, // 深红色
                alpha: 1,
                alignment: 0 // 设置线条对齐方式为居中
            });
            
            // 计算边框内边距，确保边框在视口内
            const padding = Math.max(3, Math.ceil(lineWidth / 2));
            
            // 获取舞台的实际尺寸
            const stageWidth = this.getScaledStageWidth();
            const stageHeight = this.getScaledStageHeight();
            
            // 绘制矩形边框，确保边框完全在舞台内部
            this.stageBorder.rect(padding, padding, stageWidth - padding * 2, stageHeight - padding * 2);
            this.stageBorder.stroke();
            
            console.log('Border updated', { 
                width: stageWidth, 
                height: stageHeight, 
                resolution: resolution,
                devicePixelRatio: window.devicePixelRatio,
                lineWidth: lineWidth,
                effectiveLineWidth: lineWidth * resolution
            });
        }
        
        console.log('Renderer resized', { width, height });
    }
    
    /**
     * 初始化光标指示器
     * @param {Object} options - 光标指示器选项
     */
    initPointer(options = {}) {
        // 创建命中指示器，使用专门的指针层
        this.hitPointer = new HitPointer(this.pointerLayer, {
            size: options?.size || 10,
            color: options?.color || 0xFF0000, // 红色
            alpha: 1,
            id: "normal-pointer" // 正常指针的ID
        });
        
        // 创建背景层缩放调试指针，使用更大尺寸和鲜明的蓝色
        this.zoomDebugPointer = new HitPointer(this.bgLayer, {
            size: 20, // 更大的尺寸，使其更加明显
            color: 0x00BFFF, // 亮蓝色 (DeepSkyBlue)
            alpha: 0.8,
            borderColor: 0xFFFFFF, // 白色边框
            borderWidth: 3,
            isDebug: true,
            id: "zoom-debug-pointer" // 缩放调试指针的ID
        });
        
        // 立即显示调试指针在画布中央
        if (this.zoomDebugPointer) {
            this.zoomDebugPointer.update(this.width / 2, this.height / 2, this.app);
        }
        
        // 为了向后兼容，将 hitPointer 也赋值给 pointer
        this.pointer = this.hitPointer;
        
        console.log('Pointers initialized:');
        console.log('- Red pointer: Normal cursor position (follows mouse)');
        console.log('- Blue pointer: Zoom debug point (shows point in background layer)');
    }
    
    /**
     * 更新命中指示器位置
     * @param {PointerEvent} e - 指针事件
     */
    updateHitPointer(e) {
        if (!this.hitPointer) return;
        
        // 获取屏幕坐标（相对于浏览器窗口）
        const screenX = e.clientX;
        const screenY = e.clientY;
        
        // 创建屏幕坐标点对象
        const screenPoint = new PIXI.Point(screenX, screenY);
        
        // 创建用于存储结果的本地坐标点对象
        const localPoint = new PIXI.Point();
        
        // 将点从屏幕坐标系转换为舞台的本地坐标系
        // 这是必要的，因为舞台可能已经进行了缩放、平移等变换
        this.app.stage.worldTransform.applyInverse(screenPoint, localPoint);
        
        // 更新命中指示器位置（使用转换后的本地坐标）
        this.hitPointer.update(localPoint.x, localPoint.y, this.app);
        
        // 如果存在缩放调试指针，则更新它
        if (this.zoomDebugPointer) {
            // 不在这里更新蓝色指针位置，它应该由 PixiZoomTool.wheel 独立控制
            // 这样可以保证它始终显示在鼠标下方对应的背景层位置
        }
    }
    
    /**
     * 更新调试信息
     * @param {Object} info - 调试信息
     */
    updateDebugInfo(info) {
        // 该方法现在由 PixiPointer 类处理
        // 保留此方法是为了兼容性
    }
    
    /**
     * 初始化表格
     * 在 PIXI 应用初始化完成后调用
     */
    initTable() {
        // 创建容器，直接使用 PIXI.Container 替代 PixiLayer
        // 背景层容器
        this.bgContainer = new PIXI.Container();
        this.bgContainer.label = 'background';
        this.bgLayer.addChild(this.bgContainer);
        
        // 网格层容器
        this.gridContainer = new PIXI.Container();
        this.gridContainer.label = 'grid';
        this.bgLayer.addChild(this.gridContainer);
        
        // 纸张层容器
        this.paperContainer = new PIXI.Container();
        this.paperContainer.label = 'paper';
        this.bgLayer.addChild(this.paperContainer);
        
        // 绘图层容器
        this.drawingContainer = new PIXI.Container();
        this.drawingContainer.label = 'drawing';
        this.contentLayer.addChild(this.drawingContainer);
        
        // 工具管理
        this.tools = {};
        this.currentTool = null;
        
        // 初始化表格
        this.drawBackground();
        this.drawGrid();
        this.createPaper();
        
        // 设置事件监听器
        this.setupEventListeners();
        
        console.log('PixiTable initialized');
    }
    
    /**
     * 绘制网格
     */
    drawGrid() {
        // 创建网格容器
        const gridGraphics = new PIXI.Graphics();
        
        // 设置点的样式
        gridGraphics.fill(0x555555); // 深灰色点
        
        // 绘制点阵
        for (let i = 1; i < this.width / this.block.width; i++) {
            for (let j = 1; j < this.height / this.block.height; j++) {
                gridGraphics.circle(
                    i * this.block.width,
                    j * this.block.height,
                    1 // 点的半径
                );
            }
        }
        
        gridGraphics.fill();
        
        // 添加到网格图层
        this.gridContainer.addChild(gridGraphics);
    }
    
    /**
     * 初始化工具
     */
    initTools() {
        // 创建工具
        const pencilTool = new PixiPencilTool(this);
        const zoomTool = new PixiZoomTool(this);
        
        // 注册工具
        this.registerTool('pencil', pencilTool);
        this.registerTool('zoom', zoomTool);
        
        // 设置默认工具为 pencil
        this.setActiveTool('pencil');
        
        // 设置键盘事件监听
        this.setupKeyboardEvents();
    }
    
    /**
     * 设置键盘事件监听
     */
    setupKeyboardEvents() {
        const handleKeyDown = (e) => {
            const zoomTool = this.tools.zoom;
            
            // Escape 键退出缩放模式
            if (e.key === 'Escape' && zoomTool?.isZoomMode) {
                zoomTool.exitZoomMode();
            }
            
            // Z 键切换缩放模式
            if (e.key === 'z' || e.key === 'Z') {
                if (zoomTool?.isZoomMode) {
                    zoomTool.exitZoomMode();
                } else if (zoomTool) {
                    zoomTool.enterZoomMode();
                }
            }
            
            // P 键切换到铅笔工具
            if (e.key === 'p' || e.key === 'P') {
                if (zoomTool?.isZoomMode) {
                    zoomTool.exitZoomMode();
                }
                this.setActiveTool('pencil');
            }
        };

        // 绑定事件处理函数
        document.addEventListener('keydown', handleKeyDown);
        
        // 保存引用以便后续移除
        this._handleKeyDown = handleKeyDown;
    }
    
    /**
     * 绘制背景
     */
    drawBackground() {
        // 创建背景矩形
        const bg = new PIXI.Graphics()
            .setStrokeStyle(4, 0x8B4513)
            .rect(0, 0, this.width, this.height)
            .fill(0xdddddd)
        
        this.bgContainer.addChild(bg);
    }
    
    /**
     * 创建 paper
     */
    createPaper() {
        // 固定 paper 的尺寸，以 16:9 比例
        const paperWidth = 640;
        const paperHeight = 360;
        
        // 计算居中位置
        const x = (this.width - paperWidth) / 2;
        const y = (this.height - paperHeight) / 2;
        
        // 创建 paper 对象
        const paper = new PIXI.Graphics()
            .setStrokeStyle(1, 0x333333)
            .roundRect(x, y, paperWidth, paperHeight, 5)
            .fill(0xffffff);

        // 添加阴影效果
        const paperContainer = new PIXI.Container();
        paperContainer.addChild(paper);
        
        // 创建阴影
        const shadow = new PIXI.Graphics()
            .roundRect(x + 5, y + 5, paperWidth, paperHeight, 5)
            .fill({
                color: 0x000000,
                alpha: 0.2
            });
        
        // 添加模糊滤镜
        const blurFilter = new PIXI.BlurFilter();
        blurFilter.strength = 5;
        shadow.filters = [blurFilter];
        
        // 确保阴影在 paper 下方
        paperContainer.addChildAt(shadow, 0);
        
        // 添加到 paper 图层
        this.paperContainer.addChild(paperContainer);
        
        // 保存 paper 引用
        this.paper = paper;
    }
    
    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 将所有事件监听器绑定到 window 对象上
        window.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        window.addEventListener('pointermove', this.handlePointerMove.bind(this));
        window.addEventListener('pointerup', this.handlePointerUp.bind(this));
        window.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    }
    
    /**
     * 更新设备追踪信息
     * @param {string} eventType - 事件类型
     * @param {Object} event - 事件对象
     */
    updateDeviceTrackerInfo(eventType, event) {
        // 更新调试信息
        let deviceType = event.pointerType || 'unknown';
        let additionalInfo = {};
        
        // 为滚轮事件特殊处理设备类型和信息
        if (eventType === 'wheel') {
            deviceType = 'wheel';
            additionalInfo = {
                deltaMode: event.deltaMode === 0 ? 'PIXEL' : event.deltaMode === 1 ? 'LINE' : 'PAGE',
                deltaX: event.deltaX.toFixed(2),
                deltaY: event.deltaY.toFixed(2),
                deltaZ: event.deltaZ.toFixed(2),
                direction: event.deltaY > 0 ? '向下滚动' : event.deltaY < 0 ? '向上滚动' : '静止',
                ctrlKey: event.ctrlKey,
                altKey: event.altKey,
                shiftKey: event.shiftKey,
                metaKey: event.metaKey
            };
        }
        
        updateDebugInfo('deviceTracker', {
            lastEvent: eventType,
            deviceType: deviceType,
            position: { x: event.clientX, y: event.clientY },
            pressure: event.pressure || 0,
            tiltX: event.tiltX || 0,
            tiltY: event.tiltY || 0,
            timestamp: event.timeStamp,
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            isPrimary: event.isPrimary,
            buttons: event.buttons,
            ...additionalInfo
        });
    }
    
    /**
     * 处理指针按下事件
     * @param {PointerEvent} e - 指针事件
     */
    handlePointerDown(e) {
        // 更新设备追踪信息
        this.updateDeviceTrackerInfo('pointerdown', e);
        
        // 更新光标指示器位置
        this.updateHitPointer(e);
        
        if (this.currentTool) {
            this.currentTool.pointerdown(e);
        }
    }
    
    /**
     * 处理指针移动事件
     * @param {PointerEvent} e - 指针事件
     */
    handlePointerMove(e) {
        // 更新设备追踪信息
        this.updateDeviceTrackerInfo('pointermove', e);

        // 更新命中指示器位置
        this.updateHitPointer(e);
        
        if (this.currentTool) {
            this.currentTool.pointermove(e);
        }
    }
    
    /**
     * 处理指针抬起事件
     * @param {PointerEvent} e - 指针事件
     */
    handlePointerUp(e) {
        // 更新设备追踪信息
        this.updateDeviceTrackerInfo('pointerup', e);
        
        // 更新光标指示器位置
        this.updateHitPointer(e);
        
        if (this.currentTool) {
            this.currentTool.pointerup(e);
        }
    }
    
    /**
     * 处理滚轮事件
     * @param {WheelEvent} e - 滚轮事件
     */
    handleWheel(e) {
        // 更新设备追踪信息
        this.updateDeviceTrackerInfo('wheel', e);
        
        // 处理滚轮缩放
        // 如果按下 Ctrl 键，或者当前工具是缩放工具且处于缩放模式，则进行缩放
        if (e.ctrlKey || (this.tools.zoom && this.tools.zoom.isZoomMode)) {
            // 阻止默认滚动行为
            e.preventDefault();
            
            // 使用缩放工具处理滚轮事件
            if (this.tools.zoom && typeof this.tools.zoom.wheel === 'function') {
                this.tools.zoom.wheel(e);
            }
        } else if (this.currentTool && typeof this.currentTool.wheel === 'function') {
            // 如果当前工具支持滚轮事件，则传递给当前工具处理
            this.currentTool.wheel(e);
        }
        
        // 在缩放后更新光标位置
        this.updateHitPointer(e);
    }
    
    /**
     * 注册工具
     * @param {string} name - 工具名称
     * @param {Object} tool - 工具实例
     */
    registerTool(name, tool) {
        this.tools[name] = tool;
        console.log(`Tool registered: ${name}`);
    }
    
    /**
     * 设置活动工具
     * @param {string} name - 工具名称
     */
    setActiveTool(name) {
        // 停用当前工具
        if (this.currentTool) {
            this.currentTool.deactivate();
        }
        
        // 激活新工具
        this.currentTool = this.tools[name];
        
        if (this.currentTool) {
            this.currentTool.activate();
            console.log(`Active tool set to: ${name}`);
            
            // 更新调试信息
            updateDebugInfo('activeTool', {
                name: name,
                timestamp: Date.now()
            });
        } else {
            console.warn(`Tool not found: ${name}`);
        }
    }
    
    /**
     * 销毁表格
     */
    destroy() {
        // 移除所有事件监听
        window.removeEventListener('pointerdown', this.handlePointerDown);
        window.removeEventListener('pointermove', this.handlePointerMove);
        window.removeEventListener('pointerup', this.handlePointerUp);
        window.removeEventListener('wheel', this.handleWheel);
        window.removeEventListener('resize', this.handleResize);
        
        // 移除键盘事件监听
        if (this._handleKeyDown) {
            document.removeEventListener('keydown', this._handleKeyDown);
        }
        
        // 销毁命中指示器
        if (this.hitPointer) {
            this.hitPointer.destroy();
            this.hitPointer = null;
            this.pointer = null; // 清除指针引用
        }
        
        // 销毁缩放调试指针
        if (this.zoomDebugPointer) {
            this.zoomDebugPointer.destroy();
            this.zoomDebugPointer = null;
        }
        
        // 清理指针容器
        if (this.pointerLayer) {
            this.app.stage.removeChild(this.pointerLayer);
            this.pointerLayer.destroy();
            this.pointerLayer = null;
        }
        
        // 销毁图层
        this.bgContainer.removeChildren();
        this.gridContainer.removeChildren();
        this.paperContainer.removeChildren();
        this.drawingContainer.removeChildren();
        
        // 销毁应用
        this.app.destroy();
        
        console.log('PixiTable destroyed');
    }
    
    /**
     * 监控 Ticker 并更新调试信息
     */
    monitorTicker() {
        if (!this.app || !this.app.ticker) return;
        
        const ticker = this.app.ticker;
        
        // 获取渲染器信息
        const renderer = this.app.renderer;
        const rendererInfo = {
            type: renderer.type,
            backend: renderer.context?.type || '未知',
            contextId: renderer.context?.contextId || '未知',
            gpu: renderer.context?.gpu?.info?.renderer || '未知',
            isWebGL: renderer.context?.isWebGL || false,
            isWebGPU: renderer.context?.isWebGPU || false
        };
        
        // 更新渲染器信息
        updateDebugInfo('renderer', rendererInfo);
        
        // 创建一个计数器和时间记录
        let frameCount = 0;
        let lastTime = performance.now();
        
        // 每帧更新调试信息
        ticker.add(() => {
            frameCount++;
            
            // 每秒更新一次 FPS 信息
            const now = performance.now();
            if (now - lastTime >= 500) { // 每 0.5 秒更新一次
                const fps = Math.round(frameCount * 1000 / (now - lastTime));
                
                // 更新调试信息
                updateDebugInfo('ticker', {
                    fps: fps,
                    targetFPS: ticker.maxFPS || '不限制',
                    deltaTime: ticker.deltaTime.toFixed(2),
                    deltaMS: ticker.deltaMS.toFixed(2),
                    speed: ticker.speed,
                    active: ticker.started ? '运行中' : '已停止'
                });
                
                // 重置计数器
                frameCount = 0;
                lastTime = now;
            }
        });
        
        // 初始化调试信息
        updateDebugInfo('ticker', {
            fps: 0,
            targetFPS: ticker.maxFPS || '不限制',
            deltaTime: 0,
            deltaMS: 0,
            speed: ticker.speed,
            active: ticker.started ? '运行中' : '已停止'
        });
        
        console.log('Ticker 监控已启动');
    }
}