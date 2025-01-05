let DEBUG_INFO = console.log;

export default class ToolManage {
    constructor(table) {
        this.table = table;
        this.currentTool = null;
        this.tools = {};

        this.setupEventListeners();
    }

    registerTool(name, tool) {
        this.tools[name] = tool;
    }

    setActiveTool(name) {
        if (this.currentTool) {
            this.currentTool.deactivate();
        }
        this.currentTool = this.tools[name];
        if (this.currentTool) {
            this.currentTool.activate();
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        const events = ['pointermove', 'pointerdown', 'pointerup', 'keydown', 'keyup'];
        events.forEach(eventType => {
            window.addEventListener(eventType, (e) => this.handleEvent(eventType, e));
        });

        // 保留原有的 resize 和 wheel 事件
        window.addEventListener("resize", (e) => this.table.handleResize(e));
        window.addEventListener("wheel", (e) => this.table.handleWheel(e));
    }

    handleEvent(eventType, event) {
        if (this.currentTool && typeof this.currentTool[eventType] === 'function') {
            this.currentTool[eventType](event);
        }
    }
}