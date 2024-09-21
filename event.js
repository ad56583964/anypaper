
let DEBUG_INFO = console.log;
export default class TableEvent {
    constructor(table){
        this.table = table;
        window.addEventListener("resize", (e) => this.handleResize(e));
        window.addEventListener("wheel", (e) => this.handleWheel(e));
        window.addEventListener("pointermove", (e) => this.handleMove(e));
        window.addEventListener("pointerdown", (e) => this.handleClick(e));
        window.addEventListener("keydown", (e) => this.handleKey(e));

        // DEBUG_INFO('TableEvent'+table.width);
    }

    handleResize() {
        DEBUG_INFO("Enter handleResize");
        table = "zoom";
        if (table == "zoom") {
            // 这两个 都要 单独设置 ？？
            // debug pointer

            table.fitWindow();
        }
    }

    handleWheel(e) {
        DEBUG_INFO("Enter handleWheel");

        this.table.updateHit();
        const delta = e.deltaY;
        DEBUG_INFO("delta: ",delta);

        this.table.zoom(delta);
    }

    handleMove(e) {
        // DEBUG_INFO("Enter handleMove");
        this.table.move(e);
        this.table.updateHit();
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

        switch(table) {
            case 'typing':
                
                this.table.selectBlock();
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
                    this.table.selectedBlock.remove()
                    table = 'idle';
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
            // case 'anothertable':
            //   ...
            //   break;
            default:
                // 如果没有匹配的情况, 这里是默认的处理方式
                break;
        }
    }
}