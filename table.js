import Konva from "konva";
import AnyA4Tool from "./commands";
import PaperTool from "./paper";
import PencilTool from "./pencil";

let DEBUG_INFO = console.log;

export default class Table {
    constructor(containerId = 'a4-table', theme) {
        this.width = 20*40;
        this.height = 20*30;

        this.currentBlock = {
            x: 0,
            y: 0
        }

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

        this.hangingBlock = new Konva.Rect({
            width: 20,
            height: 40,
            fill: "green",
        })

        this.selectedBlock = new Konva.Rect({
            width: 20,
            height: 40,
            fill: "orange",
        })

        this.gLayer.add(this.hangingBlock)

        // Draw table
        this.initTable();

        // Tools
        this.currentTool = null;
        this.tools = {};

        this.registerTool("select",new SelectTool(this))
        this.registerTool("paper",new PaperTool(this))
        this.registerTool("pencil",new PencilTool(this))

        this.action = new TableAction(this)
        this.debug = new TableDebug(this)
        this.eventManage = new TableEvent(this)
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
        this.table = new Konva.Rect({
            width: this.stage.width(),
            height: this.stage.height(),
            //grey
            fill: "grey",
        });

        this.gLayer.add(this.table);
        // 确保背景在其他元素的下方(konva api)
        this.table.moveToBottom();


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

    selectBlock(x,y){
        if(!this._isOutside()){
            this.selectedBlock.setAttrs({
                x: this.currentBlock.x * this.block.width,
                y: this.currentBlock.y * this.block.height,
            })
            this.gLayer.add(this.selectedBlock)
        }
    }
    
    getcurrentBlock(){
        return {
            x:Math.floor((this.currentPointer.x) / this.block.width),
            y:Math.floor((this.currentPointer.y) / this.block.height)
        }
    }

    _updateHangingBlock(x,y){
        this.hangingBlock.setAttrs({
            x: x * this.block.width,
            y: y * this.block.height,
            visible: true
        })
    }

    _hideHangingBlock(){
        this.hangingBlock.setAttrs({
            visible: false
        })
    }

    _isOutside(){
        DEBUG_INFO("height"+this.table.height()+" width"+this.table.width());
        // seems stage will auto extern
        DEBUG_INFO("height"+this.stage.height()+" width"+this.stage.width());
        return this.currentPointer.x*this.zoom.current < 0 || this.currentPointer.x > this.table.width() || this.currentPointer.y < 0 || this.currentPointer.y > this.table.height()
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
        }
        this.currentTool = this.tools[name];
        if (this.currentTool) {
            this.currentTool.activate();
        }
        this.setupEventListeners();
    }

    setupEventListeners() {
        const events = ['pointermove', 'pointerdown', 'pointerup', 'keydown', 'keyup'];
        events.forEach(eventType => {
            window.addEventListener(eventType, (e) => this.handleEvent(eventType, e));
        });

        // 保留原有的事件
        window.addEventListener("wheel", (e) => this.table.handleWheel(e));
    }

    handleEvent(eventType, event) {
        if (this.currentTool && typeof this.currentTool[eventType] === 'function') {
            this.currentTool[eventType](event);
        }
    }

    move(e){
        // the only e.client entrypoint
        this.gPointer = this.stage.getPointerPosition();
        
        var gLayerPos = this.gLayer.getAbsolutePosition()

        this.currentPointer = {
            x:(this.gPointer.x - gLayerPos.x) / this.zoom.current,
            y:(this.gPointer.y - gLayerPos.y) / this.zoom.current,
        }

        if (window.DebugBarComponentRef && window.DebugBarComponentRef.current) {
            // console.log("hold Ref")
            window.DebugBarComponentRef.current.updateMousePosition(this.currentPointer.x,this.currentPointer.y)
        }
        else{
            console.log("no Ref")
        }

        this.currentBlock = this.getcurrentBlock()
        // 此处的 currentBlock 实际是指 gLayer 为坐标系起点
        // log is effect the performance
        // DEBUG_INFO("currentPointer:",this.currentPointer.x - gLayerPos.x , this.currentPointer.y - gLayerPos.y);
        // DEBUG_INFO("currentBlock:",this.getcurrentBlock());

        if(this._isOutside()){
            this._hideHangingBlock()
        }
        else{
            this._updateHangingBlock(this.currentBlock.x,this.currentBlock.y)
        }

        DEBUG_INFO(this._isOutside())
    }
}

class TableAction {
    constructor(table){
        this.table = table;
    }

    /**
     * @param {number} scroll
     * 
     */
    zoom(scroll){
        
        var oldScale = this.table.zoom.current

        // determine the zoom direction
        if(scroll < 0)        
            this.table.zoom.current += 0.1
        else if(scroll > 0)
            this.table.zoom.current -= 0.1

        // limit the zoom range
        if(this.table.zoom.current < this.table.zoom.min)
            this.table.zoom.current = this.table.zoom.min
        if(this.table.zoom.current > this.table.zoom.max)
            this.table.zoom.current = this.table.zoom.max
        
        // step1: scale the glayer
        this.table.gLayer.scaleX(this.table.zoom.current)
        this.table.gLayer.scaleY(this.table.zoom.current)

        // step2: move the glayer
        // move to the pointer as center
        const pointer = this.table.stage.getPointerPosition();

        const mousePointTarget = {
            x: (pointer.x - this.table.gLayer.x()) / oldScale,
            y: (pointer.y - this.table.gLayer.y()) / oldScale,
            };

        // DEBUG_INFO("gLayerXY",_px,_py);
        this.table.gLayer.setAttrs({
            x: pointer.x - mousePointTarget.x * this.table.zoom.current,
            y: pointer.y - mousePointTarget.y * this.table.zoom.current,
        })

        this.table.fitWindow();
    }

}

class TableDebug {
    constructor(table) {
        this.table = table;

        this.initHitDebug();
    }

    initHitDebug(){
        // debug shape
        this.hit = new Konva.Rect({
            width: 10,
            height: 10,
            fill:"red",
            offsetX: 5,
            offsetY: 5,
        })

        this.table.gLayer.add(this.hit);
    }

    updateHit(){
        this.hit.setAttrs({
            x: this.table.currentPointer.x,
            y: this.table.currentPointer.y
        })
    }
}

class TableEvent {
    constructor(table){
        this.table = table;

        window.addEventListener("resize", (e) => this.handleResize(e));
        window.addEventListener("wheel", (e) => this.handleWheel(e));
        window.addEventListener("pointermove", (e) => this.handleMove(e));
        window.addEventListener("pointerdown", (e) => this.handleClick(e));
        window.addEventListener("keydown", (e) => this.handleKey(e));
    }

    handleWheel(e) {
        DEBUG_INFO("Enter handleWheel");

        this.table.debug.updateHit();
        const delta = e.deltaY;
        DEBUG_INFO("delta: ",delta);

        this.table.action.zoom(delta);
    }

    handleMove(e) {
        // DEBUG_INFO("Enter handleMove");
        this.table.move(e);
        this.table.debug.updateHit();
    }

    handleClick(e){
        DEBUG_INFO("Enter handleClick");
        
        if(this.table.state == "idle" || "typing"){
            DEBUG_INFO("Enter table idle");
            this.table.state = 'typing'
            this.table.selectBlock();
        }
    }

    handleKey(e){
        DEBUG_INFO("Enter handleKey");

        if (event.altKey && event.code === 'Digit1') {
            event.preventDefault(); // 阻止默认行为
            DEBUG_INFO("Alt + 1")
            this.table.setActiveTool("pencil");
        }
    }
}
