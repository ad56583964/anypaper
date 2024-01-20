import Konva from "konva";
import AnyA4Tool from "./commands";

let DEBUG_INFO = console.log;

export default class DrawingApp {
    constructor(containerId, toolSelectorId, theme) {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.toolSelectorId = toolSelectorId;

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
        this.gState = "idle";

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
            fill: "#ffd"
        })

        this.selectedBlock = new Konva.Rect({
            width: 20,
            height: 40,
            fill: "orange"
        })

        this.gLayer.add(this.hangingBlock)

        // Draw table
        this.initTable();

        // Event listeners for drawing
        // this.stage.on("mouseup touchend", () => this.stopPainting());
        window.addEventListener("resize", (e) => this.handleResize(e));
        window.addEventListener("wheel", (e) => this.handleWheel(e));
        window.addEventListener("pointermove", (e) => this.handleMove(e));
        window.addEventListener("pointerdown", (e) => this.handleClick(e));
        window.addEventListener("keydown", (e) => this.handleKey(e));
        // this.stage.
    }

    initTable() {
        this.table = new Konva.Rect({
            width: this.stage.width(),
            height: this.stage.height(),
            fill: "#ddf",
        });

        this.gLayer.add(this.table);
        // 确保背景在其他元素的下方
        this.table.moveToBottom();

        this.gridGroup = new Konva.Group({
            listening: false
        })
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
        })

        this.gLayer.add(this.hit);

        this.gLayer.draw();
    }

    handleResize() {
        DEBUG_INFO("Enter handleResize");
        this.gState = "zoom";
        if (this.gState == "zoom") {
            // 这两个 都要 单独设置 ？？
            // debug pointer

            let resizeTable = () => {
                DEBUG_INFO("Enter resizeTable");
                this.table.setAttrs({
                    width: window.innerWidth,
                    height: window.innerHeight,
                });
                this.stage.setAttrs({
                    width: window.innerWidth,
                    height: window.innerHeight,
                });
                DEBUG_INFO(this.stage.getAttr("width"));
                this.stage.batchDraw();
            }
            resizeTable()
        }
    }

    handleWheel(e) {
        DEBUG_INFO("Enter handleWheel");
        this.hit.setAttrs({
            x: this.currentPointer.x,
            y: this.currentPointer.y
        })

        const zoom_max = 2
        const zoom_min = 0.5
         
        if(e.deltaY > 0)        
            this.currentSize += 0.1
        else if(e.deltaY < 0)   
            this.currentSize -= 0.1

        if(this.currentSize < zoom_min)
            this.currentSize = zoom_min
        if(this.currentSize > zoom_max)
            this.currentSize = zoom_max
        this.gLayer.scaleX(this.currentSize)
        this.gLayer.scaleY(this.currentSize)
    }

    handleMove(e) {
        DEBUG_INFO("Enter handleMove");

        // the only e.client entrypoint
        this.currentPointer = {
            x:(e.clientX - 12)/this.currentSize,
            y:(e.clientY - 12)/this.currentSize
        }

        this.currentBlock = {
            // -2 to fit the block margin
            x:Math.floor((this.currentPointer.x) / this.block.width),
            y:Math.floor((this.currentPointer.y) / this.block.height)
        }

        this.hangingBlock.setAttrs({
            x: this.currentBlock.x * this.block.width,
            y: this.currentBlock.y * this.block.height
        })
        
        DEBUG_INFO("currentBlock:",this.currentBlock);
    }

    handleClick(e){
        DEBUG_INFO("Enter handleClick");
        
        if(this.gState == "idle" || "typing"){
            DEBUG_INFO("Enter state idle");
            this.gState = 'typing'
            this.selectBlock();

            // init note
            this.note = {
                currentNote: "",
                lastNote: ""
            }
            // init textline
            DEBUG_INFO("Enter textline");
            this.textline = new Konva.Text({
                fill: '#333',
                fontFamily: "monospace",
                text: this.note.currentNote,
                x: this.currentBlock.x * this.block.width,
                y: this.currentBlock.y * this.block.height,
                align: "right",
                letterSpacing: 0,
                fontSize: 40
            })
            this.gLayer.add(this.textline)
        }
    }

    handleKey(e){
        DEBUG_INFO("Enter handleKey");

        switch(this.gState) {
            case 'typing':
                if(e.key == 'Shift'){

                }
                else if(e.key == 'Backspace'){
                    DEBUG_INFO("remove text")
                    this.note.currentNote = this.note.currentNote.slice(0, -1);
                    this.textline.setAttrs({
                        text: this.note.currentNote,
                    })
                }
                else if(e.key == 'Escape'){
                    DEBUG_INFO("remove selectedBlock")
                    this.selectedBlock.remove()
                    this.gState = 'idle';
                }
                else{
                    DEBUG_INFO("add text")
                    this.note.currentNote += e.key
                    this.textline.setAttrs({
                        text: this.note.currentNote,
                    })
                }
                break;
            // 你可以根据需要添加其他的情况
            // case 'anotherState':
            //   ...
            //   break;
            default:
                // 如果没有匹配的情况, 这里是默认的处理方式
                break;
        }
    }

    selectBlock(){
        this.selectedBlock.setAttrs({
            x: this.currentBlock.x * this.block.width,
            y: this.currentBlock.y * this.block.height,
        })
        this.gLayer.add(this.selectedBlock)
    }

    createPaper(x,y){
        DEBUG_INFO("create paper");
          // Create a new layer for the paper with a clipping region
        this.paper = new Konva.Rect({
            x: this.currentBlock.x * this.block.width,
            y: this.currentBlock.y * this.block.height,
            width: 300,
            height: 400,
            fill: '#fff',
          });

        this.gLayer.add(this.paper);
    }
}
