import * as PIXI from 'pixi.js';

/**
 * PixiRenderer 类 - PixiJS 渲染的核心
 * 负责创建和管理 PIXI 应用、图层和交互
 */
export default class PixiRenderer {
    /**
     * 创建一个新的 PixiRenderer 实例
     * @param {string} containerId - 容器元素的 ID
     * @param {number} contentWidth - 内容宽度
     * @param {number} contentHeight - 内容高度
     */
    constructor(containerId, contentWidth, contentHeight) {
        // 获取容器
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }
        
        // 记录内容尺寸
        this.contentWidth = contentWidth;
        this.contentHeight = contentHeight;
        
        // 创建 PIXI 应用 - 适配 PixiJS v8
        this.app = new PIXI.Application();
        
        // 创建初始化完成的Promise
        this.initPromise = this.initApp(container);
        
        // 跟踪活动的触摸点
        this.activePointers = new Map();
        
        console.log('PixiRenderer initialized', { 
            contentWidth, 
            contentHeight,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
        });
    }
    
    /**
     * 初始化 PIXI 应用
     * @param {HTMLElement} container - 容器元素
     */
    async initApp(container) {
        // 使用窗口大小初始化应用 - 在 PixiJS v8 中需要使用 await app.init()
        await this.app.init({
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0xdddddd, // 浅灰色背景
            resolution: window.devicePixelRatio || 1,
            antialias: true
        });
        
        // 记录舞台尺寸
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // 添加到容器 - 在 PixiJS v8 中使用 app.canvas
        container.appendChild(this.app.canvas);
        
        // 创建主要图层
        this.bgLayer = new PIXI.Container(); // 背景层 - 静态内容
        this.contentLayer = new PIXI.Container(); // 内容层 - 动态内容
        
        // 添加图层到舞台
        this.app.stage.addChild(this.bgLayer);
        this.app.stage.addChild(this.contentLayer);
        
        // 初始化内容位置 - 居中显示内容
        this.centerContent();
        
        // 绘制舞台边框
        this.drawStageBorder();
        
        // 初始化交互管理器
        this.initInteraction();
        
        // 初始化视口裁剪
        this.initViewportClipping();
        
        // 添加窗口大小变化监听
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    /**
     * 居中显示内容
     */
    centerContent() {
        // 计算内容应该在舞台中的位置
        const centerX = (this.width - this.contentWidth) / 2;
        const centerY = (this.height - this.contentHeight) / 2;
        
        // 设置内容层的初始位置
        this.contentLayer.position.set(centerX, centerY);
        this.bgLayer.position.set(centerX, centerY);
        
        console.log('Content centered', { centerX, centerY });
    }
    
    /**
     * 处理窗口大小变化
     */
    handleResize() {
        this.resize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * 绘制舞台边框
     * 使用深红色绘制舞台的边界
     */
    drawStageBorder() {
        // 创建一个图形对象用于绘制边框
        const border = new PIXI.Graphics();
        
        // 设置线条样式 - 深红色，宽度为3像素
        border.setStrokeStyle({
            width: 3,
            color: 0x990000, // 深红色
            alpha: 1,
            alignment: 0 // 设置线条对齐方式为居中，确保线条不会超出舞台边界
        });
        
        // 绘制矩形边框，稍微缩小一点以确保边框完全可见
        // 将边框向内缩进1.5像素（线宽的一半），确保边框完全在舞台内部
        border.rect(1.5, 1.5, this.width - 3, this.height - 3);
        border.stroke();
        
        // 将边框添加到最顶层
        this.app.stage.addChild(border);
        
        // 保存边框引用，以便后续可能的更新
        this.stageBorder = border;
        
        console.log('Stage border drawn', { width: this.width, height: this.height });
    }
    
    /**
     * 初始化交互系统
     */
    initInteraction() {
        // 设置舞台为交互式
        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = new PIXI.Rectangle(0, 0, this.app.screen.width, this.app.screen.height);
        
        // 添加事件监听器 - 在 PixiJS v8 中使用 app.canvas
        this.app.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        this.app.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
        this.app.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
        this.app.canvas.addEventListener('pointercancel', this.handlePointerUp.bind(this));
        this.app.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    }
    
    /**
     * 初始化视口裁剪
     */
    initViewportClipping() {
        // 启用内容层的裁剪 - 在 PixiJS v8 中设置 cullable
        this.contentLayer.cullable = true;
        
        // 初始更新视口
        this.updateViewport();
        
        // 添加到渲染循环 - 使用 PixiJS v8 的 Ticker
        this.app.ticker.add(() => {
            this.updateViewport();
        });
    }
    
    /**
     * 更新视口裁剪区域
     */
    updateViewport() {
        // 计算当前可见区域（在世界坐标系中）
        const bounds = new PIXI.Rectangle(
            -this.contentLayer.x / this.contentLayer.scale.x,
            -this.contentLayer.y / this.contentLayer.scale.y,
            this.app.screen.width / this.contentLayer.scale.x,
            this.app.screen.height / this.contentLayer.scale.y
        );
        
        // 添加边缘填充
        const padding = 100 / this.contentLayer.scale.x;
        bounds.x -= padding;
        bounds.y -= padding;
        bounds.width += padding * 2;
        bounds.height += padding * 2;
        
        // 设置裁剪区域 - 在 PixiJS v8 中使用 cullArea
        if (this.contentLayer.cullArea !== undefined) {
            this.contentLayer.cullArea = bounds;
        } else {
            // 如果 cullArea 不可用，尝试其他方法
            console.warn('cullArea 不可用，视口裁剪可能无法正常工作');
        }
    }
    
    /**
     * 处理指针按下事件
     * @param {PointerEvent} e - 指针事件
     */
    handlePointerDown(e) {
        // 记录触摸点
        this.activePointers.set(e.pointerId, {
            id: e.pointerId,
            clientX: e.clientX,
            clientY: e.clientY,
            x: e.clientX,
            y: e.clientY,
            pointerType: e.pointerType,
            pressure: e.pressure || 0,
            isPrimary: e.isPrimary
        });
        
        // 触发自定义事件
        this.emit('pointerdown', e);
        
        // 处理多点触摸
        if (this.activePointers.size === 2) {
            this.emit('multitouchstart', Array.from(this.activePointers.values()));
        }
    }
    
    /**
     * 处理指针移动事件
     * @param {PointerEvent} e - 指针事件
     */
    handlePointerMove(e) {
        // 更新触摸点
        if (this.activePointers.has(e.pointerId)) {
            this.activePointers.set(e.pointerId, {
                id: e.pointerId,
                clientX: e.clientX,
                clientY: e.clientY,
                x: e.clientX,
                y: e.clientY,
                pointerType: e.pointerType,
                pressure: e.pressure || 0,
                isPrimary: e.isPrimary
            });
        }
        
        // 触发自定义事件
        this.emit('pointermove', e);
        
        // 处理多点触摸
        if (this.activePointers.size === 2) {
            this.emit('multitouchmove', Array.from(this.activePointers.values()));
        }
    }
    
    /**
     * 处理指针抬起事件
     * @param {PointerEvent} e - 指针事件
     */
    handlePointerUp(e) {
        // 触发自定义事件
        this.emit('pointerup', e);
        
        // 处理多点触摸结束
        if (this.activePointers.size === 2) {
            this.emit('multitouchend', e);
        }
        
        // 移除触摸点
        this.activePointers.delete(e.pointerId);
    }
    
    /**
     * 处理滚轮事件
     * @param {WheelEvent} e - 滚轮事件
     */
    handleWheel(e) {
        // 触发自定义事件
        this.emit('wheel', e);
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
     * 调整渲染器大小
     * @param {number} width - 新宽度
     * @param {number} height - 新高度
     */
    resize(width, height) {
        // 调整渲染器大小 - 在 PixiJS v8 中使用 app.resize
        this.app.resize(width, height);
        
        // 更新舞台的点击区域
        this.app.stage.hitArea = new PIXI.Rectangle(0, 0, width, height);
        
        // 更新尺寸记录
        this.width = width;
        this.height = height;
        
        // 重新居中内容
        this.centerContent();
        
        // 更新视口
        this.updateViewport();
        
        // 更新舞台边框
        if (this.stageBorder) {
            this.stageBorder.clear();
            this.stageBorder.setStrokeStyle({
                width: 3,
                color: 0x990000, // 深红色
                alpha: 1,
                alignment: 0 // 设置线条对齐方式为居中
            });
            // 将边框向内缩进1.5像素（线宽的一半），确保边框完全在舞台内部
            this.stageBorder.rect(1.5, 1.5, width - 3, height - 3);
            this.stageBorder.stroke();
        }
        
        console.log('Renderer resized', { width, height });
    }
    
    /**
     * 销毁渲染器
     */
    destroy() {
        // 移除事件监听器
        this.app.canvas.removeEventListener('pointerdown', this.handlePointerDown);
        this.app.canvas.removeEventListener('pointermove', this.handlePointerMove);
        this.app.canvas.removeEventListener('pointerup', this.handlePointerUp);
        this.app.canvas.removeEventListener('pointercancel', this.handlePointerUp);
        this.app.canvas.removeEventListener('wheel', this.handleWheel);
        
        // 销毁 PIXI 应用 - 在 PixiJS v8 中简化了 destroy 方法
        this.app.destroy();
        
        // 清理事件监听器
        this.eventListeners = {};
        
        console.log('PixiRenderer destroyed');
    }
} 