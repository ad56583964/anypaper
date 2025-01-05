let DEBUG_INFO = console.log;

export default class SelectTool {
    constructor(table){
        this.table = table;
        
        this.currentBlock = {
            x: 0,
            y: 0
        }
        // visual attrs over table
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

        this.table.gLayer.add(this.hangingBlock)

        DEBUG_INFO("Init PencilTool");
    }

    activate(){
        DEBUG_INFO("PencilTool activate");
    }

    deactivate(){
        DEBUG_INFO("PencilTool deactivate");
    }

    /* realize functions */
    selectBlock(){
        if(!this._isOutside()){
            this.selectedBlock.setAttrs({
                x: this.currentBlock.x * this.table.block.width,
                y: this.currentBlock.y * this.table.block.height,
            })
            this.table.gLayer.add(this.selectedBlock)
        }
    }
    
    getcurrentBlock(){
        return {
            x:Math.floor((this.table.currentPointer.x) / this.table.block.width),
            y:Math.floor((this.table.currentPointer.y) / this.table.block.height)
        }
    }

    _updateHangingBlock(x,y){
        this.hangingBlock.setAttrs({
            x: x * this.table.block.width,
            y: y * this.table.block.height,
            visible: true
        })
    }

    _hideHangingBlock(){
        this.hangingBlock.setAttrs({
            visible: false
        })
    }

    _isOutside(){
        DEBUG_INFO("height"+this.table.konva_attr.height()+" width"+this.table.konva_attr.width());
        // seems stage will auto extern
        DEBUG_INFO("height"+this.table.stage.height()+" width"+this.table.stage.width());
        return this.table.currentPointer.x*this.table.zoom.current < 0 || this.table.currentPointer.x > this.table.konva_attr.width() || this.table.currentPointer.y < 0 || this.table.currentPointer.y > this.table.konva_attr.height()
    }

    move(e){
        // the only e.client entrypoint

        this.table.updateCurrentPointer();

        if (window.DebugBarComponentRef && window.DebugBarComponentRef.current) {
            // console.log("hold Ref")
            window.DebugBarComponentRef.current.updateMousePosition(this.table.currentPointer.x,this.table.currentPointer.y)
        }
        else{
            console.log("no Ref")
        }

        this.currentBlock = this.getcurrentBlock()
        // 此处的 currentBlock 实际是指 gLayer 为坐标系起点
        // log is effect the performance
        // DEBUG_INFO("currentPointer:",this.table.currentPointer.x - gLayerPos.x , this.table.currentPointer.y - gLayerPos.y);
        DEBUG_INFO("currentBlock:",this.getcurrentBlock());

        if(this._isOutside()){
            this._hideHangingBlock()
        }
        else{
            this._updateHangingBlock(this.currentBlock.x,this.currentBlock.y)
        }

        DEBUG_INFO(this._isOutside())
    }

    // Event listeners
    pointermove(e){
        DEBUG_INFO("PencilTool pointermove");
        this.move(e);
    }

    pointerdown(e){
        DEBUG_INFO("PencilTool pointerdown");
        this.selectBlock();
    }

    wheel(e){
        DEBUG_INFO("PencilTool wheel");

        const delta = e.deltaY;
        DEBUG_INFO("delta: ",delta);

        this.table.updateZoom(e);
    }

}
