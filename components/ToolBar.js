import Konva from '../src/konva';

export default class ToolBar {
    constructor(table) {
        this.table = table;
        this.tools = [
            { name: 'pencil', icon: '✏️', title: '铅笔工具' },
            { name: 'select', icon: '👆', title: '选择工具' },
            { name: 'zoom', icon: '🔍', title: '缩放模式' },
        ];
        
        this.createToolBar();
    }

    createToolBar() {
        // 创建工具栏容器
        const toolbarContainer = document.createElement('div');
        toolbarContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 8px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
        `;

        // 创建工具按钮
        this.tools.forEach(tool => {
            const button = document.createElement('button');
            button.style.cssText = `
                width: 40px;
                height: 40px;
                border: none;
                border-radius: 6px;
                background: white;
                cursor: pointer;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            `;
            button.innerHTML = tool.icon;
            button.title = tool.title;
            
            // 添加点击事件
            button.addEventListener('click', () => {
                if (tool.name === 'zoom') {
                    // 特殊处理缩放工具
                    if (this.table.isZoomMode) {
                        this.table.exitZoomMode();
                        button.style.background = 'white';
                        button.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    } else {
                        this.table.enterZoomMode();
                        this.updateActiveButton(button);
                    }
                } else {
                    this.table.setActiveTool(tool.name);
                    this.updateActiveButton(button);
                }
            });

            // 存储按钮引用
            tool.button = button;
            toolbarContainer.appendChild(button);
        });

        // 将工具栏添加到页面
        document.body.appendChild(toolbarContainer);

        // 设置初始活动状态
        this.updateActiveButton(this.tools.find(t => t.name === 'pencil').button);
    }

    updateActiveButton(activeButton) {
        // 更新所有按钮的样式
        this.tools.forEach(tool => {
            // 如果在缩放模式下，保持缩放按钮的活动状态
            if ((tool.button === activeButton) || 
                (tool.name === 'zoom' && this.table.isZoomMode)) {
                tool.button.style.background = '#e0e0e0';
                tool.button.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.1)';
            } else {
                tool.button.style.background = 'white';
                tool.button.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }
        });
    }
} 