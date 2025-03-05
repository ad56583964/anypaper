// 用于在应用中使用ContextMonitor的工具
import ContextMonitor from './contextMonitor';

export default class ContextMonitorTool {
    constructor(table) {
        this.table = table;
        this.monitor = null;
        this.isActive = false;
    }

    activate() {
        if (this.isActive) {
            console.warn('ContextMonitorTool 已经激活');
            return;
        }

        console.log('激活 ContextMonitorTool');
        
        // 创建监控器
        this.monitor = new ContextMonitor(this.table.stage);
        
        // 开始监控
        this.monitor.startMonitoring();
        
        // 添加控制面板
        this.createControlPanel();
        
        this.isActive = true;
    }

    deactivate() {
        if (!this.isActive) {
            console.warn('ContextMonitorTool 未激活');
            return;
        }

        console.log('停用 ContextMonitorTool');
        
        // 停止监控
        if (this.monitor) {
            this.monitor.stopMonitoring();
            this.monitor = null;
        }
        
        // 移除控制面板
        this.removeControlPanel();
        
        this.isActive = false;
    }

    // 创建控制面板
    createControlPanel() {
        // 移除已存在的面板
        this.removeControlPanel();
        
        // 创建面板
        const panel = document.createElement('div');
        panel.id = 'context-monitor-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            z-index: 10000;
        `;
        
        // 添加标题
        const title = document.createElement('h3');
        title.textContent = 'Canvas上下文监控';
        title.style.margin = '0 0 10px 0';
        panel.appendChild(title);
        
        // 添加计数器
        const counters = document.createElement('div');
        counters.id = 'context-monitor-counters';
        counters.innerHTML = `
            <div>save() 调用: <span id="save-count">0</span></div>
            <div>restore() 调用: <span id="restore-count">0</span></div>
        `;
        panel.appendChild(counters);
        
        // 添加按钮
        const buttons = document.createElement('div');
        buttons.style.marginTop = '10px';
        
        // 重置按钮
        const resetBtn = document.createElement('button');
        resetBtn.textContent = '重置计数器';
        resetBtn.onclick = () => {
            if (this.monitor) {
                this.monitor.saveCount = 0;
                this.monitor.restoreCount = 0;
                this.monitor.saveRestoreStack = [];
                this.updateCounters();
                console.log('计数器已重置');
            }
        };
        buttons.appendChild(resetBtn);
        
        // 停止按钮
        const stopBtn = document.createElement('button');
        stopBtn.textContent = '停止监控';
        stopBtn.style.marginLeft = '10px';
        stopBtn.onclick = () => {
            this.deactivate();
        };
        buttons.appendChild(stopBtn);
        
        panel.appendChild(buttons);
        
        // 添加到文档
        document.body.appendChild(panel);
        
        // 设置更新计数器的定时器
        this.counterInterval = setInterval(() => {
            this.updateCounters();
        }, 500);
    }
    
    // 更新计数器显示
    updateCounters() {
        if (!this.monitor) return;
        
        const saveCountEl = document.getElementById('save-count');
        const restoreCountEl = document.getElementById('restore-count');
        
        if (saveCountEl) {
            saveCountEl.textContent = this.monitor.saveCount;
        }
        
        if (restoreCountEl) {
            restoreCountEl.textContent = this.monitor.restoreCount;
        }
    }
    
    // 移除控制面板
    removeControlPanel() {
        const panel = document.getElementById('context-monitor-panel');
        if (panel) {
            panel.remove();
        }
        
        if (this.counterInterval) {
            clearInterval(this.counterInterval);
            this.counterInterval = null;
        }
    }
} 