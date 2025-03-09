import Konva from "./src/konva";
import AnyA4Tool from "./commands";
import PaperTool from "./tools/paper";
import PencilTool from "./tools/pencil";
import SelectTool from "./tools/select";
import HitUpdateOnlyTool from "./tools/hitUpdateOnly";
import AdaptiveDpr from "./tools/adaptiveDpr";
import ZoomTool from "./tools/zoom";
import ToolBar from "./components/ToolBar";
import { updateDebugInfo } from "./debug.jsx"; // 导入 updateDebugInfo 函数

let DEBUG_INFO = console.log;

export default class Table {
    constructor(containerId = 'a4-table', theme) {
        this.pixel = 2;

        // 先设置 block 大小
        this.block = {
            width: 10 * this.pixel,
            height: 10 * this.pixel,
        }

        // 基于 block 大小计算宽度和高度 - 减小画布尺寸以提高性能
        this.width = 60 * this.block.width;  // 减小为60个block宽
        this.height = 60 * this.block.height; // 减小为60个block高

        // 创建 ZoomTool 实例
        this.zoomTool = new ZoomTool(this);
        
        // 创建自适应DPR实例
        this.adaptiveDpr = new AdaptiveDpr({
            targetPixelCount: 2000000, // 约200万像素
            minDpr: 0.75,
            maxDpr: 2.0
        });

        // 添加多点触摸追踪
        this.activePointers = new Map();

        // Setup the stage (global enviroment)
        this.stage = new Konva.Stage({
            listening: true,  // 确保能接收触摸事件
            draggable: false,
            container: containerId,
            width: this.width,
            height: this.height,
        });

        // 创建多个图层以优化性能
        // 背景层 - 静态内容，很少更新
        this.bgLayer = new Konva.Layer({
            listening: false,
            draggable: false,
        });
        
        // 内容层 - 用于绘制和交互
        this.gLayer = new Konva.Layer({
            listening: true,
            draggable: false,
            // 启用命中检测优化
            hitGraphEnabled: true,
        });
        
        // 添加图层到舞台
        this.stage.add(this.bgLayer);
        this.stage.add(this.gLayer);
        
        this.state = "idle";

        this.pointer = {
            pos: {
                x: 0,
                y: 0,
            },
        };

        this.stage.container().style.cursor = 'crosshair'

        // Draw table
        this.initTable();

        // Tools
        this.currentTool = null;
        this.tools = {};

        // this.action = new TableAction(this)

        this.eventListeners = {};

        this.registerTool("select", new SelectTool(this));
        // this.registerTool("paper",new PaperTool(this))
        this.registerTool("pencil", new PencilTool(this));
        this.registerTool("hitUpdateOnly", new HitUpdateOnlyTool(this));
        
        // 初始化工具栏
        this.toolBar = new ToolBar(this);
        
        this.setActiveTool("pencil");
        // this.debug = new TableDebug(this)
        // this.eventManage = new TableEvent(this)

        window.addEventListener("keydown", (e) => this.keydown(e));
    }

    /**
     * 
     */
    initGridBG() {
        this.gridGroup = new Konva.Group({
            listening: false,
            draggable: false,
        });

        // 使用更高效的方式绘制点阵背景
        // 创建一个小的点阵模式，然后使用图像填充
        const dotSize = 1; // 点的大小
        const dotSpacing = this.block.width; // 点的间距
        
        // 修改：使用单个点间距作为模式大小，确保无缝拼接
        const patternSize = dotSpacing;
        
        // 创建一个临时的离屏canvas来绘制点阵模式
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = patternSize;
        patternCanvas.height = patternSize;
        const patternCtx = patternCanvas.getContext('2d');
        
        // 清除背景
        patternCtx.clearRect(0, 0, patternSize, patternSize);
        
        // 在模式的中心绘制一个点
        patternCtx.fillStyle = "#555555"; // 点的颜色
        patternCtx.beginPath();
        patternCtx.arc(patternSize/2, patternSize/2, dotSize, 0, Math.PI * 2);
        patternCtx.fill();
        
        // 创建图像对象
        const patternImage = new Image();
        patternImage.onload = () => {
            // 创建填充整个画布的矩形
            const gridRect = new Konva.Rect({
                x: 0,
                y: 0,
                width: this.width,
                height: this.height,
                fillPatternImage: patternImage,
                fillPatternRepeat: 'repeat',
                fillPatternOffset: { x: 0, y: 0 },
                listening: false,
                draggable: false,
            });
            
            this.gridGroup.add(gridRect);
            this.gridGroup.cache();
            // 将网格添加到背景层
            this.bgLayer.add(this.gridGroup);
            this.bgLayer.batchDraw();
        };
        
        // 将canvas内容转换为dataURL并加载到图像中
        patternImage.src = patternCanvas.toDataURL();
    }

