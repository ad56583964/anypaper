import Konva from 'konva';

let DEBUG_INFO = console.log;

export default class PencilTool {
    constructor(table){
        DEBUG_INFO("Init PencilTool");
        this.table = table;
        this.initHitDebug();

        this.isdrawing = false;
        
        this.lastDrawPointer = null;
        // this.currentPoints = [];
    }

    activate(){
        DEBUG_INFO("PencilTool activate");
    }

    deactivate(){
        DEBUG_INFO("PencilTool deactivate");
    }

    pointerdown(e){
        DEBUG_INFO("PencilTool pointerdown");
        this.isdrawing = true;
        this.lastDrawPointer = this.table.currentPointer

        // this.currentPoints = [this.table.currentPointer.x, this.table.currentPointer.y];

        this.stylusgroup = new Konva.Group();

        var point = new Konva.Circle({
            x: this.lastDrawPointer.x,
            y: this.lastDrawPointer.y,
            radius: 1,
            fill: "black",
            listening: false,
            draggable: false,

        })
        this.stylusgroup.add(point);

        this.table.gLayer.add(this.stylusgroup);

        this.table.updateCurrentPointer();
        this.updateHit();

        this.table.gLayer.batchDraw();

        DEBUG_INFO("Start drawing")
    }

    pointerup(e){
        DEBUG_INFO("finish drawing")
        this.isdrawing = false;
    }

    pointermove(e){
        // DEBUG_INFO("PencilTool pointermove");
        
        if(this.isdrawing){
            // DEBUG_INFO("keep drawing");
            // DEBUG_INFO(this.table.currentPointer);
            if(this.lastDrawPointer == this.table.currentPointer){
                // DEBUG_INFO("wait move")
            }
            else{
                var point = new Konva.Circle({
                    x: this.lastDrawPointer.x,
                    y: this.lastDrawPointer.y,
                    radius: 1,
                    fill: "black",
                    listening: false,
                    draggable: false,
                })
                this.stylusgroup.add(point);
                this.stylusgroup.cache();
                this.table.gLayer.batchDraw();
                // DEBUG_INFO("Notice: moving")
            }

            this.lastDrawPointer = this.table.currentPointer
        }
        this.table.updateCurrentPointer();
        this.updateHit();
    }

    wheel(e){
        DEBUG_INFO("PencilTool wheel");
        this.table.updateZoom(e);
    }

    updateHit(){
        this.hit.setAttrs({
            x: this.table.currentPointer.x,
            y: this.table.currentPointer.y
        })
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
}
