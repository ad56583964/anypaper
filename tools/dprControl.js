// DPR控制工具 - 用于调整Canvas的设备像素比以优化性能
import Konva from '../src/konva';

export default class DprControlTool {
    constructor(table) {
        this.table = table;
        this.originalDpr = window.devicePixelRatio;
        this.currentDpr = this.originalDpr;
        this.isActive = false;
        this.controlPanel = null;
        this.dprOptions = [0.5, 0.75, 1.0, 1.5, 2.0]; // 预设DPR选项
    }

    activate() {
        if (this.isActive) {
            console.warn('DPR控制工具已经激活');
            return;
        }

        console.log('激活DPR控制工具');
        console.log(`当前设备DPR: ${this.originalDpr}`);
        
        // 创建控制面板
        this.createControlPanel();
        
        this.isActive = true;
    }

    deactivate() {
        if (!this.isActive) {
            console.warn('DPR控制工具未激活');
            return;
        }

        console.log('停用DPR控制工具');
        
        // 恢复原始DPR
        this.setDpr(this.originalDpr);
        
        // 移除控制面板
        this.removeControlPanel();
        
        this.isActive = false;
    }

    // 设置新的DPR值
    setDpr(dpr) {
        if (dpr <= 0) {
            console.error('DPR值必须大于0');
            return;
        }
        
        console.log(`设置DPR: ${this.currentDpr} -> ${dpr}`);
        
        // 保存当前值
        this.currentDpr = dpr;
        
        try {
            // 应用到Canvas
            this.applyDprToCanvas(dpr);
            
            // 更新显示
            this.updateDprDisplay();
            
            console.log(`DPR已更改为: ${dpr}`);
        } catch (error) {
            console.error('设置DPR时出错:', error);
        }
    }
    
    // 将DPR应用到Canvas
    applyDprToCanvas(dpr) {
        // 获取所有图层
        const layers = this.table.stage.getLayers();
        
        if (!layers || layers.length === 0) {
            console.error('没有找到图层');
            return;
        }
        
        // 保存当前变换和缩放
        const currentScale = this.table.zoom.current;
        const currentPos = {
            x: this.table.stage.x(),
            y: this.table.stage.y()
        };
        
        // 应用新的DPR到每个Canvas
        layers.forEach((layer, index) => {
            const canvas = layer.getCanvas();
            if (!canvas || !canvas._canvas) {
                console.error(`图层 ${index} 没有有效的Canvas`);
                return;
            }
            
            // 获取当前尺寸
            const width = canvas.width / canvas.getPixelRatio();
            const height = canvas.height / canvas.getPixelRatio();
            
            // 设置新的像素比
            canvas.setPixelRatio(dpr);
            
            // 重新设置尺寸以应用新的像素比
            canvas.setSize(width, height);
        });
        
        // 重新绘制舞台
        this.table.stage.batchDraw();
        
        // 记录性能数据
        this.logPerformanceData();
    }
    