    /**
     * create table
     * init pointer
     * init background
     * init debug hit
     */
    initTable() {
        // 创建背景矩形
        this.konva_attr = new Konva.Rect({
            listening: false,
            draggable: false,
            width: this.stage.width(),
            height: this.stage.height(),
            // 更深的背景灰色
            fill: "#DDDDDD",
            // 添加棕色边框
            stroke: "#8B4513", // 棕色边框
            strokeWidth: 4,    // 边框宽度
        });

        // 将背景添加到背景层
        this.bgLayer.add(this.konva_attr);
        // 确保背景在其他元素的下方
        this.konva_attr.moveToBottom();

        // 初始化网格背景
        this.initGridBG();
        
        // 创建16:9比例的paper对象
        this.createPaper();

        // 确保两个图层的位置和缩放一致
        this.bgLayer.scale({ x: 1, y: 1 });
        this.gLayer.scale({ x: 1, y: 1 });
        this.bgLayer.position({ x: 0, y: 0 });
        this.gLayer.position({ x: 0, y: 0 });
        
        // 绘制所有层
        this.bgLayer.batchDraw();
        this.gLayer.batchDraw();

        // 应用自适应DPR
        this.applyAdaptiveDpr();
    }

    fitWindow() {
        console.log("调整窗口大小");
        this.stage.setAttrs({
            width: window.innerWidth,
            height: window.innerHeight,
        });
        
        // 更新背景矩形的大小
        this.konva_attr.setAttrs({
            width: this.stage.width(),
            height: this.stage.height(),
        });
        
        // 如果存在paper，重新调整其位置和大小
        if (this.paper) {
            // 移除旧的paper
            this.paper.destroy();
            
            // 创建新的paper
            this.createPaper();
        }
        
        // 确保两个图层的位置和缩放一致
        const currentScale = this.zoomTool.getCurrentScale();
        const currentPos = {
            x: this.gLayer.x(),
            y: this.gLayer.y()
        };
        
        this.bgLayer.scale({ x: currentScale, y: currentScale });
        this.gLayer.scale({ x: currentScale, y: currentScale });
        this.bgLayer.position(currentPos);
        this.gLayer.position(currentPos);
        
        // 重新绘制
        this.bgLayer.batchDraw();
        this.gLayer.batchDraw();
    }

    // global use
    updateCurrentPointer(){
        var gPointer = this.stage.getPointerPosition();
        if (!gPointer) return;  // 如果没有获取到指针位置，直接返回
        
        var gLayerPos = this.gLayer.getAbsolutePosition();
        if (!gLayerPos) return;  // 如果没有获取到图层位置，直接返回

        this.currentPointer = {
            x: (gPointer.x - gLayerPos.x) / this.zoomTool.getCurrentScale(),
            y: (gPointer.y - gLayerPos.y) / this.zoomTool.getCurrentScale(),
        }
    }

    updateZoom(e) {
        this.zoomTool.wheel(e);
    }

    /*
        Tool relate 
    */ 
    registerTool(name, tool) {
        this.tools[name] = tool;
    }

    // 添加进入缩放模式的方法
    enterZoomMode() {
        this.zoomTool.enterZoomMode();
    }

    // 添加退出缩放模式的方法
    exitZoomMode() {
        this.zoomTool.exitZoomMode();
    }

