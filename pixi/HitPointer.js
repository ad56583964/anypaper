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
            size: options.size || 2,
            color: options.color || 0xFF0000, // 红色
        };
        
        // PixiJS 图形对象
        this._hitpointer = null;
        
        // 初始化
        this.init();
    }
    
    /**
     * 初始化光标指示器
     */
    init() {
        // 创建一个 PIXI.Graphics 对象作为光标指示器
        const _hitpointer = new PIXI.Graphics();
        this.draw(_hitpointer);
        
        // 将光标添加到容器
        this.container.addChild(_hitpointer);
        
        // 保存引用
        this._hitpointer = _hitpointer;
        
        // 初始位置在画布外
        this._hitpointer.position.set(-100, -100);
        
        console.log('HitPointer created');
    }
    
    /**
     * 绘制光标
     * @param {PIXI.Graphics} graphics - 要绘制的图形对象
     */
    draw(graphics) {
        graphics.clear();
        
        // PixiJS v8 风格：使用 fill 方法代替 beginFill/endFill
        graphics.circle(0, 0, this.options.size / 2)
            .fill({
                color: this.options.color,
                alpha: this.options.alpha || 0.7
            });
    }
    
    /**
     * 更新光标指示器位置
     * @param {number} x - x 坐标
     * @param {number} y - y 坐标
     * @param {PIXI.Application} app - PIXI 应用实例，用于强制渲染
     */
    update(x, y, app) {
        if (!this._hitpointer) return;
        
        // 直接设置光标位置
        this._hitpointer.position.set(x, y);
        
        // 强制渲染
        // if (app) {
        //     app.render();
        // }
    }
    
    /**
     * 设置光标大小
     * @param {number} size - 光标大小（像素）
     */
    setSize(size) {
        this.options.size = size;
        if (this._hitpointer) {
            this.draw(this._hitpointer);
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
        
        if (this._hitpointer) {
            this.draw(this._hitpointer);
        }
    }
    
    /**
     * 销毁光标指示器
     */
    destroy() {
        // 移除光标
        if (this._hitpointer) {
            if (this._hitpointer.parent) {
                this._hitpointer.parent.removeChild(this._hitpointer);
            }
            this._hitpointer.destroy();
            this._hitpointer = null;
        }
        
        console.log('HitPointer destroyed');
    }
} 