    // 记录性能数据
    logPerformanceData() {
        // 记录当前FPS
        const fps = Konva.Animation.animations.length > 0 
            ? Math.round(Konva.Animation.animations[0].lastTimeDiff ? 1000 / Konva.Animation.animations[0].lastTimeDiff : 0) 
            : 0;
            
        // 记录内存使用情况
        const memory = window.performance && window.performance.memory 
            ? {
                usedJSHeapSize: Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024)),
                totalJSHeapSize: Math.round(window.performance.memory.totalJSHeapSize / (1024 * 1024))
              } 
            : null;
            
        console.log('性能数据:', {
            dpr: this.currentDpr,
            fps: fps,
            memory: memory,
            timestamp: new Date().toISOString()
        });
    }

    // 创建控制面板
    createControlPanel() {
        // 移除已存在的面板
        this.removeControlPanel();
        
        // 创建面板
        const panel = document.createElement('div');
        panel.id = 'dpr-control-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 250px;
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            z-index: 10000;
        `;
        
        // 添加标题
        const title = document.createElement('h3');
        title.textContent = 'DPR控制';
        title.style.margin = '0 0 10px 0';
        panel.appendChild(title);
        
        // 添加设备信息
        const deviceInfo = document.createElement('div');
        deviceInfo.innerHTML = `
            <div>设备DPR: ${this.originalDpr}</div>
            <div>屏幕尺寸: ${window.screen.width}x${window.screen.height}</div>
            <div>视口尺寸: ${window.innerWidth}x${window.innerHeight}</div>
        `;
        panel.appendChild(deviceInfo);
        
        // 添加当前DPR显示
        const currentDprDisplay = document.createElement('div');
        currentDprDisplay.id = 'current-dpr-display';
        currentDprDisplay.style.margin = '10px 0';
        currentDprDisplay.style.fontSize = '16px';
        currentDprDisplay.style.fontWeight = 'bold';
        currentDprDisplay.textContent = `当前DPR: ${this.currentDpr}`;
        panel.appendChild(currentDprDisplay);
        
        // 添加预设按钮
        const presetButtons = document.createElement('div');
        presetButtons.style.display = 'flex';
        presetButtons.style.flexWrap = 'wrap';
        presetButtons.style.gap = '5px';
        presetButtons.style.marginBottom = '10px';
        
        this.dprOptions.forEach(dpr => {
            const button = document.createElement('button');
            button.textContent = dpr;
            button.style.flex = '1';
            button.style.minWidth = '40px';
            button.style.padding = '5px';
            button.onclick = () => this.setDpr(dpr);
            presetButtons.appendChild(button);
        });
        
        panel.appendChild(presetButtons);
        
        // 添加自定义DPR输入
        const customDprInput = document.createElement('div');
        customDprInput.style.display = 'flex';
        customDprInput.style.alignItems = 'center';
        customDprInput.style.marginBottom = '10px';
        
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0.1';
        input.max = '3';
        input.step = '0.1';
        input.value = this.currentDpr;
        input.style.flex = '1';
        input.style.marginRight = '5px';
        
        const setButton = document.createElement('button');
        setButton.textContent = '设置';
        setButton.onclick = () => {
            const value = parseFloat(input.value);
            if (!isNaN(value) && value > 0) {
                this.setDpr(value);
            }
        };
        
        customDprInput.appendChild(input);
        customDprInput.appendChild(setButton);
        panel.appendChild(customDprInput);
        
        // 添加性能信息显示
        const performanceInfo = document.createElement('div');
        performanceInfo.id = 'dpr-performance-info';
        performanceInfo.innerHTML = '性能数据: 等待中...';
        panel.appendChild(performanceInfo);
        
        // 添加按钮
        const buttons = document.createElement('div');
        buttons.style.marginTop = '10px';
        buttons.style.display = 'flex';
        buttons.style.justifyContent = 'space-between';
        
        // 重置按钮
        const resetBtn = document.createElement('button');
        resetBtn.textContent = '恢复原始DPR';
        resetBtn.onclick = () => this.setDpr(this.originalDpr);
        buttons.appendChild(resetBtn);
        
        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.onclick = () => this.deactivate();
        buttons.appendChild(closeBtn);
        
        panel.appendChild(buttons);
        
        // 添加到文档
        document.body.appendChild(panel);
        this.controlPanel = panel;
        
        // 设置性能监控定时器
        this.performanceInterval = setInterval(() => {
            this.updatePerformanceInfo();
        }, 1000);
    }
    
    // 更新DPR显示
    updateDprDisplay() {
        const display = document.getElementById('current-dpr-display');
        if (display) {
            display.textContent = `当前DPR: ${this.currentDpr}`;
            
            // 根据DPR变化设置颜色
            if (this.currentDpr < this.originalDpr) {
                display.style.color = '#4CAF50'; // 绿色，表示降低了DPR
            } else if (this.currentDpr > this.originalDpr) {
                display.style.color = '#FF9800'; // 橙色，表示提高了DPR
            } else {
                display.style.color = 'white'; // 白色，表示原始DPR
            }
        }
    }
    
    // 更新性能信息
    updatePerformanceInfo() {
        const infoElement = document.getElementById('dpr-performance-info');
        if (!infoElement) return;
        
        // 获取FPS
        const fps = Konva.Animation.animations.length > 0 
            ? Math.round(Konva.Animation.animations[0].lastTimeDiff ? 1000 / Konva.Animation.animations[0].lastTimeDiff : 0) 
            : 0;
            
        // 获取内存使用情况
        let memoryInfo = '';
        if (window.performance && window.performance.memory) {
            const usedMB = Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024));
            const totalMB = Math.round(window.performance.memory.totalJSHeapSize / (1024 * 1024));
            memoryInfo = `<br>内存: ${usedMB}MB / ${totalMB}MB`;
        }
        
        // 设置FPS颜色
        let fpsColor = '#FFFFFF';
        if (fps < 30) {
            fpsColor = '#F44336'; // 红色，表示FPS较低
        } else if (fps < 50) {
            fpsColor = '#FF9800'; // 橙色，表示FPS一般
        } else {
            fpsColor = '#4CAF50'; // 绿色，表示FPS良好
        }
        
        infoElement.innerHTML = `
            性能数据:<br>
            FPS: <span style="color:${fpsColor}">${fps}</span>${memoryInfo}
        `;
    }
    
    // 移除控制面板
    removeControlPanel() {
        if (this.controlPanel) {
            this.controlPanel.remove();
            this.controlPanel = null;
        }
        
        if (this.performanceInterval) {
            clearInterval(this.performanceInterval);
            this.performanceInterval = null;
        }
    }
} 