import { Konva } from '../src/konva/Global';

/**
 * HitUpdateOnlyTool - 只更新命中检测，不处理其他逻辑的工具
 * 用于性能优化测试，特别是在移动设备上
 */
export default class HitUpdateOnlyTool {
    constructor(table) {
        this.table = table;
        this.name = 'hitUpdateOnly';
        this.hit = null;
        this.isActive = false;
        
        // 性能监控
        this.performanceStats = {
            frameCount: 0,
            totalTime: 0,
            lastFpsUpdate: 0,
            currentFps: 0,
            fpsUpdateInterval: 1000, // 每秒更新一次FPS
            fpsElement: null
        };
        
        // 事件计数器
        this.eventCounter = {
            pointerdown: 0,
            pointermove: 0,
            pointerup: 0,
            touchstart: 0,
            touchmove: 0,
            touchend: 0,
            wheel: 0,
            lastReset: Date.now()
        };
    }

    activate() {
        this.isActive = true;
        console.log("HitUpdateOnlyTool activated - 无限制模式");
        
        // 确保获取当前指针位置
        this.table.updateCurrentPointer();
        
        // 初始化命中点
        this.initHitDebug();
        
        // 立即更新命中点位置
        this.updateHit();
        
        // 启动性能监控
        this.startPerformanceMonitoring();
    }

    deactivate() {
        this.isActive = false;
        console.log("HitUpdateOnlyTool deactivated");
        if (this.hit) {
            this.hit.destroy();
            this.hit = null;
            this.table.gLayer.batchDraw();
        }
        this.stopPerformanceMonitoring();
    }

    // 只处理updateHit逻辑，忽略所有其他事件处理
    pointerdown(e) {
        // 计数事件
        this.eventCounter.pointerdown++;
        
        // 立即更新指针位置
        this.table.updateCurrentPointer();
        this.updateHit();
        this.updatePerformanceStats();
    }

    pointermove(e) {
        // 计数事件
        this.eventCounter.pointermove++;
        
        // 立即更新指针位置
        this.table.updateCurrentPointer();
        this.updateHit();
        this.updatePerformanceStats();
    }

    pointerup(e) {
        // 计数事件
        this.eventCounter.pointerup++;
        
        // 立即更新指针位置
        this.table.updateCurrentPointer();
        this.updateHit();
        this.updatePerformanceStats();
    }

    touchstart(e) {
        // 计数事件
        this.eventCounter.touchstart++;
        
        // 立即更新指针位置
        this.table.updateCurrentPointer();
        this.updateHit();
        this.updatePerformanceStats();
    }

    touchmove(e) {
        // 计数事件
        this.eventCounter.touchmove++;
        
        // 立即更新指针位置
        this.table.updateCurrentPointer();
        this.updateHit();
        this.updatePerformanceStats();
    }

    touchend(e) {
        // 计数事件
        this.eventCounter.touchend++;
        
        // 立即更新指针位置
        this.table.updateCurrentPointer();
        this.updateHit();
        this.updatePerformanceStats();
    }

    wheel(e) {
        // 计数事件
        this.eventCounter.wheel++;
        
        // 仍然允许缩放功能
        this.table.updateZoom(e);
        this.table.updateCurrentPointer();
        this.updateHit();
        this.updatePerformanceStats();
    }

    // 只更新命中检测点的位置
    updateHit() {
        if (!this.hit) {
            console.warn("HitUpdateOnlyTool: hit对象不存在，重新初始化");
            this.initHitDebug();
            return;
        }
        
        if (!this.table.currentPointer) {
            console.warn("HitUpdateOnlyTool: currentPointer不存在");
            return;
        }
        
        this.hit.setAttrs({
            x: this.table.currentPointer.x,
            y: this.table.currentPointer.y
        });
        
        // 确保命中点可见
        this.hit.show();
        
        // 只更新gLayer，不触发其他层的重绘
        this.table.gLayer.batchDraw();
    }

    // 初始化命中检测的可视化调试元素
    initHitDebug() {
        // 如果已经存在，先销毁
        if (this.hit) {
            this.hit.destroy();
        }
        
        console.log("HitUpdateOnlyTool: 初始化命中点", 
                   this.table.currentPointer ? 
                   `位置(${this.table.currentPointer.x.toFixed(1)}, ${this.table.currentPointer.y.toFixed(1)})` : 
                   "currentPointer不存在");
        
        // 创建一个小圆点表示命中点
        this.hit = new Konva.Circle({
            radius: 10,  // 圆点半径
            fill: "red", // 使用红色以便更容易看到
            stroke: "white", // 添加白色边框
            strokeWidth: 2,
            opacity: 0.8,
            x: this.table.currentPointer ? this.table.currentPointer.x : 0,
            y: this.table.currentPointer ? this.table.currentPointer.y : 0
        });
        
        // 确保命中点在最上层
        this.hit.zIndex(100);
        
        this.table.gLayer.add(this.hit);
        this.table.gLayer.batchDraw();
        
        console.log("HitUpdateOnlyTool: 命中点已添加到图层");
    }
    
