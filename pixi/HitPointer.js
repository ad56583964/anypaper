import * as PIXI from 'pixi.js';

/**
 * HitPointer 类 - 简化的光标指示器
 * 在画布上跟踪和显示指针位置
 */
export default class HitPointer {
    /**
     * 创建一个新的光标指示器
     * @param {PIXI.Container} container - 要添加指针的容器
     * @param {Object} options - 配置选项
     */
    constructor(container, options = {}) {
        // 保存容器引用
        this.container = container;
        
        // 配置选项
        this.options = {
            size: options.size || 10,
            color: options.color || 0xFF0000, // 红色
        };
        
        // PixiJS 图形对象
        this.graphics = null;
        
        // 初始化
        this.init();
    }
    
    /**
     * 初始化光标指示器
     */
    init() {
        // 创建一个 PIXI.Graphics 对象作为光标指示器
        const graphics = new PIXI.Graphics();
        this.draw(graphics);
        
        // 将光标添加到容器
        this.container.addChild(graphics);
        
        // 保存引用
        this.graphics = graphics;
        
        // 初始位置在画布外
        this.graphics.position.set(-100, -100);
        
        console.log('HitPointer created');
    }
    
    /**
     * 绘制光标
     * @param {PIXI.Graphics} graphics - 要绘制的图形对象
     */
    draw(graphics) {
        graphics.clear();
        graphics.beginFill(this.options.color, this.options.alpha);
        graphics.drawCircle(0, 0, this.options.size / 2);
        graphics.endFill();
    }
    
    /**
     * 更新光标指示器位置
     * @param {number} x - x 坐标
     * @param {number} y - y 坐标
     */
    update(x, y) {
        if (!this.graphics) return;
        
        // 直接设置光标位置
        this.graphics.position.set(x, y);
    }
    
    /**
     * 设置光标大小
     * @param {number} size - 光标大小（像素）
     */
    setSize(size) {
        this.options.size = size;
        if (this.graphics) {
            this.draw(this.graphics);
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
        
        if (this.graphics) {
            this.draw(this.graphics);
        }
    }
    
    /**
     * 销毁光标指示器
     */
    destroy() {
        // 移除光标
        if (this.graphics) {
            if (this.graphics.parent) {
                this.graphics.parent.removeChild(this.graphics);
            }
            this.graphics.destroy();
            this.graphics = null;
        }
        
        console.log('HitPointer destroyed');
    }
} 