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

        this.width = 20*40*this.pixel;
        this.height = 20*30*this.pixel;

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

        // Setup the layers
        this.gLayer = new Konva.Layer({
            listening: false,
            draggable: false,
        });
        this.stage.add(this.gLayer);
        this.state = "idle";

        this.pointer = {
            pos: {
                x: 0,
                y: 0,
            },
        };

        this.block = {
            width: 20 * this.pixel,
            height: 40 * this.pixel,
        }

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
        })

        //使用这个方式描述 点阵背景会有运行时开销吗 ？
        // draw grid background
        // need many circles ??
        for (let i = 1; i < this.width / this.block.width; i++) {
            for (let j = 1; j < this.height / this.block.height; j++) {
                var circle = new Konva.Circle({
                    x: i * 20 * this.pixel,
                    y: j * 40 * this.pixel,
                    radius: this.pixel,
                    fill: "black",
                    listening: false,
                    draggable: false,
                });
                this.gridGroup.add(circle);
            }
        }

        this.gridGroup.cache()
        this.gLayer.add(this.gridGroup)
    }

    /**
     * create table
     * init pointer
     * init background
     * init debug hit
     */
    initTable() {
        this.konva_attr = new Konva.Rect({
            listening: false,
            draggable: false,
            width: this.stage.width(),
            height: this.stage.height(),
            //grey
            fill: "grey",
        });

        this.gLayer.add(this.konva_attr);
        // 确保背景在其他元素的下方(konva api)
        this.konva_attr.moveToBottom();


        this.initGridBG();

        this.gLayer.batchDraw();

        // 应用自适应DPR
        this.applyAdaptiveDpr();
    }

    fitWindow() {
        DEBUG_INFO("Enter fitWindow");
        DEBUG_INFO("Table: ",window.innerWidth,window.innerHeight);
        this.stage.setAttrs({
            width: window.innerWidth,
            height: window.innerHeight,
            fill: "#ddf",
        });
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
            console.log('POINTER_LOG: pointerdown', {
                pointerId: event.pointerId,
                pointerType: event.pointerType,
                activePointers: this.activePointers.size
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
                console.log('POINTER_LOG: pointermove with 2 pointers', 
                    Array.from(this.activePointers.values()));
            }
        } else if (eventType === 'pointerup' || eventType === 'pointercancel') {
            console.log('POINTER_LOG: pointer' + (eventType === 'pointerup' ? 'up' : 'cancel'), {
                pointerId: event.pointerId,
                remainingPointers: this.activePointers.size - 1
            });
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
                    console.log('ZOOM_LOG: 调用 handleMultiTouchStart', pointers);
                    this.zoomTool.handleMultiTouchStart(pointers);
                    return;
                case 'pointermove':
                    this.zoomTool.handleMultiTouchMove(pointers);
                    return;
                case 'pointerup':
                case 'pointercancel':
                    console.log('ZOOM_LOG: 调用 handleMultiTouchEnd', {
                        eventType,
                        remainingPointers: this.activePointers.size
                    });
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
}