    // 性能监控相关方法
    startPerformanceMonitoring() {
        // 创建性能显示元素
        this.createPerformanceDisplay();
        
        // 重置性能统计
        this.resetPerformanceStats();
        
        // 开始性能监控循环
        this.performanceMonitoringActive = true;
        this.monitorPerformance();
        
        // 收集设备信息
        this.collectDeviceInfo();
        
        console.log("性能监控已启动");
    }
    
    stopPerformanceMonitoring() {
        this.performanceMonitoringActive = false;
        
        // 移除性能显示元素
        if (this.performanceStats.fpsElement) {
            document.body.removeChild(this.performanceStats.fpsElement);
            this.performanceStats.fpsElement = null;
        }
        
        console.log("性能监控已停止");
    }
    
    createPerformanceDisplay() {
        // 如果已存在，先移除
        if (this.performanceStats.fpsElement) {
            document.body.removeChild(this.performanceStats.fpsElement);
        }
        
        // 创建性能监控面板
        const fpsElement = document.createElement('div');
        fpsElement.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 14px;
            z-index: 9999;
            min-width: 250px;
            max-width: 350px;
            line-height: 1.5;
            text-align: left;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        `;
        fpsElement.innerHTML = `
            <div style="font-weight:bold;margin-bottom:5px;font-size:16px;color:#fff;">性能监控</div>
            <div id="fps-counter">FPS: 计算中...</div>
            <div id="device-info">设备信息: 加载中...</div>
            <div id="draw-stats">绘制统计: 等待数据...</div>
            <div id="event-counter">事件统计: 等待数据...</div>
            <div id="memory-info">内存: 等待数据...</div>
        `;
        document.body.appendChild(fpsElement);
        
        this.performanceStats.fpsElement = fpsElement;
    }
    
    resetPerformanceStats() {
        this.performanceStats.frameCount = 0;
        this.performanceStats.totalTime = 0;
        this.performanceStats.lastFpsUpdate = performance.now();
        this.performanceStats.currentFps = 0;
        this.performanceStats.drawCalls = 0;
        this.performanceStats.lastDrawTime = 0;
        
        // 重置事件计数器
        Object.keys(this.eventCounter).forEach(key => {
            if (key !== 'lastReset') {
                this.eventCounter[key] = 0;
            }
        });
        this.eventCounter.lastReset = Date.now();
    }
    
    updatePerformanceStats() {
        this.performanceStats.frameCount++;
        this.performanceStats.drawCalls++;
        
        const now = performance.now();
        const elapsed = now - this.performanceStats.lastFpsUpdate;
        
        // 计算绘制间隔
        if (this.performanceStats.lastDrawTime > 0) {
            const drawInterval = now - this.performanceStats.lastDrawTime;
            this.performanceStats.lastDrawInterval = drawInterval;
        }
        this.performanceStats.lastDrawTime = now;
        
        if (elapsed >= this.performanceStats.fpsUpdateInterval) {
            // 计算FPS
            this.performanceStats.currentFps = Math.round((this.performanceStats.frameCount * 1000) / elapsed);
            
            // 更新显示
            if (this.performanceStats.fpsElement) {
                const fpsCounter = this.performanceStats.fpsElement.querySelector('#fps-counter');
                if (fpsCounter) {
                    const fpsColor = this.getFpsColor(this.performanceStats.currentFps);
                    fpsCounter.innerHTML = `FPS: <span style="color:${fpsColor}">${this.performanceStats.currentFps}</span>`;
                }
                
                const drawStats = this.performanceStats.fpsElement.querySelector('#draw-stats');
                if (drawStats) {
                    drawStats.innerHTML = `
                        绘制统计: 
                        <br>- 调用次数: ${this.performanceStats.drawCalls}
                        <br>- 平均间隔: ${this.performanceStats.lastDrawInterval ? this.performanceStats.lastDrawInterval.toFixed(2) + 'ms' : 'N/A'}
                    `;
                }
                
                // 更新事件计数器显示
                this.updateEventCounterDisplay();
                
                // 更新内存信息（如果可用）
                this.updateMemoryInfo();
            }
            
            // 重置计数器
            this.performanceStats.frameCount = 0;
            this.performanceStats.drawCalls = 0;
            this.performanceStats.lastFpsUpdate = now;
        }
    }
    
    monitorPerformance() {
        if (!this.performanceMonitoringActive) return;
        
        this.updatePerformanceStats();
        
        // 继续监控循环
        requestAnimationFrame(() => this.monitorPerformance());
    }
    
    // 收集设备信息
    collectDeviceInfo() {
        if (!this.performanceStats.fpsElement) return;
        
        const deviceInfo = this.performanceStats.fpsElement.querySelector('#device-info');
        if (!deviceInfo) return;
        
        const info = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            deviceMemory: navigator.deviceMemory || 'N/A',
            hardwareConcurrency: navigator.hardwareConcurrency || 'N/A',
            devicePixelRatio: window.devicePixelRatio.toFixed(2),
            screenSize: `${window.screen.width}x${window.screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
            connection: navigator.connection ? 
                        `${navigator.connection.effectiveType || 'unknown'} (RTT: ${navigator.connection.rtt || 'N/A'}ms)` : 
                        'N/A'
        };
        
        deviceInfo.innerHTML = `
            设备信息:
            <br>- DPI: ${info.devicePixelRatio}
            <br>- 屏幕: ${info.screenSize}
            <br>- 视口: ${info.viewportSize}
            <br>- CPU核心: ${info.hardwareConcurrency}
            <br>- 内存: ${info.deviceMemory !== 'N/A' ? info.deviceMemory + 'GB' : 'N/A'}
            <br>- 网络: ${info.connection}
            <br>- 平台: ${info.platform}
        `;
        
        // 添加详细信息到控制台
        console.log('设备详细信息:', info);
        console.log('完整UA:', info.userAgent);
    }
    
