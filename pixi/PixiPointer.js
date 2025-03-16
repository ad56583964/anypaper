import * as PIXI from 'pixi.js';
import { getCoordinates, createPointerInfo } from './utils';
import { updateDebugInfo } from '../debug.jsx';

/**
 * PixiPointer 类 - 光标指示器
 * 在画布上跟踪和显示指针位置
 */
export default class PixiPointer {
    /**
     * 创建一个新的光标指示器
     * @param {PixiTable} table - PixiTable 实例
     * @param {Object} options - 配置选项
     */
    constructor(table, options = {}) {
        this.table = table;
        
        // 配置选项
        this.options = {
            size: options.size || 10,
            color: options.color || 0xFF0000, // 红色
            alpha: options.alpha !== undefined ? options.alpha : 0.7,
        };
        
        // 是否启用调试
        this.debug = options.debug !== undefined ? options.debug : false;
        
        // PixiJS 图形对象
        this.pointer = null;
        
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
        
        // 将光标直接添加到内容层
        this.table.contentLayer.addChild(pointer);
        
        // 保存引用
        this.pointer = pointer;
        
        // 初始位置在画布外
        this.pointer.position.set(-100, -100);
        
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
     * @param {number} x - 在 table 中的 x 坐标
     * @param {number} y - 在 table 中的 y 坐标
     */
    update(x, y) {
        if (!this.pointer) return;
        
        // 直接设置光标位置
        this.pointer.position.set(x, y);
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
     * 销毁光标指示器
     */
    destroy() {
        // 移除光标
        if (this.pointer) {
            if (this.pointer.parent) {
                this.pointer.parent.removeChild(this.pointer);
            }
            this.pointer.destroy();
            this.pointer = null;
        }
        
        console.log('Pointer indicator destroyed');
    }
}