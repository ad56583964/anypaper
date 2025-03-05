import Konva from '../src/konva';

export default class ToolBar {
    constructor(table) {
        this.table = table;
        this.tools = [
            { name: 'pencil', icon: '✏️', title: '铅笔工具' },
            { name: 'select', icon: '👆', title: '选择工具' },
            { name: 'zoom', icon: '🔍', title: '缩放模式' },
            { name: 'hitUpdateOnly', icon: '⚡', title: '性能模式 (仅更新命中检测)' },
            // { name: 'contextMonitor', icon: '🔄', title: 'Canvas上下文监控' },
            // { name: 'dprControl', icon: '📱', title: 'DPR控制 (调整设备像素比)' },
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
        
        // 添加移动设备上的拖动功能
        if (this.isMobile) {
            this.makeToolbarDraggable();
        }
    }
    
    // 使工具栏可拖动
    makeToolbarDraggable() {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        // 创建拖动手柄
        const dragHandle = document.createElement('div');
        dragHandle.style.cssText = `
            width: 100%;
            height: 10px;
            background-color: rgba(0,0,0,0.1);
            border-radius: 5px;
            margin-bottom: 5px;
            cursor: move;
        `;
        
        this.toolbarContainer.insertBefore(dragHandle, this.toolbarContainer.firstChild);
        
        // 鼠标/触摸事件
        const startDrag = (e) => {
            isDragging = true;
            
            // 获取起始位置
            if (e.type.includes('touch')) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            } else {
                startX = e.clientX;
                startY = e.clientY;
            }
            
            // 获取工具栏当前位置
            const rect = this.toolbarContainer.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            // 阻止事件冒泡和默认行为
            e.stopPropagation();
            e.preventDefault();
        };
        
        const onDrag = (e) => {
            if (!isDragging) return;
            
            // 计算移动距离
            let currentX, currentY;
            if (e.type.includes('touch')) {
                currentX = e.touches[0].clientX;
                currentY = e.touches[0].clientY;
            } else {
                currentX = e.clientX;
                currentY = e.clientY;
            }
            
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            
            // 更新工具栏位置
            this.updatePosition(startLeft + deltaX, startTop + deltaY);
            
            // 阻止事件冒泡和默认行为
            e.stopPropagation();
            e.preventDefault();
        };
        
        const endDrag = (e) => {
            isDragging = false;
            
            // 阻止事件冒泡
            e.stopPropagation();
        };
        
        // 添加事件监听器
        dragHandle.addEventListener('mousedown', startDrag);
        dragHandle.addEventListener('touchstart', startDrag, { passive: false });
        
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });
        
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
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
            // 如果是拖动手柄，不处理点击
            if (e.target.style.cursor === 'move') return;
            
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
            
            // 获取触摸的元素
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            if (element) {
                element.dispatchEvent(clickEvent);
            }
        }, true);
        
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
                if (this.table.isZoomMode) {
                    this.table.exitZoomMode();
                    this.updateActiveButton(null);
                } else if (this.table.isContextMonitorActive) {
                    this.table.deactivateContextMonitor();
                    this.updateActiveButton(null);
                } else if (this.table.isDprControlActive) {
                    this.table.deactivateDprControl();
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
            if (this.table.isZoomMode) {
                this.table.exitZoomMode();
                button.style.background = 'white';
                button.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            } else {
                this.table.enterZoomMode();
                this.updateActiveButton(button);
            }
        } else if (tool.name === 'contextMonitor') {
            // 特殊处理上下文监控工具
            if (this.table.isContextMonitorActive) {
                this.table.deactivateContextMonitor();
                button.style.background = 'white';
                button.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            } else {
                this.table.activateContextMonitor();
                this.updateActiveButton(button);
            }
        } else if (tool.name === 'dprControl') {
            // 特殊处理DPR控制工具
            if (this.table.isDprControlActive) {
                this.table.deactivateDprControl();
                button.style.background = 'white';
                button.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            } else {
                this.table.activateDprControl();
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
            // 如果在上下文监控模式下，保持监控按钮的活动状态
            // 如果在DPR控制模式下，保持DPR控制按钮的活动状态
            if ((tool.button === activeButton) || 
                (tool.name === 'zoom' && this.table.isZoomMode) ||
                (tool.name === 'contextMonitor' && this.table.isContextMonitorActive) ||
                (tool.name === 'dprControl' && this.table.isDprControlActive)) {
                tool.button.style.background = '#e0e0e0';
                tool.button.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.1)';
            } else {
                tool.button.style.background = 'white';
                tool.button.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }
        });
    }
    
    // 添加一个方法来更新工具栏的位置
    updatePosition(x, y) {
        if (this.toolbarContainer) {
            this.toolbarContainer.style.left = `${x}px`;
            this.toolbarContainer.style.top = `${y}px`;
        }
    }
    
    // 添加一个方法来显示/隐藏工具栏
    setVisible(visible) {
        if (this.toolbarContainer) {
            this.toolbarContainer.style.display = visible ? 'flex' : 'none';
        }
    }
} 