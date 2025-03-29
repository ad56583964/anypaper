import * as PIXI from 'pixi.js';
import HitPointer from './HitPointer.js';
import { updateDebugInfo } from '../debug.jsx';
import Paper from './paper.js';
import PixiPencilTool from '../tools/PixiPencilTool.js';
import PixiZoomTool from '../tools/PixiZoomTool.js';
import { convertPointToLocalCoordinates } from './utils';

/**
 * Table 类 - 主要的表格组件
 * 替代原有的 Konva Table 组件
 */
export default class Table {
    /**
     * 创建一个新的 Table 实例
     * @param {string} containerId - 容器元素的 ID
     * @param {Object} options - 表格选项
     * @returns {Promise} - 初始化完成的Promise
     */
    constructor(containerId = 'a4-table', options = {}) {
        // 禁用整个文档的右键菜单
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        // 设置 block 大小 - 使用固定值代替 this.pixel
        this.block = {
            width: 40,  // 固定值 20 (替代 10 * this.pixel)
            height: 40, // 固定值 20 (替代 10 * this.pixel)
        };
        
        // 平移状态
        this.panning = {
            active: false,
            startX: 0,
            startY: 0,
            lastX: 0,
            lastY: 0,
            touchStartTime: 0, // 触摸开始时间
            touchStartDistance: 0, // 触摸开始时的移动距离
            canStartPanning: false, // 是否可以开始平移
            isRightSide: false, // 是否从右半屏开始
            accumulatedDx: 0, // 累积的x方向移动
            accumulatedDy: 0  // 累积的y方向移动
        };
        
        // 固定 paper 的尺寸，以 4:3 比例 - 保留属性以便兼容旧代码
        this.paperWidth = 3840;
        this.paperHeight = 2880;
        
        // 计算内容大小
        this.width = 240 * this.block.width;
        this.height = 240 * this.block.height;
        
        // 获取容器
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }
        
        console.log('Table constructor', containerId, this.width, this.height);
        
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
                console.error('Table initialization error:', error);
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
            antialias: true,
            resizeTo: window // 自动监听窗口大小变化并调整
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
        
        // 添加窗口大小变化监听 - 两种方式同时监听以确保可靠性
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // 当 PixiJS 应用自己调整大小时也触发我们的处理
        this.app.renderer.on('resize', (width, height) => {
            console.log('PixiJS 应用内部 resize 事件', { width, height });
            this.stageWidth = width;
            this.stageHeight = height;
            this.centerViewOnPaper();
            if (this.stageBorder) {
                this.updateStageBorder();
            }
        });
        
        // 跟踪活动的触摸点
        this.activePointers = new Map();
        
        // 事件监听器
        this.eventListeners = {};
        
