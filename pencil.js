let DEBUG_INFO = console.log;

export default class PencilTool {
    constructor(table){
        DEBUG_INFO("Init PencilTool");
        this.table = table;
        this.initHitDebug();
    }

    activate(){
        DEBUG_INFO("PencilTool activate");
    }

    deactivate(){
        DEBUG_INFO("PencilTool deactivate");
    }

    pointermove(e){
        DEBUG_INFO("PencilTool pointermove");

        this.table.updateCurrentPointer();
        this.updateHit();
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
