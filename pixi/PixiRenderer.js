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
        
        // 初始化调试网格（默认禁用）
        this.drawDebugGrid(false);
        
        // 在左上角绘制比较矩形
        this.drawComparisonRects();
        
        // 输出初始化信息
        console.log('PixiRenderer initialized', {
            width: this.width,
            height: this.height,
            resolution: this.app.renderer.resolution,
            devicePixelRatio: window.devicePixelRatio
        });
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
        
        // 获取当前分辨率
        const resolution = this.app.renderer.resolution;
        
        // 设置线条样式 - 深红色，宽度为3像素（考虑分辨率）
        // 注意：PixiJS 会自动将线宽乘以分辨率，所以这里不需要手动调整
        const lineWidth = 3;
        border.setStrokeStyle({
            width: lineWidth,
            color: 0x990000, // 深红色
            alpha: 1,
            alignment: 0 // 设置线条对齐方式为居中
        });
        
        // 计算边框内边距，确保边框在视口内
        const padding = Math.max(3, Math.ceil(lineWidth / 2));
        
        // 获取舞台的实际尺寸
        const stageWidth = this.width;
        const stageHeight = this.height;
        
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
        // this.app.stage.hitArea = new PIXI.Rectangle(0, 0, width, height);
        
        // 更新尺寸记录
        this.width = width;
        this.height = height;
        
        // 重新居中内容
        this.centerContent();
        
        // 更新视口
        this.updateViewport();
        
        // 更新舞台边框
        if (this.stageBorder) {
            // 获取当前分辨率
            const resolution = this.app.renderer.resolution;
            
            // 清除旧边框
            this.stageBorder.clear();
            
            // 设置线条样式 - 深红色，宽度为3像素
            // 注意：PixiJS 会自动将线宽乘以分辨率，所以这里不需要手动调整
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
            const stageWidth = width;
            const stageHeight = height;
            
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
    
    /**
     * 绘制调试网格
     * 在舞台上绘制坐标网格，帮助理解坐标系统
     * @param {boolean} enabled - 是否启用网格
     * @param {number} gridSize - 网格大小（像素）
     */
    drawDebugGrid(enabled = true, gridSize = 100) {
        // 如果已存在网格，先移除
        if (this.debugGrid) {
            if (this.debugGrid.parent) {
                this.debugGrid.parent.removeChild(this.debugGrid);
            }
            this.debugGrid.destroy();
            this.debugGrid = null;
        }
        
        // 如果不启用，直接返回
        if (!enabled) {
            return;
        }
        
        // 创建一个图形对象用于绘制网格
        const grid = new PIXI.Graphics();
        
        // 获取当前分辨率
        const resolution = this.app.renderer.resolution;
        
        // 设置线条样式 - 浅灰色，宽度为1像素
        grid.setStrokeStyle({
            width: 1,
            color: 0xCCCCCC, // 浅灰色
            alpha: 0.5,
            alignment: 0 // 设置线条对齐方式为居中
        });
        
        // 获取舞台的实际尺寸
        const stageWidth = this.width;
        const stageHeight = this.height;
        
        // 绘制水平线
        for (let y = 0; y <= stageHeight; y += gridSize) {
            grid.moveTo(0, y);
            grid.lineTo(stageWidth, y);
        }
        
        // 绘制垂直线
        for (let x = 0; x <= stageWidth; x += gridSize) {
            grid.moveTo(x, 0);
            grid.lineTo(x, stageHeight);
        }
        
        // 绘制线条
        grid.stroke();
        
        // 添加坐标标签
        for (let y = 0; y <= stageHeight; y += gridSize) {
            for (let x = 0; x <= stageWidth; x += gridSize) {
                // 只在交叉点添加标签
                if (x % (gridSize * 2) === 0 && y % (gridSize * 2) === 0) {
                    const label = new PIXI.Text(`(${x},${y})`, {
                        fontFamily: 'Arial',
                        fontSize: 10,
                        fill: 0x666666,
                        align: 'center'
                    });
                    label.position.set(x + 5, y + 5);
                    grid.addChild(label);
                }
            }
        }
        
        // 将网格添加到背景层
        this.bgLayer.addChild(grid);
        
        // 保存网格引用，以便后续可能的更新
        this.debugGrid = grid;
        
        console.log('Debug grid drawn', { 
            gridSize: gridSize,
            resolution: resolution,
            devicePixelRatio: window.devicePixelRatio
        });
    }
    
    /**
     * 使用 DOM 在左上角绘制矩形
     * @param {string} color - 矩形颜色，默认为红色
     * @param {number} size - 矩形大小，默认为 100
     * @returns {HTMLElement} - 创建的 DOM 元素
     */
    drawDOMRect(color = 'red', size = 100) {
        // 创建一个 div 元素
        const rect = document.createElement('div');
        
        // 设置样式
        Object.assign(rect.style, {
            position: 'absolute',
            top: '0px',
            left: '0px',
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: color,
            zIndex: '1000', // 确保在最上层
            pointerEvents: 'none' // 不拦截鼠标事件
        });
        
        // 添加到容器
        this.app.canvas.parentElement.appendChild(rect);
        
        // 保存引用，以便后续可能的移除
        this.domRect = rect;
        
        console.log('DOM rectangle drawn at top-left corner', {
            size: size,
            devicePixelRatio: window.devicePixelRatio
        });
        
        return rect;
    }
    
    /**
     * 使用 PixiJS 在左上角绘制矩形
     * @param {number|string} color - 矩形颜色，默认为红色
     * @param {number} size - 矩形大小，默认为 100
     * @returns {PIXI.Graphics} - 创建的 PIXI.Graphics 对象
     */
    drawPixiRect(color = 0xFF0000, size = 100) {
        // 如果传入的是字符串（如 '#FF0000'），转换为数字
        if (typeof color === 'string') {
            // 移除 # 前缀（如果有）
            color = color.replace(/^#/, '');
            // 转换为十六进制数字
            color = parseInt(color, 16);
        }
        
        // 创建一个图形对象
        const rect = new PIXI.Graphics();
        
        // 获取当前分辨率
        const resolution = this.app.renderer.resolution;
        
        // 填充矩形 - 考虑分辨率因素，使视觉大小与 DOM 矩形一致
        rect.beginFill(color);
        rect.drawRect(0, 0, size, size);
        rect.endFill();
        
        // 设置位置为左上角（相对于舞台）
        rect.position.set(0, 0);
        
        // 添加到舞台的最顶层
        this.app.stage.addChild(rect);
        
        // 保存引用，以便后续可能的移除
        this.pixiRect = rect;
        
        console.log('PixiJS rectangle drawn at top-left corner', {
            size: size,
            resolution: resolution,
            devicePixelRatio: window.devicePixelRatio
        });
        
        return rect;
    }
    
    /**
     * 绘制比较矩形
     * 在左上角绘制不同大小的矩形，用于比较 DOM 和 PixiJS 在高 DPI 显示器上的表现
     */
    drawComparisonRects() {
        // 移除之前的矩形
        this.removeRect();
        
        // 获取当前分辨率
        const resolution = this.app.renderer.resolution;
        
        // 绘制 DOM 矩形（红色，100px）
        this.drawDOMRect('red', 100*resolution);
        
        // 绘制 PixiJS 矩形（蓝色，考虑分辨率）
        // 在高 DPI 显示器上，需要将 PixiJS 矩形的大小乘以分辨率
        this.drawPixiRect('#0000FF', 100);
        
        console.log('Comparison rectangles drawn', {
            domSize: 100,
            pixiSize: 100 * resolution,
            resolution: resolution,
            devicePixelRatio: window.devicePixelRatio
        });
    }
    
    /**
     * 移除之前创建的矩形
     * @param {string} type - 要移除的矩形类型，'dom'、'pixi' 或 'all'
     */
    removeRect(type = 'all') {
        if (type === 'dom' || type === 'all') {
            if (this.domRect) {
                this.domRect.parentElement.removeChild(this.domRect);
                this.domRect = null;
                console.log('DOM rectangle removed');
            }
        }
        
        if (type === 'pixi' || type === 'all') {
            if (this.pixiRect) {
                if (this.pixiRect.parent) {
                    this.pixiRect.parent.removeChild(this.pixiRect);
                }
                this.pixiRect.destroy();
                this.pixiRect = null;
                console.log('PixiJS rectangle removed');
            }
        }
    }
} 