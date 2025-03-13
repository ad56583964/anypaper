import * as PIXI from 'pixi.js';
import PixiRenderer from './PixiRenderer';
import PixiPointer from './PixiPointer';
import { updateDebugInfo } from '../debug.jsx';
import PixiPencilTool from '../tools/PixiPencilTool';
import PixiZoomTool from '../tools/PixiZoomTool';
import { getCoordinates, createPointerInfo } from './utils';

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
        this.pixel = 2;
        
        // 设置 block 大小
        this.block = {
            width: 10 * this.pixel,
            height: 10 * this.pixel,
        };
        
        // 计算内容大小
        this.width = 80 * this.block.width;
        this.height = 80 * this.block.height;
        
        // 创建渲染器 - 传递内容大小而不是舞台大小
        console.log('PixiTable constructor', containerId, this.width, this.height);
        this.renderer = new PixiRenderer(containerId, this.width, this.height);
        console.log('PixiTable constructor', this.renderer);
        
        // 使用Promise处理异步初始化
        return new Promise(async (resolve) => {
            try {
                // 等待渲染器初始化完成
                await this.renderer.initPromise;
                
                // 初始化表格
                this.initTable();
                
                // 初始化工具
                this.initTools();
                
                // 创建光标指示器
                this.initPointer(options.pointerOptions);
                
                resolve(this);
            } catch (error) {
                console.error('PixiTable initialization error:', error);
            }
        });
    }
    
    /**
     * 初始化光标指示器
     * @param {Object} options - 光标指示器选项
     */
    initPointer(options = {}) {
        // 创建光标指示器
        this.pointer = new PixiPointer(this.renderer, {
            debug: options?.debug !== undefined ? options.debug : true,
            size: options?.size || 10,
            color: options?.color || 'rgba(255, 0, 0, 0.7)',
            updateInterval: options?.updateInterval || 5
        });
    }
    
    /**
     * 更新光标指示器位置
     * @param {PointerEvent} e - 指针事件
     */
    updateHitPointer(e) {
        if (this.pointer) {
            this.pointer.update(e);
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
     * 在 PixiRenderer 初始化完成后调用
     */
    initTable() {
        // 创建容器，直接使用 PIXI.Container 替代 PixiLayer
        // 背景层容器
        this.bgContainer = new PIXI.Container();
        this.bgContainer.label = 'background';
        this.renderer.bgLayer.addChild(this.bgContainer);
        
        // 网格层容器
        this.gridContainer = new PIXI.Container();
        this.gridContainer.label = 'grid';
        this.renderer.bgLayer.addChild(this.gridContainer);
        
        // 纸张层容器
        this.paperContainer = new PIXI.Container();
        this.paperContainer.label = 'paper';
        this.renderer.bgLayer.addChild(this.paperContainer);
        
        // 绘图层容器
        this.drawingContainer = new PIXI.Container();
        this.drawingContainer.label = 'drawing';
        this.renderer.contentLayer.addChild(this.drawingContainer);
        
        // 工具管理
        this.tools = {};
        this.currentTool = null;
        
        // 性能监控
        this.performanceStats = {
            fps: 0,
            drawCalls: 0,
            lastFrameTime: 0,
            frameCount: 0,
            frameTimeSum: 0
        };
        
        // 初始化表格
        this.drawBackground();
        this.drawGrid();
        this.createPaper();
        
        // 设置事件监听器
        this.setupEventListeners();
        
        // 设置性能监控
        this.setupPerformanceMonitoring();
        
        // 设置视口裁剪
        this.setupViewportCulling();
        
        console.log('PixiTable initialized');
    }
    
    /**
     * 设置视口裁剪，只渲染可见区域
     */
    setupViewportCulling() {
        // 启用内容层的裁剪
        this.renderer.contentLayer.cullable = true;
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
        // 计算 paper 的尺寸，使其保持 16:9 比例
        const stageWidth = this.width;
        const stageHeight = this.height;
        
        // 确定 paper 的宽度和高度，取较小的一边作为限制
        let paperWidth, paperHeight;
        if (stageWidth / 16 < stageHeight / 9) {
            // 如果舞台更宽，则以宽度为基准
            paperWidth = stageWidth * 0.8; // 留出一些边距
            paperHeight = paperWidth * 9 / 16;
        } else {
            // 如果舞台更高，则以高度为基准
            paperHeight = stageHeight * 0.8; // 留出一些边距
            paperWidth = paperHeight * 16 / 9;
        }
        
        // 计算居中位置
        const x = (stageWidth - paperWidth) / 2;
        const y = (stageHeight - paperHeight) / 2;
        
        // 创建 paper 对象
        const paper = new PIXI.Graphics()
            .setStrokeStyle(1, 0x333333)
            .roundRect(x, y, paperWidth, paperHeight, 5)
            .fill(0xffffff)

        // 添加阴影效果
        const paperContainer = new PIXI.Container();
        paperContainer.addChild(paper);
        
        // 创建阴影
        const shadow = new PIXI.Graphics()
            .roundRect(x + 5, y + 5, paperWidth, paperHeight, 5)
            .fill({
                color: 0x000000,
                alpha: 0.2
            })
        
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
        window.addEventListener('wheel', this.handleWheel.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    /**
     * 设置性能监控
     */
    setupPerformanceMonitoring() {
        // 添加到渲染循环
        this.renderer.app.ticker.add(() => {
            // 计算 FPS
            const now = performance.now();
            const elapsed = now - this.performanceStats.lastFrameTime;
            this.performanceStats.lastFrameTime = now;
            
            this.performanceStats.frameCount++;
            this.performanceStats.frameTimeSum += elapsed;
            
            // 每秒更新一次 FPS
            if (this.performanceStats.frameCount >= 30) {
                const avgFrameTime = this.performanceStats.frameTimeSum / this.performanceStats.frameCount;
                this.performanceStats.fps = Math.round(1000 / avgFrameTime);
                
                // 获取绘制调用次数 - 安全地获取
                try {
                    // 尝试不同的方式获取 drawCalls
                    if (this.renderer.app.renderer.gl && this.renderer.app.renderer.gl.drawCalls) {
                        this.performanceStats.drawCalls = this.renderer.app.renderer.gl.drawCalls;
                    } else if (this.renderer.app.renderer.system && this.renderer.app.renderer.system.CONTEXT_UID) {
                        // 在 PixiJS v8+ 中可能的路径
                        this.performanceStats.drawCalls = this.renderer.app.renderer.system.CONTEXT_UID;
                    } else {
                        this.performanceStats.drawCalls = 0;
                    }
                } catch (e) {
                    console.warn('无法获取 drawCalls:', e);
                    this.performanceStats.drawCalls = 0;
                }
                
                // 更新调试信息
                updateDebugInfo('performance', {
                    fps: this.performanceStats.fps,
                    drawCalls: this.performanceStats.drawCalls,
                    avgFrameTime: avgFrameTime.toFixed(2)
                });
                
                // 重置计数器
                this.performanceStats.frameCount = 0;
                this.performanceStats.frameTimeSum = 0;
            }
        });
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

        // console.log('updateDeviceTrackerInfo', eventType, event);
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
        // 更新设备追踪信息 - 使用节流减少更新频率
        if (performance.now() % 5 === 0) {
            this.updateDeviceTrackerInfo('pointermove', e);
        }
        
        // 更新光标指示器位置 - 这里不需要节流，因为updateHitPointer内部已有节流
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
        
        // 确保当前工具存在且有 wheel 方法
        if (this.currentTool && typeof this.currentTool.wheel === 'function') {
            this.currentTool.wheel(e);
        } else if (this.tools.zoom && typeof this.tools.zoom.wheel === 'function') {
            // 如果当前工具没有 wheel 方法，但存在缩放工具，则使用缩放工具处理滚轮事件
            this.tools.zoom.wheel(e);
        }
        
        // 在缩放后更新光标位置
        this.updateHitPointer(e);
    }
    
    /**
     * 处理窗口大小变化事件
     */
    handleResize() {
        // 不再需要手动调整渲染器大小，PixiRenderer 会自动处理
        // 只需要重新创建 paper
        this.paperContainer.removeChildren();
        this.createPaper();
        
        // 更新调试信息
        updateDebugInfo('resize', {
            windowSize: { width: window.innerWidth, height: window.innerHeight },
            contentSize: { width: this.width, height: this.height },
            timestamp: Date.now()
        });
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
     * 获取世界坐标
     * @param {Object} event - 指针事件对象
     * @returns {Object} - 世界坐标
     */
    getWorldPoint(event) {
        // 创建指针信息对象
        const pointer = createPointerInfo(event);
        
        // 使用工具函数获取世界坐标，传递渲染器参数以使用 PixiJS 的交互系统
        const coords = getCoordinates(pointer, this.renderer.app.canvas, this.renderer.contentLayer, this.renderer);
        
        // 返回世界坐标
        return { x: coords.worldX, y: coords.worldY };
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
        
        // 销毁光标指示器
        if (this.pointer) {
            this.pointer.destroy();
            this.pointer = null;
        }
        
        // 清理指针容器
        if (this.pointerContainer) {
            this.renderer.app.stage.removeChild(this.pointerContainer);
            this.pointerContainer.destroy();
            this.pointerContainer = null;
        }
        
        // 销毁图层
        this.bgContainer.removeChildren();
        this.gridContainer.removeChildren();
        this.paperContainer.removeChildren();
        this.drawingContainer.removeChildren();
        
        // 销毁渲染器
        this.renderer.destroy();
        
        console.log('PixiTable destroyed');
    }
}