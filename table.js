import Konva from "konva";
import AnyA4Tool from "./commands";
import TableEvent from "./event";
import PaperTool from "./paper";

let DEBUG_INFO = console.log;

export default class GridTable {
    
    constructor(containerId, theme) {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

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
            // it's yellow
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

    initTable() {
        this.table = new Konva.Rect({
            width: this.stage.width(),
            height: this.stage.height(),
            fill: "#ddf",
        });

        this.gLayer.add(this.table);
        // 确保背景在其他元素的下方(konva api)
        this.table.moveToBottom();

        this.gridGroup = new Konva.Group({
            listening: false
        })

        //使用这个方式描述 点阵背景会有运行时开销吗 ？
        // draw grid background
        // need many circles ??
        for (let i = 0; i < window.innerWidth / 20; i++) {
            for (let j = 0; j < window.innerHeight / 40; j++) {
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

        // debug shape
        this.hit = new Konva.Rect({
            width: 10,
            height: 10,
            fill:"red",
            offsetX: 5,
            offsetY: 5,
        })

        this.gLayer.add(this.hit);

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
        this.stage.setAttrs({
            width: window.innerWidth,
            height: window.innerHeight,
        });
    }

    selectBlock(x,y){
        this.selectedBlock.setAttrs({
            x: this.currentBlock.x * this.block.width,
            y: this.currentBlock.y * this.block.height,
        })
        this.gLayer.add(this.selectedBlock)
    }

    zoom(scroll){
        const zoom_max = 3
        const zoom_min = 0.1
        
        var oldScale = this.currentSize

        // limit the zoom range
        if(scroll < 0)        
            this.currentSize += 0.1
        else if(scroll > 0)
            this.currentSize -= 0.1

        if(this.currentSize < zoom_min)
            this.currentSize = zoom_min
        if(this.currentSize > zoom_max)
            this.currentSize = zoom_max
        
        // step1: scale the glayer
        this.gLayer.scaleX(this.currentSize)
        this.gLayer.scaleY(this.currentSize)

        // step2: move the glayer
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
        // panX = this

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
        })
    }

    move(e){
        // the only e.client entrypoint
        this.gPointer = this.stage.getPointerPosition();
        
        var gLayerPos = this.gLayer.getAbsolutePosition()

        this.currentPointer = {
            // +4 to fit the block margin
            x:(this.gPointer.x - gLayerPos.x) / this.currentSize,
            y:(this.gPointer.y - gLayerPos.y) / this.currentSize,
        }

        this.currentBlock = this.getcurrentBlock()
        // 此处的 currentBlock 实际是指 gLayer 为坐标系起点
        DEBUG_INFO("currentPointer:",this.currentPointer.x - gLayerPos.x , this.currentPointer.y - gLayerPos.y);
        DEBUG_INFO("currentBlock:",this.getcurrentBlock());

        this.updateHangingBlock(this.currentBlock.x,this.currentBlock.y)

    }
}