        console.log('Table app initialized', {
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
        
        console.log('绘制舞台边框: 计算的舞台尺寸', {
            stageWidth,
            stageHeight,
            paddedWidth: stageWidth - padding * 2,
            paddedHeight: stageHeight - padding * 2,
            padding
        });
        
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
            effectiveLineWidth: lineWidth * resolution,
            canvasWidth: this.app.canvas?.width,
            canvasHeight: this.app.canvas?.height
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
        const width = window.innerWidth;
        const height = window.innerHeight;
        console.log('Window resize 检测到窗口大小变化', { width, height });
        this.resize(width, height);
    }
    
    /**
     * 调整渲染器大小
     * @param {number} width - 新宽度
     * @param {number} height - 新高度
     */
    resize(width, height) {
        console.log('开始调整大小', { width, height });
        
        // 确保 canvas 尺寸也被更新
        if (this.app.canvas) {
            this.app.canvas.style.width = width + 'px';
            this.app.canvas.style.height = height + 'px';
        }
        
        // 调整渲染器大小 - 在 PixiJS v8 中使用 app.resize
        this.app.resize(width, height);
        
        // 更新尺寸记录
        this.stageWidth = width;
        this.stageHeight = height;
        
        // 调整视口，使 Paper 居中显示
        this.centerViewOnPaper();
        
        // 更新舞台边框
        if (this.stageBorder) {
            this.updateStageBorder();
        }
        
        console.log('Renderer resized', { 
            width, 
            height,
            canvasWidth: this.app.canvas?.width,
            canvasHeight: this.app.canvas?.height,
            viewWidth: this.app.renderer?.width,
            viewHeight: this.app.renderer?.height
        });
    }
    
    /**
     * 初始化光标指示器
     * @param {Object} options - 光标指示器选项
     */
    initPointer(options = {}) {
        // 创建命中指示器，使用专门的指针层
        this.hitPointer = new HitPointer(this.pointerLayer, {
            size: options?.size || 3,
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
        
        // 初始化时隐藏调试指针
        if (this.zoomDebugPointer) {
            this.zoomDebugPointer._hitpointer.visible = false;
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
     */
    initTable() {
        // 创建各个容器
        this.gridContainer = new PIXI.Container();
        this.gridContainer.label = 'grid';
        this.bgContainer = new PIXI.Container();
        this.bgContainer.label = 'bg';
        
        // 将容器添加到图层
        this.bgLayer.addChild(this.bgContainer);
        this.bgLayer.addChild(this.gridContainer);
        
        // 绘制背景
        this.drawBackground();
        
        // 绘制网格
        this.drawGrid();
        
        // 初始化 Paper
        this.initPaper();
        
        // 设置事件监听器
        this.setupEventListeners();
        
        // 初始化工具注册表
        this.tools = {};
        this.activeTool = null;
        
        console.log('Table initialized');
    }
    
    /**
     * 初始化 Paper
     */
    initPaper() {
        // 创建 Paper 实例
        this.paper = new Paper(this, {
            width: this.paperWidth,
            height: this.paperHeight
        });
        
        // 暴露 paperContainer 以维持向后兼容
        this.paperContainer = this.paper.paperContainer;
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
                    2 // 点的半径
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
        
        // 设置默认缩放值为 0.5
        zoomTool.setScale(0.5);
        
        // 调整视口，使 Paper 居中显示
        this.centerViewOnPaper();
        
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
     * 设置事件监听器
     */
    setupEventListeners() {
        // 获取容器元素
        const container = document.getElementById('a4-table');
        
        // 添加指针事件监听
        container.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        container.addEventListener('pointermove', this.handlePointerMove.bind(this));
        container.addEventListener('pointerup', this.handlePointerUp.bind(this));
        container.addEventListener('pointercancel', this.handlePointerUp.bind(this));
        container.addEventListener('pointerleave', this.handlePointerUp.bind(this));
        
        // 添加触摸事件，防止浏览器默认行为（如缩放）
        container.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        container.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        
        // 添加滚轮事件监听
        container.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        
        // 设置键盘事件监听
        this.setupKeyboardEvents();
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

        // 获取 stage 坐标
        const screenPoint = new PIXI.Point(event.clientX, event.clientY);
        const stagePoint = new PIXI.Point();
        this.app.stage.worldTransform.applyInverse(screenPoint, stagePoint);
        
        // 获取相对于 bgLayer 的坐标
        const tablePoint = this.bgLayer.toLocal(stagePoint);
        
        updateDebugInfo('deviceTracker', {
            lastEvent: eventType,
            deviceType: deviceType,
            position: { x: event.clientX, y: event.clientY },
            stagePosition: { x: stagePoint.x, y: stagePoint.y },
            tablePosition: { x: tablePoint.x, y: tablePoint.y },
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
        // 将指针事件添加到活动指针集合中
        this.activePointers.set(e.pointerId, {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            type: e.pointerType
        });
        
        // 更新调试信息
        this.updateDeviceTrackerInfo('pointerdown', e);
        
        // 更新红色指针位置
        this.updateHitPointer(e);
        
        // 如果是触摸设备的第二个手指，且正在平移
        if (e.pointerType === 'touch' && this.activePointers.size === 2 && this.panning.active) {
            // 停止平移
            this.panning.active = false;
            this.panning.canStartPanning = false;
            
            // 获取缩放工具实例
            const zoomTool = this.tools['zoom'];
            if (zoomTool) {
                console.log('从平移切换到缩放模式');
                // 直接调用缩放工具的事件处理
                return zoomTool.pointerdown(e);
            }
        }
        
        // 如果是触摸设备的单指操作
        if (e.pointerType === 'touch' && this.activePointers.size === 1) {
            // 记录触摸开始时间和位置
            this.panning.touchStartTime = Date.now();
            this.panning.startX = e.clientX;
            this.panning.startY = e.clientY;
            this.panning.lastX = e.clientX;
            this.panning.lastY = e.clientY;
            this.panning.touchStartDistance = 0;
            this.panning.accumulatedDx = 0;
            this.panning.accumulatedDy = 0;
            this.panning.canStartPanning = true; // 允许开始平移
        }
        
        // 如果是鼠标右键，启用平移模式
        if (e.button === 2) {
            e.preventDefault(); // 阻止默认右键菜单
            this.panning.active = true;
            this.panning.lastX = e.clientX;
            this.panning.lastY = e.clientY;
            return;
        }
        
        // 特殊处理：检查是否有两个手指，如果是则优先使用缩放工具
        // 无论当前是什么工具模式，都允许双指缩放
        if (this.activePointers.size === 2 && e.pointerType === 'touch') {
            // 获取缩放工具实例
            const zoomTool = this.tools['zoom'];
            if (zoomTool) {
                console.log('检测到双指触摸，切换到缩放模式');
                // 直接调用缩放工具的事件处理
                return zoomTool.pointerdown(e);
            }
        }
        
        // 如果有活动工具，将事件传递给工具
        if (this.activeTool) {
            this.activeTool.pointerdown(e);
        }
    }
    
    /**
     * 处理指针移动事件
     * @param {PointerEvent} e - 指针事件
     */
    handlePointerMove(e) {
        // 更新活动指针位置
        if (this.activePointers.has(e.pointerId)) {
            const pointer = this.activePointers.get(e.pointerId);
            pointer.x = e.clientX;
            pointer.y = e.clientY;
        }
        
        // 更新调试信息
        this.updateDeviceTrackerInfo('pointermove', e);
        
        // 更新红色指针位置（仅追踪移动中的指针）
        this.updateHitPointer(e);
        
        // 如果是触摸设备的第二个手指，且正在平移
        if (e.pointerType === 'touch' && this.activePointers.size === 2 && this.panning.active) {
            // 停止平移
            this.panning.active = false;
            this.panning.canStartPanning = false;
            
            // 获取缩放工具实例
            const zoomTool = this.tools['zoom'];
            if (zoomTool) {
                console.log('从平移切换到缩放模式');
                // 直接调用缩放工具的事件处理
                return zoomTool.pointermove(e);
            }
        }
        
        // 如果是触摸设备的单指操作
        if (e.pointerType === 'touch' && this.activePointers.size === 1) {
            const dx = e.clientX - this.panning.lastX;
            const dy = e.clientY - this.panning.lastY;
            const currentTime = Date.now();
            
            // 更新累积移动距离
            if (!this.panning.active) {
                this.panning.accumulatedDx += dx;
                this.panning.accumulatedDy += dy;
                const totalDistance = Math.sqrt(
                    this.panning.accumulatedDx * this.panning.accumulatedDx + 
                    this.panning.accumulatedDy * this.panning.accumulatedDy
                );
                
                // 检查是否在触摸开始后200ms内
                const timeSinceStart = currentTime - this.panning.touchStartTime;
                const isQuickMove = timeSinceStart <= 500; // 200ms内的移动被认为是平移意图
                
                // 如果在200ms内移动超过20像素，则激活平移
                if (totalDistance > 20 && isQuickMove && this.panning.canStartPanning) {
                    this.panning.active = true;
                    // 应用累积的移动距离
                    this.contentLayer.position.x += this.panning.accumulatedDx;
                    this.contentLayer.position.y += this.panning.accumulatedDy;
                    this.bgLayer.position.x += this.panning.accumulatedDx;
                    this.bgLayer.position.y += this.panning.accumulatedDy;
                } else if (!isQuickMove) {
                    // 如果超过200ms还没有激活平移，则取消平移意图
                    this.panning.canStartPanning = false;
                }
            }
            
            // 如果已经激活平移，则正常处理移动
            if (this.panning.active) {
                this.contentLayer.position.x += dx;
                this.contentLayer.position.y += dy;
                this.bgLayer.position.x += dx;
                this.bgLayer.position.y += dy;
            }
            
            // 更新上一次的位置
            this.panning.lastX = e.clientX;
            this.panning.lastY = e.clientY;
        }
        
        // 如果正在平移，处理平移逻辑
        if (this.panning.active) {
            const dx = e.clientX - this.panning.lastX;
            const dy = e.clientY - this.panning.lastY;
            
            // 更新内容层和背景层的位置
            this.contentLayer.position.x += dx;
            this.contentLayer.position.y += dy;
            this.bgLayer.position.x += dx;
            this.bgLayer.position.y += dy;
            
            // 更新上一次的位置
            this.panning.lastX = e.clientX;
            this.panning.lastY = e.clientY;
            
            return; // 如果正在平移，不执行其他操作
        }
        
        // 特殊处理：如果有两个或更多的手指，优先把事件传递给缩放工具
        if (this.activePointers.size >= 2 && e.pointerType === 'touch') {
            const zoomTool = this.tools['zoom'];
            if (zoomTool && zoomTool.touch.isZooming) {
                return zoomTool.pointermove(e);
            }
        }
        
        // 如果有活动工具，将事件传递给工具
        if (this.activeTool) {
            this.activeTool.pointermove(e);
        }
    }
    
    /**
     * 处理指针抬起事件
     * @param {PointerEvent} e - 指针事件
     */
    handlePointerUp(e) {
        // 更新调试信息
        this.updateDeviceTrackerInfo('pointerup', e);
        
        // 移除活动指针
        this.activePointers.delete(e.pointerId);
        
        // 如果是触摸设备的单指操作
        if (e.pointerType === 'touch') {
            const endTime = Date.now();
            const touchDuration = endTime - this.panning.touchStartTime;
            
            // 如果触摸时间小于300ms且移动距离小于10像素，认为是点击
            if (touchDuration < 300 && this.panning.touchStartDistance < 10) {
                // 处理点击事件
                if (this.activeTool) {
                    this.activeTool.pointerdown(e);
                    this.activeTool.pointerup(e);
                }
            }
        }
        
        // 如果正在平移，停止平移
        if (this.panning.active) {
            this.panning.active = false;
            if (e.pointerType === 'touch') {
                // 重置触摸相关状态
                this.panning.touchStartTime = 0;
                this.panning.touchStartDistance = 0;
            }
            return;
        }
        
        // 特殊处理：如果正在进行缩放操作，优先将事件传递给缩放工具
        if (e.pointerType === 'touch') {
            const zoomTool = this.tools['zoom'];
            if (zoomTool && zoomTool.touch.isZooming) {
                // 先处理缩放工具的事件
                const result = zoomTool.pointerup(e);
                // 从活动指针集合中移除该指针
                this.activePointers.delete(e.pointerId);
                return result;
            }
        }
        
        // 从活动指针集合中移除该指针
        this.activePointers.delete(e.pointerId);
        
        // 如果有活动工具，将事件传递给工具
        if (this.activeTool) {
            this.activeTool.pointerup(e);
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
        } else if (this.activeTool && typeof this.activeTool.wheel === 'function') {
            // 如果当前工具支持滚轮事件，则传递给当前工具处理
            this.activeTool.wheel(e);
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
        if (this.activeTool) {
            this.activeTool.deactivate();
        }
        
        // 激活新工具
        this.activeTool = this.tools[name];
        
        if (this.activeTool) {
            this.activeTool.activate();
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
     * 清空表格
     */
    clear() {
        // 移除绘制的内容
        if (this.drawingContainer) {
            this.drawingContainer.removeChildren();
        }
        
        // 清除 paper 内容
        if (this.paper) {
            this.paper.clear();
        }
        
        console.log('Table cleared');
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
        
        console.log('Table destroyed');
    }
    
    /**
     * 监控 Ticker 并更新调试信息
     */
    monitorTicker() {
        if (!this.app || !this.app.ticker) return;
        
        const ticker = this.app.ticker;
        
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
    
    /**
     * 绘制 bgLayer 的边框
     */
    drawBgLayerBorder() {
        const border = new PIXI.Graphics();
        
        // 设置线条样式 - 深灰色，宽度为2像素
        border.setStrokeStyle({
            width: 5,
            color: 0x444444, // 深灰色
            alignment: 0 // 设置线条对齐方式为居中
        });
        
        // 绘制矩形边框，紧贴 bgLayer 的边界
        border.rect(0, 0, this.width, this.height);
        border.stroke();
        
        // 将边框添加到 bgLayer
        this.bgLayer.addChild(border);
        
        console.log('bgLayer border drawn');
    }
    
    /**
     * 调整视口使 Paper 居中显示
     * 在缩放后调用此方法可以确保 Paper 在视图中居中
     */
    centerViewOnPaper() {
        if (this.paper) {
            this.paper.centerInView();
        }
    }
    
    /**
     * 更新舞台边框
     * 当舞台大小变化时调用
     */
    updateStageBorder() {
        if (!this.stageBorder) return;
        
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
        
        console.log('更新舞台边框: 计算的舞台尺寸', {
            stageWidth,
            stageHeight,
            paddedWidth: stageWidth - padding * 2,
            paddedHeight: stageHeight - padding * 2,
            padding
        });
        
        // 绘制矩形边框，确保边框完全在舞台内部
        this.stageBorder.rect(padding, padding, stageWidth - padding * 2, stageHeight - padding * 2);
        this.stageBorder.stroke();
        
        console.log('舞台边框已更新', {
            width: stageWidth,
            height: stageHeight,
            resolution: resolution,
            devicePixelRatio: window.devicePixelRatio,
            canvasWidth: this.app.canvas?.width,
            canvasHeight: this.app.canvas?.height
        });
    }
}