    setActiveTool(name) {
        // 如果当前工具正在绘画，不允许切换工具
        if (this.currentTool && this.currentTool.isdrawing) {
            console.log("当前正在绘画，不能切换工具");
            return;
        }
        
        // 如果在缩放模式且尝试激活工具，先退出缩放模式
        if (this.zoomTool.isZoomMode && name) {
            this.exitZoomMode();
        }
        
        if (this.currentTool) {
            this.currentTool.deactivate();
            this.removeEventListeners();
        }

        this.currentTool = this.tools[name];
            
        if (this.currentTool) {
            DEBUG_INFO("activate tool: " + name);
            this.currentTool.activate();
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        const events = [
            'wheel', 
            'pointermove', 
            'pointerdown', 
            'pointerup',
            'pointercancel',
            'keyup'
        ];
        events.forEach(eventType => {
            const listener = (e) => this.handleEvent(eventType, e);
            this.eventListeners[eventType] = listener;
            window.addEventListener(eventType, listener);
        });
    }

    removeEventListeners() {
        const events = [
            'wheel', 
            'pointermove', 
            'pointerdown', 
            'pointerup',
            'pointercancel',
            'keyup'
        ];
        events.forEach(eventType => {
            const listener = this.eventListeners[eventType];
            if (listener) {
                window.removeEventListener(eventType, listener);
                delete this.eventListeners[eventType];
            }
        });
    }

    handleEvent(eventType, event) {
        // 更新设备追踪信息
        if (eventType.startsWith('pointer') || eventType === 'wheel') {
            this.updateDeviceTrackerInfo(eventType, event);
        }

        // 更新活动触摸点追踪
        if (eventType === 'pointerdown') {
            this.activePointers.set(event.pointerId, {
                id: event.pointerId,
                clientX: event.clientX,
                clientY: event.clientY,
                x: event.clientX,
                y: event.clientY,
                pointerType: event.pointerType,
                pressure: event.pressure || 0,
                isPrimary: event.isPrimary
            });
        } else if (eventType === 'pointermove') {
            if (this.activePointers.has(event.pointerId)) {
                this.activePointers.set(event.pointerId, {
                    id: event.pointerId,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    x: event.clientX,
                    y: event.clientY,
                    pointerType: event.pointerType,
                    pressure: event.pressure || 0,
                    isPrimary: event.isPrimary
                });
            }
            if (this.activePointers.size === 2) {
                // 记录两个指针的位置信息，用于多点触控
            }
        } else if (eventType === 'pointerup' || eventType === 'pointercancel') {
            this.activePointers.delete(event.pointerId);
        }
        
        // 检查事件是否来自工具栏
        if (event.target && (
            event.target.closest && event.target.closest('#konva-toolbar') || 
            event.target.id === 'konva-toolbar' ||
            event.target.classList && event.target.classList.contains('konva-toolbar-button')
        )) {
            // 如果事件来自工具栏，不处理Canvas事件
            return;
        }

        // 处理多指触摸缩放 - 在任何工具下都可用，优先级最高
        if (this.activePointers.size === 2 && event.pointerType === 'touch') {
            const pointers = Array.from(this.activePointers.values());
            
            // 如果当前正在绘画，先结束绘画
            if (this.currentTool && this.currentTool.isdrawing) {
                this.currentTool.pointerup(event);
            }

            // 如果是铅笔工具且有待处理的触摸，取消它
            if (this.currentTool && this.currentTool.name === 'pencil' && this.currentTool.touchTimer) {
                clearTimeout(this.currentTool.touchTimer);
                this.currentTool.touchTimer = null;
                this.currentTool.pendingTouch = null;
            }

            // 处理缩放
            switch(eventType) {
                case 'pointerdown':
                    this.zoomTool.handleMultiTouchStart(pointers);
                    return;
                case 'pointermove':
                    this.zoomTool.handleMultiTouchMove(pointers);
                    return;
                case 'pointerup':
                case 'pointercancel':
                    this.zoomTool.handleMultiTouchEnd(event);
                    return;
            }
        }
        
        // 处理通用缩放操作 - 按住Ctrl/Cmd键滚动鼠标滚轮
        if (eventType === 'wheel' && (event.ctrlKey || event.metaKey)) {
            this.zoomTool.wheel(event);
            return;
        }
        
        // 如果当前工具正在绘画，优先处理绘画事件
        if (this.currentTool && this.currentTool.isdrawing) {
            if (this.currentTool[eventType]) {
                this.currentTool[eventType](event);
            }
            return;
        }
        
        // 如果在缩放模式下，优先使用 ZoomTool 处理事件
        if (this.zoomTool.isZoomMode) {
            // 检查 ZoomTool 是否有对应的事件处理方法
            if (this.zoomTool[eventType]) {
                // 如果 ZoomTool 处理了事件，则返回
                if (this.zoomTool[eventType](event)) {
                    return;
                }
            }
        }
        
        // 如果当前工具存在且有对应的事件处理方法，则调用
        if (this.currentTool && this.currentTool[eventType]) {
            this.currentTool[eventType](event);
        }
    }

    keydown(e) {
        if (e.key === 'Escape') {
            // 如果在缩放模式，按下Escape退出缩放模式
            if (this.zoomTool.isZoomMode) {
                this.exitZoomMode();
            }
        }
    }

    // 应用自适应DPR
    applyAdaptiveDpr() {
        if (!this.stage) {
            console.error('舞台未初始化，无法应用自适应DPR');
            return;
        }
        
        // 获取设备信息
        const deviceInfo = this.adaptiveDpr.getDeviceInfoSummary();
        console.log('设备信息:', deviceInfo);
        
        // 应用最佳DPR
        const success = this.adaptiveDpr.applyToStage(this.stage);
        
        if (success) {
            console.log(`已应用自适应DPR: ${this.adaptiveDpr.optimalDpr.toFixed(2)}`);
            
            // 显示通知
            this.showAdaptiveDprNotification(deviceInfo);
        } else {
            console.error('应用自适应DPR失败');
        }
    }
    
    // 显示自适应DPR通知
    showAdaptiveDprNotification(deviceInfo) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: sans-serif;
            font-size: 14px;
            z-index: 9999;
            transition: opacity 0.5s;
            max-width: 300px;
        `;
        
        // 设置通知内容
        notification.innerHTML = `
            <div style="margin-bottom: 5px; font-weight: bold;">已应用自适应DPR</div>
            <div>设备类型: ${deviceInfo.deviceType}</div>
            <div>屏幕尺寸: ${deviceInfo.estimatedScreenSize} (${deviceInfo.screenSize})</div>
            <div>性能等级: ${deviceInfo.performanceLevel}</div>
            <div>原始DPR: ${deviceInfo.originalDpr}</div>
            <div>优化DPR: ${deviceInfo.optimalDpr}</div>
        `;
        
        // 添加到文档
        document.body.appendChild(notification);
        
        // 5秒后淡出
        setTimeout(() => {
            notification.style.opacity = '0';
            // 淡出后移除
            setTimeout(() => notification.remove(), 500);
        }, 5000);
    }
    
    // 恢复原始DPR
    restoreOriginalDpr() {
        if (!this.stage || !this.adaptiveDpr) {
            return;
        }
        
        this.adaptiveDpr.restoreOriginalDpr(this.stage);
    }

    // 修改设备追踪信息更新方法
    updateDeviceTrackerInfo(eventType, event) {
        // 处理 pointer 事件
        if (eventType.startsWith('pointer')) {
            const pointerCount = this.activePointers.size;
            updateDebugInfo('deviceTracker', {
                lastEvent: eventType,
                position: { x: event.clientX, y: event.clientY },
                pressure: event.pressure || 0,
                tiltX: event.tiltX || 0,
                tiltY: event.tiltY || 0,
                timestamp: event.timeStamp,
                pointerId: event.pointerId,
                pointerType: event.pointerType,
                isPrimary: event.isPrimary,
                buttons: event.buttons,
                touchCount: event.pointerType === 'touch' ? pointerCount : undefined
            });
        } 
        // 处理 wheel 事件
        else if (eventType === 'wheel') {
            updateDebugInfo('deviceTracker', {
                lastEvent: eventType,
                position: { x: event.clientX, y: event.clientY },
                deltaX: event.deltaX,
                deltaY: event.deltaY,
                deltaMode: event.deltaMode,
                timestamp: event.timeStamp,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                pointerType: 'wheel'
            });
        }
    }

    // 创建居中的16:9比例paper对象
    createPaper() {
        // 计算paper的尺寸，使其保持16:9比例
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();
        
        // 确定paper的宽度和高度，取较小的一边作为限制
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
        
        // 创建paper对象 - 简化阴影效果以提高性能
        this.paper = new Konva.Rect({
            x: x,
            y: y,
            width: paperWidth,
            height: paperHeight,
            fill: 'white',
            stroke: '#333333',
            strokeWidth: 1,
            cornerRadius: 5,
            // 减少阴影效果，提高性能
            shadowColor: 'black',
            shadowBlur: 5,
            shadowOffset: { x: 3, y: 3 },
            shadowOpacity: 0.2,
            name: 'paper'
        });
        
        // 将paper添加到背景层 - 因为它是静态的，很少更新
        this.bgLayer.add(this.paper);
    }
}
