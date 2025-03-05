import Konva from "./src/konva";
import AnyA4Tool from "./commands";
import PaperTool from "./tools/paper";
import PencilTool from "./tools/pencil";
import SelectTool from "./tools/select";
import HitUpdateOnlyTool from "./tools/hitUpdateOnly";
import ContextMonitorTool from "./tools/contextMonitorTool";
import DprControlTool from "./tools/dprControl";
import AdaptiveDpr from "./tools/adaptiveDpr";
import ToolBar from "./components/ToolBar";

let DEBUG_INFO = console.log;

export default class Table {
    constructor(containerId = 'a4-table', theme) {
        this.pixel = 2;

        this.width = 20*40*this.pixel;
        this.height = 20*30*this.pixel;

        this.zoom = {
            current: 1,
            min: 0.1,
            max: 3,
        }

        // 改进触摸状态跟踪
        this.touch = {
            lastDistance: 0,
            lastCenter: { x: 0, y: 0 },
            lastScale: 1,
            lastPosition: { x: 0, y: 0 },
            isZooming: false,
            initialScale: 1,
            initialPosition: { x: 0, y: 0 }
        };

        // 添加缩放模式标志
        this.isZoomMode = false;
        this.previousTool = null;
        
        // 添加上下文监控标志
        this.isContextMonitorActive = false;
        this.contextMonitorTool = null;
        
        // 添加DPR控制标志
        this.isDprControlActive = false;
        this.dprControlTool = null;
        
        // 创建自适应DPR实例
        this.adaptiveDpr = new AdaptiveDpr({
            targetPixelCount: 2000000, // 约200万像素
            minDpr: 0.75,
            maxDpr: 2.0
        });

        // 添加缩放模式的CSS样式
        const style = document.createElement('style');
        style.textContent = `
            .zoom-mode {
                cursor: move !important;
                background-color: rgba(200, 230, 255, 0.1) !important;
            }
            .zoom-mode::after {
                content: "缩放模式";
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(0, 120, 255, 0.7);
                color: white;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 14px;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);

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
        
        // 初始化上下文监控工具
        this.contextMonitorTool = new ContextMonitorTool(this);
        
        // 初始化DPR控制工具
        this.dprControlTool = new DprControlTool(this);

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
            x: (gPointer.x - gLayerPos.x) / this.zoom.current,
            y: (gPointer.y - gLayerPos.y) / this.zoom.current,
        }
    }

    updateZoom(e) {
        e.preventDefault();
        
        const oldScale = this.zoom.current;
        const mousePointTo = {
            x: (e.clientX - this.gLayer.x()) / oldScale,
            y: (e.clientY - this.gLayer.y()) / oldScale,
        };
        
        // 根据滚轮方向调整缩放
        const direction = e.deltaY > 0 ? -1 : 1;
        const factor = 0.1;
        const newScale = direction > 0 ? oldScale * (1 + factor) : oldScale / (1 + factor);
        
        // 限制缩放范围
        this.zoom.current = Math.max(this.zoom.min, Math.min(this.zoom.max, newScale));
        
        // 应用缩放
        this.gLayer.scale({ x: this.zoom.current, y: this.zoom.current });
        
        // 调整位置以保持鼠标位置不变
        const newPos = {
            x: e.clientX - mousePointTo.x * this.zoom.current,
            y: e.clientY - mousePointTo.y * this.zoom.current
        };
        
        this.gLayer.position(newPos);
        this.gLayer.batchDraw();
        
        // 保存当前缩放状态到 stage 属性中
        this.stage.scaleX(this.zoom.current);
        this.stage.scaleY(this.zoom.current);
        
        DEBUG_INFO("Zoom: " + this.zoom.current.toFixed(2));
    }

    /*
        Tool relate 
    */ 
    registerTool(name, tool) {
        this.tools[name] = tool;
    }

    // 添加进入缩放模式的方法
    enterZoomMode() {
        if (this.isZoomMode) return; // 已经在缩放模式
        
        this.isZoomMode = true;
        this.previousTool = this.currentTool ? this.currentTool.name : null;
        
        if (this.currentTool) {
            this.currentTool.deactivate();
        }
        
        DEBUG_INFO("进入缩放模式");
        document.getElementById('a4-table').classList.add('zoom-mode');
        document.getElementById('a4-table').style.cursor = 'move';
    }

    // 添加退出缩放模式的方法
    exitZoomMode() {
        if (!this.isZoomMode) return; // 不在缩放模式
        
        this.isZoomMode = false;
        document.getElementById('a4-table').classList.remove('zoom-mode');
        document.getElementById('a4-table').style.cursor = 'default';
        
        if (this.previousTool) {
            this.setActiveTool(this.previousTool);
            DEBUG_INFO("退出缩放模式，恢复工具: " + this.previousTool);
        } else {
            DEBUG_INFO("退出缩放模式");
        }
    }

    setActiveTool(name) {
        // 如果在缩放模式且尝试激活工具，先退出缩放模式
        if (this.isZoomMode && name) {
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
            'keyup',
            'touchstart',
            'touchmove',
            'touchend'
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
            'keyup',
            'touchstart',
            'touchmove',
            'touchend'
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
        // 检查事件是否来自工具栏
        if (event.target && (
            event.target.closest && event.target.closest('#konva-toolbar') || 
            event.target.id === 'konva-toolbar' ||
            event.target.classList && event.target.classList.contains('konva-toolbar-button')
        )) {
            // 如果事件来自工具栏，不处理Canvas事件
            return;
        }
        
        // 如果在缩放模式下，优先处理所有触摸事件
        if (this.isZoomMode && (eventType === 'touchstart' || eventType === 'touchmove' || eventType === 'touchend' || 
                               eventType === 'pointerdown' || eventType === 'pointermove' || eventType === 'pointerup')) {
            // 处理双指缩放
            if (eventType === 'touchstart' && event.touches.length === 2) {
                this.touch.isZooming = true;
                this.isDragging = false; // 确保拖动状态被重置
                this.touch.initialScale = this.zoom.current;
                this.touch.initialPosition = {
                    x: this.stage.x(),
                    y: this.stage.y()
                };
                
                // 记录初始触摸点和中心点
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                this.touch.initialDistance = this.getDistance(touch1, touch2);
                this.touch.initialCenter = {
                    x: (touch1.clientX + touch2.clientX) / 2,
                    y: (touch1.clientY + touch2.clientY) / 2
                };
                
                // console.log('ZOOM_LOG: 缩放模式-双指触摸开始，重置缩放状态', {
                //     initialScale: this.touch.initialScale,
                //     initialPosition: this.touch.initialPosition,
                //     initialDistance: this.touch.initialDistance,
                //     initialCenter: this.touch.initialCenter
                // });
                event.preventDefault();
                return;
            } else if (eventType === 'touchmove') {
                if (event.touches.length === 2 && this.touch.isZooming) {
                    this.handleTouchZoom(event);
                    event.preventDefault();
                    return;
                } else if (event.touches.length === 1 && this.isDragging) {
                    // 单指拖动处理
                    // 获取当前触摸位置
                    const touch = event.touches[0];
                    const currentTouchPos = {
                        x: touch.clientX,
                        y: touch.clientY
                    };
                    
                    // 计算触摸点移动的距离
                    const deltaX = currentTouchPos.x - this.dragStartTouchPos.x;
                    const deltaY = currentTouchPos.y - this.dragStartTouchPos.y;
                    
                    // 更新舞台位置，使手指下方的内容跟随移动
                    const newX = this.dragStartStagePos.x + deltaX;
                    const newY = this.dragStartStagePos.y + deltaY;
                    
                    this.stage.x(newX);
                    this.stage.y(newY);
                    
                    // console.log(`ZOOM_LOG: 缩放模式-拖动中`, {
                    //     deltaX,
                    //     deltaY,
                    //     newStagePos: { x: newX, y: newY }
                    // });
                    
                    event.preventDefault();
                    return;
                }
            } else if (eventType === 'touchend') {
                // 处理触摸结束事件
                this.touchend(event);
                event.preventDefault();
                return;
            }
            
            // 处理单指拖动（平移）- 仅当不在缩放状态时
            if (eventType === 'touchstart' && event.touches.length === 1 && !this.touch.isZooming) {
                // 开始拖动
                this.isDragging = true;
                
                // 记录触摸点在舞台上的位置（考虑缩放）
                const touch = event.touches[0];
                const touchPos = {
                    x: touch.clientX,
                    y: touch.clientY
                };
                
                // 记录舞台当前位置
                this.dragStartStagePos = {
                    x: this.stage.x(),
                    y: this.stage.y()
                };
                
                // 记录触摸起始点
                this.dragStartTouchPos = touchPos;
                
                console.log('ZOOM_LOG: 缩放模式-单指拖动开始', {
                    touchPos,
                    stagePos: this.dragStartStagePos
                });
                
                event.preventDefault();
                return;
            }
            
            // 处理鼠标/指针事件（桌面端）
            if (eventType === 'pointerdown' && this.isZoomMode) {
                this.isPointerDragging = true;
                
                // 记录指针在舞台上的位置
                const pointerPos = {
                    x: event.clientX,
                    y: event.clientY
                };
                
                // 记录舞台当前位置
                this.pointerDragStartStagePos = {
                    x: this.stage.x(),
                    y: this.stage.y()
                };
                
                // 记录指针起始点
                this.pointerDragStartPos = pointerPos;
                
                // console.log('ZOOM_LOG: 缩放模式-指针拖动开始', {
                //     pointerPos,
                //     stagePos: this.pointerDragStartStagePos
                // });
                
                event.preventDefault();
                return;
            } else if (eventType === 'pointermove' && this.isPointerDragging) {
                // 获取当前指针位置
                const currentPointerPos = {
                    x: event.clientX,
                    y: event.clientY
                };
                
                // 计算指针移动的距离
                const deltaX = currentPointerPos.x - this.pointerDragStartPos.x;
                const deltaY = currentPointerPos.y - this.pointerDragStartPos.y;
                
                // 更新舞台位置，使指针下方的内容跟随移动
                const newX = this.pointerDragStartStagePos.x + deltaX;
                const newY = this.pointerDragStartStagePos.y + deltaY;
                
                this.stage.x(newX);
                this.stage.y(newY);
                
                // console.log(`ZOOM_LOG: 缩放模式-指针拖动中`, {
                //     deltaX,
                //     deltaY,
                //     newStagePos: { x: newX, y: newY }
                // });
                
                event.preventDefault();
                return;
            } else if (eventType === 'pointerup' && this.isPointerDragging) {
                this.isPointerDragging = false;
                // console.log('ZOOM_LOG: 缩放模式-指针拖动结束', {
                //     finalStagePos: { x: this.stage.x(), y: this.stage.y() }
                // });
                event.preventDefault();
                return;
            }
        }
        
        // 先处理缩放事件
        if (eventType === 'touchstart' || eventType === 'touchmove' || eventType === 'touchend') {
            // 如果是双指触摸，优先处理缩放
            if (event.touches && event.touches.length === 2) {
                if (eventType === 'touchstart') {
                    this.touchstart(event);
                    event.preventDefault();
                    return;
                } else if (eventType === 'touchmove') {
                    this.touchmove(event);
                    event.preventDefault(); // 阻止默认行为
                    return; // 不再传递给工具
                } else if (eventType === 'touchend') {
                    this.touchend(event);
                    event.preventDefault();
                    return;
                }
            } else if (eventType === 'touchend') {
                // 处理从双指到单指的过渡
                this.touchend(event);
                if (this.isDragging) {
                    event.preventDefault();
                    return;
                }
            }
        }
        
        // 其他事件传递给当前工具
        if (this.currentTool && typeof this.currentTool[eventType] === 'function') {
            this.currentTool[eventType](event);
        }
    }

    keydown(e) {
        DEBUG_INFO("Gobal keydown");
        if (e.altKey) {
            DEBUG_INFO("Notice: may switch")     
            switch (e.key) {
                case '1':
                    DEBUG_INFO("Alt+1 pressed");
                    // 执行 Alt+1 的操作
                    this.setActiveTool("pencil")
                    break;
                case '2':
                    DEBUG_INFO("Alt+2 pressed");
                    this.setActiveTool("select")
                    // 执行 Alt+2 的操作
                    break;
                case '3':
                    DEBUG_INFO("Alt+3 pressed");
                    // 执行 Alt+3 的操作
                    break;
                default:
                    DEBUG_INFO("Alt + another key pressed");
                    // 处理其他 Alt 组合键
            }
            DEBUG_INFO("Notice: may switch")           
        }
        else {
            DEBUG_INFO("Tool please");
            this.currentTool.keydown(e);
        }
    }

    // 计算两个触摸点之间的距离
    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // 处理触摸缩放
    handleTouchZoom(e) {
        e.preventDefault();
        
        if (e.touches.length !== 2) {
            DEBUG_INFO("ZOOM_LOG: 触摸点不足2个，退出缩放");
            return;
        }

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        
        // 计算当前触摸状态
        const currentDistance = this.getDistance(touch1, touch2);
        const currentCenter = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
        
        // DEBUG_INFO("ZOOM_LOG: 触摸点1", 
        //           JSON.stringify({x: touch1.clientX.toFixed(1), y: touch1.clientY.toFixed(1)}));
        // DEBUG_INFO("ZOOM_LOG: 触摸点2", 
        //           JSON.stringify({x: touch2.clientX.toFixed(1), y: touch2.clientY.toFixed(1)}));
        // DEBUG_INFO("ZOOM_LOG: 当前距离", currentDistance.toFixed(1));
        // DEBUG_INFO("ZOOM_LOG: 当前中心点", 
        //           JSON.stringify({x: currentCenter.x.toFixed(1), y: currentCenter.y.toFixed(1)}));

        if (!this.touch.isZooming) {
            // 首次触摸，记录初始状态
            this.touch.initialDistance = currentDistance;
            this.touch.initialCenter = { ...currentCenter };
            this.touch.initialScale = this.zoom.current;
            this.touch.initialPosition = {
                x: this.stage.x(),
                y: this.stage.y()
            };
            this.touch.isZooming = true;
            
            DEBUG_INFO("ZOOM_LOG: 初始化缩放状态", JSON.stringify({
                initialDistance: this.touch.initialDistance.toFixed(1),
                initialCenter: {
                    x: this.touch.initialCenter.x.toFixed(1), 
                    y: this.touch.initialCenter.y.toFixed(1)
                },
                initialScale: this.touch.initialScale.toFixed(3),
                initialPosition: {
                    x: this.touch.initialPosition.x.toFixed(1), 
                    y: this.touch.initialPosition.y.toFixed(1)
                }
            }));
            return;
        }

        // 使用直接的缩放比例计算，避免累积误差
        const scaleRatio = currentDistance / this.touch.initialDistance;
        
        // 计算新的缩放值，相对于触摸开始时的缩放值
        let newScale = this.touch.initialScale * scaleRatio;
        
        // 限制缩放范围
        const oldScale = newScale;
        newScale = Math.max(this.zoom.min, Math.min(this.zoom.max, newScale));
        
        // 如果缩放被限制，调整scaleRatio
        const adjustedScaleRatio = newScale / this.touch.initialScale;
        
        DEBUG_INFO("ZOOM_LOG: 缩放计算", JSON.stringify({
            initialDistance: this.touch.initialDistance.toFixed(1),
            currentDistance: currentDistance.toFixed(1),
            scaleRatio: scaleRatio.toFixed(3),
            adjustedScaleRatio: adjustedScaleRatio.toFixed(3),
            initialScale: this.touch.initialScale.toFixed(3),
            calculatedScale: oldScale.toFixed(3),
            limitedScale: newScale.toFixed(3)
        }));
        
        // 使用更精确的位置计算方法
        // 1. 计算初始中心点在舞台坐标系中的位置
        const initialCenterInStage = {
            x: (this.touch.initialCenter.x - this.touch.initialPosition.x) / this.touch.initialScale,
            y: (this.touch.initialCenter.y - this.touch.initialPosition.y) / this.touch.initialScale
        };
        
        // 2. 计算当前中心点应该在舞台坐标系中的位置
        const currentCenterInStage = {
            x: (currentCenter.x - this.touch.initialPosition.x) / this.touch.initialScale,
            y: (currentCenter.y - this.touch.initialPosition.y) / this.touch.initialScale
        };
        
        // 3. 计算中心点的移动（在舞台坐标系中）
        const centerDeltaInStage = {
            x: currentCenterInStage.x - initialCenterInStage.x,
            y: currentCenterInStage.y - initialCenterInStage.y
        };
        
        // 4. 计算新的舞台位置
        // 新位置 = 初始位置 + 中心点移动 * 初始缩放 - 初始中心点 * (新缩放 - 初始缩放)
        const newX = this.touch.initialPosition.x + 
                    centerDeltaInStage.x * this.touch.initialScale - 
                    initialCenterInStage.x * (newScale - this.touch.initialScale);
        
        const newY = this.touch.initialPosition.y + 
                    centerDeltaInStage.y * this.touch.initialScale - 
                    initialCenterInStage.y * (newScale - this.touch.initialScale);
        
        // DEBUG_INFO("ZOOM_LOG: 位置计算", JSON.stringify({
        //     initialCenterInStage: {
        //         x: initialCenterInStage.x.toFixed(1), 
        //         y: initialCenterInStage.y.toFixed(1)
        //     },
        //     currentCenterInStage: {
        //         x: currentCenterInStage.x.toFixed(1), 
        //         y: currentCenterInStage.y.toFixed(1)
        //     },
        //     centerDeltaInStage: {
        //         x: centerDeltaInStage.x.toFixed(1), 
        //         y: centerDeltaInStage.y.toFixed(1)
        //     },
        //     initialPosition: {
        //         x: this.touch.initialPosition.x.toFixed(1), 
        //         y: this.touch.initialPosition.y.toFixed(1)
        //     },
        //     newPosition: {x: newX.toFixed(1), y: newY.toFixed(1)},
        //     currentCenter: {x: currentCenter.x.toFixed(1), y: currentCenter.y.toFixed(1)},
        //     initialCenter: {
        //         x: this.touch.initialCenter.x.toFixed(1), 
        //         y: this.touch.initialCenter.y.toFixed(1)
        //     }
        // }));
        
        // 应用新的缩放和位置
        this.zoom.current = newScale;
        this.stage.scale({ x: newScale, y: newScale });
        this.stage.position({x: newX, y: newY});
        this.stage.batchDraw();
        
        // 更新调试信息
        DEBUG_INFO("ZOOM_LOG: 缩放完成", JSON.stringify({
            finalScale: newScale.toFixed(3),
            finalPosition: {x: newX.toFixed(1), y: newY.toFixed(1)},
            ratio: adjustedScaleRatio.toFixed(3)
        }));
    }

    // 添加日志到 touchstart
    touchstart(e) {
        if (e.touches.length === 2) {
            // 双指触摸，初始化缩放状态
            this.touch.isZooming = true;
            this.touch.initialScale = this.zoom.current;
            this.touch.initialPosition = {
                x: this.stage.x(),
                y: this.stage.y()
            };
            console.log('ZOOM_LOG: 双指触摸开始，重置缩放状态');
        }
    }

    touchmove(e) {
        if (e.touches.length === 2) {
            this.handleTouchZoom(e);
        }
    }

    // 添加日志到 touchend
    touchend(e) {
        // 如果触摸点少于2个，重置缩放状态
        if (e.touches.length < 2) {
            // 如果之前正在进行缩放操作，现在只剩一个手指
            if (this.touch.isZooming && e.touches.length === 1) {
                // 记录当前剩余的触摸点位置，作为新的拖动起始点
                const touch = e.touches[0];
                this.isDragging = true;
                this.dragStartTouchPos = {
                    x: touch.clientX,
                    y: touch.clientY
                };
                
                // 记录当前舞台位置作为拖动的起始位置
                this.dragStartStagePos = {
                    x: this.stage.x(),
                    y: this.stage.y()
                };
                
                console.log('ZOOM_LOG: 从缩放过渡到拖动', {
                    touchPos: this.dragStartTouchPos,
                    stagePos: this.dragStartStagePos
                });
            }
            
            this.touch.isZooming = false;
            console.log('ZOOM_LOG: 触摸结束，重置缩放状态');
        }
        
        // 如果没有触摸点了，完全重置所有状态
        if (e.touches.length === 0) {
            this.isDragging = false;
            this.touch.isZooming = false;
            console.log('ZOOM_LOG: 所有触摸结束，完全重置状态');
        }
    }

    // 激活上下文监控
    activateContextMonitor() {
        if (this.isContextMonitorActive) {
            console.warn('上下文监控已经激活');
            return;
        }
        
        console.log('激活上下文监控');
        
        // 激活监控工具
        if (this.contextMonitorTool) {
            this.contextMonitorTool.activate();
        } else {
            this.contextMonitorTool = new ContextMonitorTool(this);
            this.contextMonitorTool.activate();
        }
        
        this.isContextMonitorActive = true;
    }
    
    // 停用上下文监控
    deactivateContextMonitor() {
        if (!this.isContextMonitorActive) {
            console.warn('上下文监控未激活');
            return;
        }
        
        console.log('停用上下文监控');
        
        // 停用监控工具
        if (this.contextMonitorTool) {
            this.contextMonitorTool.deactivate();
        }
        
        this.isContextMonitorActive = false;
    }
    
    // 激活DPR控制
    activateDprControl() {
        if (this.isDprControlActive) {
            console.warn('DPR控制已经激活');
            return;
        }
        
        console.log('激活DPR控制');
        
        // 激活DPR控制工具
        if (this.dprControlTool) {
            this.dprControlTool.activate();
        } else {
            this.dprControlTool = new DprControlTool(this);
            this.dprControlTool.activate();
        }
        
        this.isDprControlActive = true;
    }
    
    // 停用DPR控制
    deactivateDprControl() {
        if (!this.isDprControlActive) {
            console.warn('DPR控制未激活');
            return;
        }
        
        console.log('停用DPR控制');
        
        // 停用DPR控制工具
        if (this.dprControlTool) {
            this.dprControlTool.deactivate();
        }
        
        this.isDprControlActive = false;
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
}
