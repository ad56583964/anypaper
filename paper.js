

export default class PaperTool {
    constructor(table){

    }

    createPaper(x,y){
        DEBUG_INFO("create paper");
          // Create a new layer for the paper with a clipping region
        paper = new Konva.Rect({
            x: this.currentBlock.x * this.block.width,
            y: this.currentBlock.y * this.block.height,
            width: 300,
            height: 400,
            fill: '#fff',
          });

        // 不要暴露这种逻辑出来
        this.gLayer.add(this.paper);
        return
    }
}