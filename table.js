import Konva from "konva";
import AnyA4Tool from "./commands";
import TableEvent from "./event";
import PaperTool from "./paper";

let DEBUG_INFO = console.log;

export default class Table {
    
    constructor(containerId = 'a4-table', theme) {
        this.width = 20*40;
        this.height = 20*30;

        this.currentBlock = {
            x: 0,
            y: 0
        }
        this.currentSize = 1

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
        this.paperTool = new PaperTool
        
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
        for (let i = 0; i <= this.width / this.block.width; i++) {
            for (let j = 0; j <= this.height / this.block.height; j++) {
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

    initHitDebug(){
        // debug shape
        this.hit = new Konva.Rect({
            width: 10,
            height: 10,
            fill:"red",
            offsetX: 5,
            offsetY: 5,
        })

        this.gLayer.add(this.hit);
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
            fill: "#ddd",
        });

        this.gLayer.add(this.table);
        // 确保背景在其他元素的下方(konva api)
        this.table.moveToBottom();


        this.initGridBG();
        this.initHitDebug();

        this.gLayer.draw();
    }

    resizeTable(width,height) {
        this.stage.setAttrs({
            width: width,
            height: height,
        });
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
        if(!this.isOutside()){
            this.selectedBlock.setAttrs({
                x: this.currentBlock.x * this.block.width,
                y: this.currentBlock.y * this.block.height,
            })
            this.gLayer.add(this.selectedBlock)
        }
    }

    zoom(scroll){
        const zoom_max = 3
        const zoom_min = 0.1
        
        var oldScale = this.currentSize

        // determine the zoom direction
        if(scroll < 0)        
            this.currentSize += 0.1
        else if(scroll > 0)
            this.currentSize -= 0.1

        // limit the zoom range
        if(this.currentSize < zoom_min)
            this.currentSize = zoom_min
        if(this.currentSize > zoom_max)
            this.currentSize = zoom_max
        
        // step1: scale the glayer
        this.gLayer.scaleX(this.currentSize)
        this.gLayer.scaleY(this.currentSize)

        // step2: move the glayer
        // move to the pointer as center
        // question: scale 改变了什么？ 哪个变量会随之改变呢 ？ x，y好像不会随之改变额
        const pointer = this.stage.getPointerPosition();
        const mousePointTo = {
            x: (pointer.x - this.gLayer.x()) / oldScale,
            y: (pointer.y - this.gLayer.y()) / oldScale,
          };

        // DEBUG_INFO("gLayerXY",_px,_py);
        this.gLayer.setAttrs({
            x: pointer.x - mousePointTo.x * this.currentSize,
            y: pointer.y - mousePointTo.y * this.currentSize,
        })

        // this.gLayer.x = this.panX*this.currentSize
        // this.gLayer.y = this.panY*this.currentSize
        this.fitWindow();

    }

    updateHit(){
        this.hit.setAttrs({
            x: this.currentPointer.x,
            y: this.currentPointer.y
        })
    }

    getcurrentBlock(){
        return {
            x:Math.floor((this.currentPointer.x) / this.block.width),
            y:Math.floor((this.currentPointer.y) / this.block.height)
        }
    }

    updateHangingBlock(x,y){
        this.hangingBlock.setAttrs({
            x: x * this.block.width,
            y: y * this.block.height,
            visible: true
        })
    }

    hideHangingBlock(){
        this.hangingBlock.setAttrs({
            visible: false
        })
    }

    isOutside(){
        return this.currentPointer.x < 0 || this.currentPointer.x*this.currentSize > this.stage.width() || this.currentPointer.y < 0 || this.currentPointer.y*this.currentSize > this.stage.height()
    }

    move(e){
        // the only e.client entrypoint
        this.gPointer = this.stage.getPointerPosition();
        
        var gLayerPos = this.gLayer.getAbsolutePosition()

        this.currentPointer = {
            x:(this.gPointer.x - gLayerPos.x) / this.currentSize,
            y:(this.gPointer.y - gLayerPos.y) / this.currentSize,
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

        if(this.isOutside()){
            this.hideHangingBlock()
        }
        else{
            this.updateHangingBlock(this.currentBlock.x,this.currentBlock.y)
        }

        DEBUG_INFO(this.isOutside())

    }
}
