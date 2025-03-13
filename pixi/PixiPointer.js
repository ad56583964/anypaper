import * as PIXI from 'pixi.js';
import { getCoordinates, createPointerInfo } from './utils';

/**
 * PixiPointer 类 - 光标指示器
 * 在画布上跟踪和显示指针位置
 */
export default class PixiPointer {
    /**
     * 创建一个新的光标指示器
     * @param {PixiRenderer} renderer - PixiJS 渲染器实例
     * @param {Object} options - 配置选项
     */
    constructor(renderer, options = {}) {
        this.renderer = renderer;
        
        // 配置选项
        this.options = {
            size: options.size || 10,
            color: options.color || 0xFF0000, // 红色
            alpha: options.alpha !== undefined ? options.alpha : 0.7,
            debug: options.debug !== undefined ? options.debug : false,
            updateInterval: options.updateInterval || 5 // 约200fps
        };
        
        // PixiJS 图形对象
        this.pointer = null;
        
        // 调试文本
        this.debugText = null;
        
        // 节流控制
        this.lastUpdateTime = 0;
        
        // 初始化
        this.init();
    }
    
    /**
     * 初始化光标指示器
     */
    init() {
        // 创建一个 PIXI.Graphics 对象作为光标指示器
        const pointer = new PIXI.Graphics();
        this.drawPointer(pointer);
        
        // 创建一个专门的容器来放置光标，确保它不受内容层的变换影响
        this.pointerContainer = new PIXI.Container();
        this.pointerContainer.sortableChildren = true;
        this.pointerContainer.zIndex = 1000; // 确保在最上层
        
        // 将光标添加到容器
        this.pointerContainer.addChild(pointer);
        
        // 将容器添加到舞台
        this.renderer.app.stage.addChild(this.pointerContainer);
        
        // 保存引用
        this.pointer = pointer;
        
        // 初始位置在画布外
        this.pointer.position.set(-100, -100);
        
        // 如果启用调试模式，创建调试文本
        if (this.options.debug) {
            this.debugText = new PIXI.Text('', {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: 0x000000,
                align: 'left'
            });
            this.debugText.position.set(10, 10);
            
            // 添加到舞台
            this.renderer.app.stage.addChild(this.debugText);
            
            console.log('Pointer debug mode enabled');
        }
        
        console.log('Pointer indicator created');
    }
    
    /**
     * 绘制光标
     * @param {PIXI.Graphics} graphics - 要绘制的图形对象
     */
    drawPointer(graphics) {
        graphics.clear();
        graphics.beginFill(this.options.color, this.options.alpha);
        graphics.drawCircle(0, 0, this.options.size / 2);
        graphics.endFill();
    }
    
    /**
     * 更新光标指示器位置
     * @param {PointerEvent} e - 指针事件
     */
    update(e) {
        if (!this.pointer) return;
        
        // 获取当前时间
        const now = performance.now();
        
        // 如果时间间隔太短，则跳过更新
        if (now - this.lastUpdateTime < this.options.updateInterval) {
            return;
        }
        
        // 创建指针信息对象
        const pointer = createPointerInfo(e);
        
        // 获取应用的视图（canvas）的边界
        const bounds = this.renderer.app.view.getBoundingClientRect();
        
        // 计算相对于canvas的坐标
        const localX = pointer.x - bounds.left;
        const localY = pointer.y - bounds.top;
        
        // 使用PixiJS的全局坐标转换
        const globalPoint = new PIXI.Point(localX, localY);
        
        // 将全局坐标转换为指针容器的本地坐标
        const localPoint = this.pointerContainer.toLocal(globalPoint);
        
        // 设置光标位置
        this.pointer.position.copyFrom(localPoint);
        
        // 使用工具函数获取所有坐标信息（用于调试）
        const coords = getCoordinates(pointer, this.renderer.app.canvas, this.renderer.contentLayer);
        
        // 更新上次更新时间
        this.lastUpdateTime = now;
        
        // 更新调试信息
        if (this.options.debug && this.debugText) {
            // 添加更多调试信息
            coords.localPoint = localPoint;
            coords.globalPoint = globalPoint;
            this.updateDebugInfo(coords);
        }
    }
    
