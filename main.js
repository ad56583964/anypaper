import DrawingApp from "./table.js";
import './style.css'
// let DEBUG_INFO = console.log;

var theme = {
    background_color: "#dff"
}
// Usage:
window.addEventListener('wheel', function (event) {
    // 阻止默认行为
    event.preventDefault();
}, { passive: false });
const myDrawingApp = new DrawingApp('konva-container', 'tool', 300, 400, theme);

// window.a4Tool = new AnyA4Tool(myDrawingApp);