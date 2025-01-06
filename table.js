import Konva from "konva";
import AnyA4Tool from "./commands";
import PaperTool from "./tools/paper";
import PencilTool from "./tools/pencil";
import SelectTool from "./tools/select";

let DEBUG_INFO = console.log;

export default class Table {
    constructor(containerId = 'a4-table', theme) {
        this.width = 20*40;
        this.height = 20*30;

        this.zoom = {
            current: 1,
            min: 0.1,
            max: 3,
        }

        // Setup the stage (global enviroment)
        this.stage = new Konva.Stage({
            container: containerId,
            width: this.width,
            height: this.height,
        });

        // Setup the layers
        this.gLayer = new Konva.Layer();
        this.stage.add(this.gLayer);
        this.state = "idle";

        this.pointer = {
            pos: {
                x: 0,
                y: 0,
            },
        };

        this.block = {
            width: 20,
            height: 40
        }

        this.stage.container().style.cursor = 'crosshair'

        // Draw table
        this.initTable();

        // Tools
        this.currentTool = null;
        this.tools = {};

        // this.action = new TableAction(this)

        this.eventListeners = {};

        this.registerTool("select",new SelectTool(this))
        // this.registerTool("paper",new PaperTool(this))
        this.registerTool("pencil",new PencilTool(this))

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
            listening: false
        })

        //使用这个方式描述 点阵背景会有运行时开销吗 ？
        // draw grid background
        // need many circles ??
        for (let i = 1; i < this.width / this.block.width; i++) {
            for (let j = 1; j < this.height / this.block.height; j++) {
                var circle = new Konva.Circle({
                    x: i * 20,
                    y: j * 40,
                    radius: 1,
                    fill: "black",
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
            width: this.stage.width(),
            height: this.stage.height(),
            //grey
            fill: "grey",
        });

        this.gLayer.add(this.konva_attr);
        // 确保背景在其他元素的下方(konva api)
        this.konva_attr.moveToBottom();


        this.initGridBG();

        this.gLayer.draw();
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
        var gLayerPos = this.gLayer.getAbsolutePosition();

        this.currentPointer = {
            x:(gPointer.x - gLayerPos.x) / this.zoom.current,
            y:(gPointer.y - gLayerPos.y) / this.zoom.current,
        }
    }

    updateZoom(e){
        const scroll = e.deltaY;
        var oldScale = this.zoom.current

        // determine the zoom direction
        DEBUG_INFO("zoom once")
        if(scroll < 0)        
            this.zoom.current += 0.1
        else if(scroll > 0)
            this.zoom.current -= 0.1

        // limit the zoom range
        if(this.zoom.current < this.zoom.min)
            this.zoom.current = this.zoom.min
        if(this.zoom.current > this.zoom.max)
            this.zoom.current = this.zoom.max
        
        // step1: scale the glayer
        this.gLayer.scaleX(this.zoom.current)
        this.gLayer.scaleY(this.zoom.current)

        // step2: move the glayer
        // move to the pointer as center
        const pointer = this.stage.getPointerPosition();

        const mousePointTarget = {
            x: (pointer.x - this.gLayer.x()) / oldScale,
            y: (pointer.y - this.gLayer.y()) / oldScale,
            };

        // DEBUG_INFO("gLayerXY",_px,_py);
        this.gLayer.setAttrs({
            x: pointer.x - mousePointTarget.x * this.zoom.current,
            y: pointer.y - mousePointTarget.y * this.zoom.current,
        })

        this.fitWindow();
    }

    /*
        Tool relate 
    */ 
    registerTool(name, tool) {
        this.tools[name] = tool;
    }

    setActiveTool(name) {
        if (this.currentTool) {
            this.currentTool.deactivate();
            this.removeEventListeners();
        }

        this.currentTool = this.tools[name];
            
        if (this.currentTool) {
            DEBUG_INFO("activate tool")
            this.currentTool.activate();
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        const events = ['wheel', 'pointermove', 'pointerdown', 'pointerup', 'keyup'];
        events.forEach(eventType => {
            const listener = (e) => this.handleEvent(eventType, e);
            this.eventListeners[eventType] = listener;
            window.addEventListener(eventType, listener);
        });
    }

    removeEventListeners() {
        const events = ['wheel', 'pointermove', 'pointerdown', 'pointerup', 'keyup'];
        events.forEach(eventType => {
            const listener = this.eventListeners[eventType];
            if (listener) {
                window.removeEventListener(eventType, listener);
                delete this.eventListeners[eventType];
            }
        });
    }

    handleEvent(eventType, event) {
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
}