    // 更新内存信息
    updateMemoryInfo() {
        const memoryInfo = this.performanceStats.fpsElement.querySelector('#memory-info');
        if (!memoryInfo) return;
        
        if (window.performance && window.performance.memory) {
            const memory = window.performance.memory;
            const usedHeapSize = (memory.usedJSHeapSize / 1048576).toFixed(2);
            const totalHeapSize = (memory.totalJSHeapSize / 1048576).toFixed(2);
            const heapLimit = (memory.jsHeapSizeLimit / 1048576).toFixed(2);
            
            const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100).toFixed(1);
            const usageColor = usagePercent > 80 ? '#ff4444' : (usagePercent > 60 ? '#ffaa00' : '#00ff00');
            
            memoryInfo.innerHTML = `
                内存:
                <br>- 使用: ${usedHeapSize}MB / ${heapLimit}MB
                <br>- 使用率: <span style="color:${usageColor}">${usagePercent}%</span>
            `;
        } else {
            memoryInfo.innerHTML = `内存: 不可用`;
        }
    }
    
    // 根据FPS值获取颜色
    getFpsColor(fps) {
        if (fps >= 55) return '#00ff00'; // 绿色 - 良好
        if (fps >= 30) return '#ffaa00'; // 橙色 - 一般
        return '#ff4444';                // 红色 - 差
    }
    
    // 更新事件计数器显示
    updateEventCounterDisplay() {
        const eventCounter = this.performanceStats.fpsElement.querySelector('#event-counter');
        if (!eventCounter) return;
        
        const now = Date.now();
        const elapsedSeconds = (now - this.eventCounter.lastReset) / 1000;
        
        // 计算每秒事件数
        const eventsPerSecond = {
            pointerdown: (this.eventCounter.pointerdown / elapsedSeconds).toFixed(1),
            pointermove: (this.eventCounter.pointermove / elapsedSeconds).toFixed(1),
            pointerup: (this.eventCounter.pointerup / elapsedSeconds).toFixed(1),
            touchstart: (this.eventCounter.touchstart / elapsedSeconds).toFixed(1),
            touchmove: (this.eventCounter.touchmove / elapsedSeconds).toFixed(1),
            touchend: (this.eventCounter.touchend / elapsedSeconds).toFixed(1),
            wheel: (this.eventCounter.wheel / elapsedSeconds).toFixed(1)
        };
        
        // 计算总事件数
        const totalEvents = Object.keys(this.eventCounter)
            .filter(key => key !== 'lastReset')
            .reduce((sum, key) => sum + this.eventCounter[key], 0);
        
        // 计算总事件率
        const totalEventsPerSecond = (totalEvents / elapsedSeconds).toFixed(1);
        
        // 检测是否有异常高的事件率
        const hasHighEventRate = totalEventsPerSecond > 100;
        const warningStyle = hasHighEventRate ? 'color:#ff4444;font-weight:bold;' : '';
        
        eventCounter.innerHTML = `
            事件统计: <span style="${warningStyle}">${totalEvents}个 (${totalEventsPerSecond}/秒)</span>
            <br>- pointermove: ${this.eventCounter.pointermove} (${eventsPerSecond.pointermove}/秒)
            <br>- touchmove: ${this.eventCounter.touchmove} (${eventsPerSecond.touchmove}/秒)
            <br>- pointerdown: ${this.eventCounter.pointerdown} (${eventsPerSecond.pointerdown}/秒)
            <br>- pointerup: ${this.eventCounter.pointerup} (${eventsPerSecond.pointerup}/秒)
        `;
        
        // 如果事件率异常高，记录到控制台
        if (hasHighEventRate) {
            console.warn(`检测到高事件率: ${totalEventsPerSecond}/秒，可能存在事件监听器累积问题`);
        }
        
        // 每10秒重置一次计数器
        if (elapsedSeconds > 10) {
            Object.keys(this.eventCounter).forEach(key => {
                if (key !== 'lastReset') {
                    this.eventCounter[key] = 0;
                }
            });
            this.eventCounter.lastReset = now;
            console.log('事件计数器已重置');
        }
    }
} 