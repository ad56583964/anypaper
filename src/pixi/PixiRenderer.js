import * as PIXI from 'pixi.js';

/**
 * PixiRenderer 类 - PixiJS 渲染的核心
 * 负责创建和管理 PIXI 应用、图层和交互
 */
export default class PixiRenderer {
    /**
     * 创建一个新的 PixiRenderer 实例
     * @param {string} containerId - 容器元素的 ID
     * @param {number} width - 画布宽度
     * @param {number} height - 画布高度
     */
    constructor(containerId, width, height) {
        // 获取容器
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }
        
        // 创建 PIXI 应用 - 适配 PixiJS v8
        this.app = new PIXI.Application();
        
        // 设置应用属性
        this.app.renderer.resize(width, height);
        this.app.renderer.background.color = 0xdddddd; // 浅灰色背景
        this.app.renderer.resolution = window.devicePixelRatio || 1;
        this.app.renderer.antialias = true;
        
        // 添加到容器
        container.appendChild(this.app.canvas);
        
        // 创建主要图层
        this.bgLayer = new PIXI.Container(); // 背景层 - 静态内容
        this.contentLayer = new PIXI.Container(); // 内容层 - 动态内容
        
        // 添加图层到舞台
        this.app.stage.addChild(this.bgLayer);
        this.app.stage.addChild(this.contentLayer);
        
        // 跟踪活动的触摸点
        this.activePointers = new Map();
        
        // 初始化交互管理器
        this.initInteraction();
        
        // 初始化视口裁剪
        this.initViewportClipping();
        
        // 记录尺寸
        this.width = width;
        this.height = height;
        
        console.log('PixiRenderer initialized', { width, height });
    }
    
    /**
     * 初始化交互系统
     */
    initInteraction() {
        // 设置舞台为交互式
        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = new PIXI.Rectangle(0, 0, this.app.renderer.width, this.app.renderer.height);
        
        // 添加事件监听器
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
            this.app.renderer.width / this.contentLayer.scale.x,
            this.app.renderer.height / this.contentLayer.scale.y
        );
        
        // 添加边缘填充
        const padding = 100 / this.contentLayer.scale.x;
        bounds.x -= padding;
        bounds.y -= padding;
        bounds.width += padding * 2;
        bounds.height += padding * 2;
        
        // 设置裁剪区域 - 在 PixiJS v8 中使用 cullArea
        if (this.contentLayer.cullArea) {
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
        // 调整渲染器大小
        this.app.renderer.resize(width, height);
        
        // 更新舞台的点击区域
        this.app.stage.hitArea = new PIXI.Rectangle(0, 0, width, height);
        
        // 更新尺寸记录
        this.width = width;
        this.height = height;
        
        // 更新视口
        this.updateViewport();
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
        
        // 销毁 PIXI 应用
        this.app.destroy(true, { children: true, texture: true, baseTexture: true });
        
        // 清理事件监听器
        this.eventListeners = {};
        
        console.log('PixiRenderer destroyed');
    }
} 