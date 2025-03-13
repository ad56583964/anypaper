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
            color: options.color || 'rgba(255, 0, 0, 0.7)',
            debug: options.debug !== undefined ? options.debug : false,
            updateInterval: options.updateInterval || 5 // 约200fps
        };
        
        // DOM元素
        this.element = null;
        
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
        // 创建一个DOM元素作为光标指示器
        const element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.width = `${this.options.size}px`;
        element.style.height = `${this.options.size}px`;
        element.style.borderRadius = '50%';
        element.style.backgroundColor = this.options.color;
        element.style.pointerEvents = 'none'; // 确保不会捕获鼠标事件
        element.style.transform = 'translate(-50%, -50%)'; // 居中
        element.style.zIndex = '1000'; // 确保在最上层
        
        // 将元素添加到canvas的父容器中
        const canvasParent = this.renderer.app.canvas.parentElement;
        canvasParent.style.position = 'relative'; // 确保父容器是相对定位的
        canvasParent.appendChild(element);
        
        // 保存引用
        this.element = element;
        
        // 初始位置在画布外
        this.element.style.left = '-10px';
        this.element.style.top = '-10px';
        
        // 如果启用调试模式，创建调试文本
        if (this.options.debug) {
            this.debugText = new PIXI.Text('', {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: 0x000000,
                align: 'left'
            });
            this.debugText.position.set(10, 10);
            this.renderer.app.stage.addChild(this.debugText);
            
            console.log('Pointer debug mode enabled');
        }
        
        console.log('Pointer indicator created');
    }
    
    /**
     * 更新光标指示器位置
     * @param {PointerEvent} e - 指针事件
     */
    update(e) {
        if (!this.element) return;
        
        // 获取当前时间
        const now = performance.now();
        
        // 如果时间间隔太短，则跳过更新
        if (now - this.lastUpdateTime < this.options.updateInterval) {
            return;
        }
        
        // 创建指针信息对象
        const pointer = createPointerInfo(e);
        
        // 使用工具函数获取所有坐标信息
        const coords = getCoordinates(pointer, this.renderer.app.canvas, this.renderer.contentLayer);
        
        // 设置DOM元素的位置（使用canvas坐标，因为DOM元素是相对于canvas父元素放置的）
        this.element.style.left = `${coords.canvasX}px`;
        this.element.style.top = `${coords.canvasY}px`;
        
        // 更新光标大小，保持固定大小，不受缩放影响
        this.element.style.width = `${this.options.size}px`;
        this.element.style.height = `${this.options.size}px`;
        
        // 更新上次更新时间
        this.lastUpdateTime = now;
        
        // 更新调试信息
        if (this.options.debug && this.debugText) {
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
            `Client: (${info.canvasX.toFixed(1)}, ${info.canvasY.toFixed(1)})`,
            `Canvas: (${info.canvasX.toFixed(1)}, ${info.canvasY.toFixed(1)})`,
            `Offset: (${info.offsetX.toFixed(1)}, ${info.offsetY.toFixed(1)})`,
            `Scale: ${info.scale.toFixed(2)}`,
            `World: (${info.worldX.toFixed(1)}, ${info.worldY.toFixed(1)})`
        ].join('\n');
        
        // 每100帧输出一次日志
        if (Math.floor(performance.now() / 100) % 10 === 0) {
            console.log('Pointer Debug:', {
                canvas: `(${info.canvasX.toFixed(1)}, ${info.canvasY.toFixed(1)})`,
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
        if (this.element) {
            // 直接设置固定大小，不受缩放影响
            this.element.style.width = `${size}px`;
            this.element.style.height = `${size}px`;
        }
    }
    
    /**
     * 设置光标颜色
     * @param {string} color - CSS颜色值
     */
    setColor(color) {
        this.options.color = color;
        if (this.element) {
            this.element.style.backgroundColor = color;
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
            this.renderer.app.stage.addChild(this.debugText);
            console.log('Pointer debug mode enabled');
        } else if (!enabled && this.debugText) {
            // 移除调试文本
            this.renderer.app.stage.removeChild(this.debugText);
            this.debugText.destroy();
            this.debugText = null;
            console.log('Pointer debug mode disabled');
        }
    }
    
    /**
     * 销毁光标指示器
     */
    destroy() {
        // 移除DOM元素
        if (this.element && this.element.parentElement) {
            this.element.parentElement.removeChild(this.element);
            this.element = null;
        }
        
        // 移除调试文本
        if (this.debugText) {
            this.renderer.app.stage.removeChild(this.debugText);
            this.debugText.destroy();
            this.debugText = null;
        }
        
        console.log('Pointer indicator destroyed');
    }
}