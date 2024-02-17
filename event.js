export default class TableEvent {
    constructor(){
        window.addEventListener("resize", (e) => this.handleResize(e));
        window.addEventListener("wheel", (e) => this.handleWheel(e));
        window.addEventListener("pointermove", (e) => this.handleMove(e));
        window.addEventListener("pointerdown", (e) => this.handleClick(e));
        window.addEventListener("keydown", (e) => this.handleKey(e));
    }
}