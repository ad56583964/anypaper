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
            size: options.size || 3,
            color: options.color || 0xFF0000, // 红色
            alpha: options.alpha || 1,
            borderWidth: options.borderWidth || 2,
            borderColor: options.borderColor || 0x990000, // 深红色
            isDebug: options.isDebug || false,
            id: options.id || `pointer-${Math.floor(Math.random() * 10000)}` // 唯一标识符
        };
        
        // 上次位置，用于追踪移动
        this.lastPosition = { x: -100, y: -100 };
        
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
        _hitpointer.name = this.options.id; // 设置名称方便调试
        
        this.draw(_hitpointer);
        
        // 设置交互模式，让指针更容易被测试
        _hitpointer.eventMode = 'none';
        
        // 确保指针在所在容器的最上层
        _hitpointer.zIndex = 9999;
        
        // 将光标添加到容器
        this.container.addChild(_hitpointer);
        this.container.sortableChildren = true; // 确保zIndex生效
        
        // 保存引用
        this._hitpointer = _hitpointer;
        
        // 初始位置在画布外
        this._hitpointer.position.set(-100, -100);
        
        console.log(`HitPointer created: ${this.options.id} with color: 0x${this.options.color.toString(16)}`);
    }
    
    /**
     * 绘制光标
     * @param {PIXI.Graphics} graphics - 要绘制的图形对象
     */
    draw(graphics) {
        graphics.clear();
        
        const size = this.options.size;
        const halfSize = size / 2;
        
        // 绘制填充圆
        graphics.circle(0, 0, halfSize)
            .fill({
                color: this.options.color,
                alpha: this.options.alpha
            });
        
        // 添加圆边框
        graphics.setStrokeStyle({
            width: this.options.borderWidth,
            color: this.options.borderColor,
            alpha: 1
        })
        .circle(0, 0, halfSize + 1) // 稍微大一点以便边框可见
        .stroke();
        
        // 如果是调试指针，添加更多的视觉元素
        if (this.options.isDebug) {
            const lineSize = size * 2;
            
            // 绘制十字线
            graphics.setStrokeStyle({
                width: 2,
                color: 0xFFFFFF, // 白色
                alpha: 0.8
            });
            
            // 水平线
            graphics.moveTo(-lineSize, 0)
                .lineTo(lineSize, 0)
                .stroke();
            
            // 垂直线
            graphics.moveTo(0, -lineSize)
                .lineTo(0, lineSize)
                .stroke();
                
            // 添加外环
            graphics.setStrokeStyle({
                width: 1,
                color: 0x000000, // 黑色
                alpha: 0.5
            })
            .circle(0, 0, size) // 外环
            .stroke();
        }
    }
    
    /**
     * 更新光标指示器位置
     * @param {number} x - x 坐标
     * @param {number} y - y 坐标
     * @param {PIXI.Application} app - PIXI 应用实例，用于强制渲染
     */
    update(x, y, app) {
        if (!this._hitpointer) return;
        
        // 计算移动距离
        const dx = x - this.lastPosition.x;
        const dy = y - this.lastPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 更新最后位置
        this.lastPosition.x = x;
        this.lastPosition.y = y;
        
        // 直接设置光标位置
        this._hitpointer.position.set(x, y);
        
        // 如果是调试指针，且移动距离较大，输出位置信息到控制台
        if (this.options.isDebug && distance > 5) {
            console.log(`${this.options.id} position: (${Math.round(x)}, ${Math.round(y)}), moved: ${Math.round(distance)}px`);
        }
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
     */
    setColor(color) {
        // 如果传入的是字符串（如 '#FF0000'），转换为数字
        if (typeof color === 'string') {
            // 移除 # 前缀（如果有）
            color = color.replace(/^#/, '');
            // 转换为十六进制数字
            color = parseInt(color, 16);
        }
        
        this.options.color = color;
        
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