    /**
     * 更新调试信息
     * @param {Object} info - 调试信息
     */
    updateDebugInfo(info) {
        if (!this.debugText) return;
        
        // 更新调试文本
        this.debugText.text = [
            `Client: (${info.pointer?.x.toFixed(1)}, ${info.pointer?.y.toFixed(1)})`,
            `Canvas: (${info.canvasX.toFixed(1)}, ${info.canvasY.toFixed(1)})`,
            `Global: (${info.globalPoint?.x.toFixed(1)}, ${info.globalPoint?.y.toFixed(1)})`,
            `Local: (${info.localPoint?.x.toFixed(1)}, ${info.localPoint?.y.toFixed(1)})`,
            `Offset: (${info.offsetX.toFixed(1)}, ${info.offsetY.toFixed(1)})`,
            `Scale: ${info.scale.toFixed(2)}`,
            `World: (${info.worldX.toFixed(1)}, ${info.worldY.toFixed(1)})`
        ].join('\n');
        
        // 每100帧输出一次日志
        if (Math.floor(performance.now() / 100) % 10 === 0) {
            console.log('Pointer Debug:', {
                client: info.pointer ? `(${info.pointer.x.toFixed(1)}, ${info.pointer.y.toFixed(1)})` : 'N/A',
                canvas: `(${info.canvasX.toFixed(1)}, ${info.canvasY.toFixed(1)})`,
                global: info.globalPoint ? `(${info.globalPoint.x.toFixed(1)}, ${info.globalPoint.y.toFixed(1)})` : 'N/A',
                local: info.localPoint ? `(${info.localPoint.x.toFixed(1)}, ${info.localPoint.y.toFixed(1)})` : 'N/A',
                offset: `(${info.offsetX.toFixed(1)}, ${info.offsetY.toFixed(1)})`,
                scale: info.scale.toFixed(2),
                world: `(${info.worldX.toFixed(1)}, ${info.worldY.toFixed(1)})`
            });
        }
    }
    
    /**
     * 设置光标大小
     * @param {number} size - 光标大小（像素）
     */
    setSize(size) {
        this.options.size = size;
        if (this.pointer) {
            this.drawPointer(this.pointer);
        }
    }
    
    /**
     * 设置光标颜色
     * @param {number|string} color - 颜色值（十六进制数字或字符串）
     * @param {number} alpha - 透明度 (0-1)
     */
    setColor(color, alpha = this.options.alpha) {
        // 如果传入的是字符串（如 '#FF0000'），转换为数字
        if (typeof color === 'string') {
            // 移除 # 前缀（如果有）
            color = color.replace(/^#/, '');
            // 转换为十六进制数字
            color = parseInt(color, 16);
        }
        
        this.options.color = color;
        this.options.alpha = alpha;
        
        if (this.pointer) {
            this.drawPointer(this.pointer);
        }
    }
    
    /**
     * 设置调试模式
     * @param {boolean} enabled - 是否启用调试
     */
    setDebugMode(enabled) {
        this.options.debug = enabled;
        
        if (enabled && !this.debugText) {
            // 创建调试文本
            this.debugText = new PIXI.Text('', {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: 0x000000,
                align: 'left'
            });
            this.debugText.position.set(10, 10);
            
            // 添加到舞台
            this.renderer.app.stage.addChild(this.debugText);
            
            console.log('Pointer debug mode enabled');
        } else if (!enabled && this.debugText) {
            // 移除调试文本
            if (this.debugText.parent) {
                this.debugText.parent.removeChild(this.debugText);
            }
            this.debugText.destroy();
            this.debugText = null;
            console.log('Pointer debug mode disabled');
        }
    }
    
    /**
     * 销毁光标指示器
     */
    destroy() {
        // 移除光标容器
        if (this.pointerContainer) {
            if (this.pointerContainer.parent) {
                this.pointerContainer.parent.removeChild(this.pointerContainer);
            }
            this.pointerContainer.destroy({ children: true });
            this.pointerContainer = null;
            this.pointer = null;
        }
        
        // 移除调试文本
        if (this.debugText) {
            if (this.debugText.parent) {
                this.debugText.parent.removeChild(this.debugText);
            }
            this.debugText.destroy();
            this.debugText = null;
        }
        
        console.log('Pointer indicator destroyed');
    }
}