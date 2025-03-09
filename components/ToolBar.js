import Konva from '../src/konva';

export default class ToolBar {
    constructor(table) {
        this.table = table;
        this.tools = [
            { name: 'pencil', icon: '✏️', title: '铅笔工具' },
            { name: 'select', icon: '👆', title: '选择工具' },
            { name: 'zoom', icon: '🔍', title: '缩放模式 (提示: 在任何工具下，按住Ctrl+滚轮或使用双指触摸可缩放)' },
            { name: 'hitUpdateOnly', icon: '⚡', title: '性能模式 (仅更新命中检测)' },
            // { name: 'contextMonitor', icon: '🔄', title: 'Canvas上下文监控' },

        ];
        
        this.toolbarContainer = null;
        this.isMobile = this.detectMobile();
        this.createToolBar();
        
        // 添加窗口点击事件监听器，确保工具栏点击事件不被Canvas拦截
        this.setupGlobalEventHandlers();
    }
    
    // 检测是否为移动设备
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    createToolBar() {
        // 创建工具栏容器
        this.toolbarContainer = document.createElement('div');
        this.toolbarContainer.id = 'konva-toolbar';
        
        // 添加CSS样式
        const mobileStyles = this.isMobile ? `
            padding: 15px;
            gap: 15px;
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        ` : '';
        
        // 所有设备都在左上角显示
        this.toolbarContainer.style.cssText = `
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
            z-index: 10000; /* 提高z-index确保在Canvas之上 */
            pointer-events: auto; /* 确保可以接收点击事件 */
            touch-action: auto; /* 允许触摸事件 */
            user-select: none; /* 防止文本选择 */
            ${mobileStyles}
        `;

        // 创建工具按钮
        this.tools.forEach(tool => {
            const button = document.createElement('button');
            button.className = 'konva-toolbar-button';
            button.dataset.tool = tool.name; // 添加data属性以便于识别
            
            // 移动设备上使用更大的按钮
            const mobileButtonStyles = this.isMobile ? `
                width: 50px;
                height: 50px;
                font-size: 24px;
                margin: 2px;
            ` : '';
            
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
                position: relative; /* 为徽章定位 */
                pointer-events: auto; /* 确保可以接收点击事件 */
                touch-action: auto; /* 允许触摸事件 */
                ${mobileButtonStyles}
            `;
            button.innerHTML = tool.icon;
            button.title = tool.title;
            
            // 存储按钮引用
            tool.button = button;
            this.toolbarContainer.appendChild(button);
        });

        // 将工具栏添加到页面
        document.body.appendChild(this.toolbarContainer);

        // 设置初始活动状态
        this.updateActiveButton(this.tools.find(t => t.name === 'pencil').button);
    }
    
    // 设置全局事件处理器
    setupGlobalEventHandlers() {
        // 为工具栏添加点击事件委托
        this.toolbarContainer.addEventListener('click', (e) => {
            // 阻止事件冒泡，防止被Canvas捕获
            e.stopPropagation();
            
            // 查找被点击的按钮
            let target = e.target;
            while (target && !target.classList.contains('konva-toolbar-button')) {
                target = target.parentElement;
            }
            
            if (!target) return;
            
            // 获取工具名称
            const toolName = target.dataset.tool;
            if (!toolName) return;
            
            // 查找对应的工具
            const tool = this.tools.find(t => t.name === toolName);
            if (!tool) return;
            
            // 处理工具点击
            this.handleToolClick(tool, target);
        }, true); // 使用捕获阶段
        
        // 添加触摸事件处理
        this.toolbarContainer.addEventListener('touchstart', (e) => {
            // 阻止默认行为和冒泡
            e.preventDefault();
            e.stopPropagation();
            
            // 获取触摸点
            const touch = e.touches[0];
            if (!touch) return;
            
            // 模拟点击事件
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            
            // 在触摸位置触发点击事件
            document.elementFromPoint(touch.clientX, touch.clientY).dispatchEvent(clickEvent);
        });
        
        // 防止工具栏上的触摸事件传播到Canvas
        this.toolbarContainer.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, true);
        
        this.toolbarContainer.addEventListener('touchend', (e) => {
            e.stopPropagation();
        }, true);
        
        // 添加键盘快捷键
        document.addEventListener('keydown', (e) => {
            // 按下Escape键时，如果有活动的特殊模式，则退出
            if (e.key === 'Escape') {
                if (this.table.zoomTool.isZoomMode) {
                    this.table.exitZoomMode();
                    this.updateActiveButton(null);
                }
            }
        });
    }
    
    // 处理工具点击
    handleToolClick(tool, button) {
        console.log(`工具栏: 点击了 ${tool.name} 工具`);
        
        if (tool.name === 'zoom') {
            // 特殊处理缩放工具
            if (this.table.zoomTool.isZoomMode) {
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
    }

    updateActiveButton(activeButton) {
        // 更新所有按钮的样式
        this.tools.forEach(tool => {
            // 如果在缩放模式下，保持缩放按钮的活动状态
            if ((tool.button === activeButton) || 
                (tool.name === 'zoom' && this.table.zoomTool.isZoomMode)) {
                tool.button.style.background = '#e0e0e0';
                tool.button.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.1)';
            } else {
                tool.button.style.background = 'white';
                tool.button.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }
        });
    }
    
    // 添加一个方法来显示/隐藏工具栏
    setVisible(visible) {
        if (this.toolbarContainer) {
            this.toolbarContainer.style.display = visible ? 'flex' : 'none';
        }
    }
} 