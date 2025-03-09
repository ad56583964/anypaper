import * as PIXI from 'pixi.js';

/**
 * PixiLayer 类 - 管理 PIXI 图层
 * 提供类似 Konva.Layer 的 API，简化图层管理
 */
export default class PixiLayer {
    /**
     * 创建一个新的 PixiLayer 实例
     * @param {PixiRenderer} renderer - 渲染器实例
     * @param {Object} options - 图层选项
     * @param {string} [options.name] - 图层名称
     * @param {string} [options.parent='content'] - 父容器 ('background' 或 'content')
     */
    constructor(renderer, options = {}) {
        this.renderer = renderer;
        this.container = new PIXI.Container();
        
        // 设置名称 - 在 PixiJS v8 中使用 label 代替 name
        if (options.name) {
            this.container.label = options.name;
        }
        
        // 添加到父容器
        if (options.parent === 'background') {
            renderer.bgLayer.addChild(this.container);
        } else {
            renderer.contentLayer.addChild(this.container);
        }
        
        // 缓存标志
        this.isCached = false;
        
        console.log(`PixiLayer created: ${options.name || 'unnamed'}`);
    }
    
    /**
     * 添加显示对象到图层
     * @param {PIXI.DisplayObject} displayObject - 要添加的显示对象
     * @returns {PixiLayer} - 当前图层实例，用于链式调用
     */
    add(displayObject) {
        this.container.addChild(displayObject);
        return this;
    }
    
    /**
     * 移除显示对象
     * @param {PIXI.DisplayObject} displayObject - 要移除的显示对象
     * @returns {PixiLayer} - 当前图层实例，用于链式调用
     */
    remove(displayObject) {
        this.container.removeChild(displayObject);
        return this;
    }
    
    /**
     * 清除图层中的所有对象
     * @returns {PixiLayer} - 当前图层实例，用于链式调用
     */
    clear() {
        while (this.container.children.length > 0) {
            const child = this.container.getChildAt(0);
            this.container.removeChild(child);
        }
        return this;
    }
    
    /**
     * 缓存图层以提高性能
     * @param {Object} options - 缓存选项
     * @param {number} [options.resolution] - 缓存分辨率
     * @returns {PixiLayer} - 当前图层实例，用于链式调用
     */
    cache(options = {}) {
        // 在 PixiJS v8 中，我们可以直接使用 Container 的 cacheAsBitmap 属性
        // 这样可以避免手动创建纹理和精灵
        
        try {
            // 获取容器边界
            const bounds = this.container.getBounds();
            if (bounds.width === 0 || bounds.height === 0) {
                console.warn('Cannot cache layer with zero width or height');
                return this;
            }
            
            // 启用缓存
            this.container.cacheAsBitmap = true;
            this.isCached = true;
            
            console.log('Layer cached successfully');
        } catch (e) {
            console.error('缓存图层时出错:', e);
            this.isCached = false;
        }
        
        return this;
    }
    
    /**
     * 取消缓存
     * @returns {PixiLayer} - 当前图层实例，用于链式调用
     */
    uncache() {
        if (!this.isCached) return this;
        
        try {
            // 在 PixiJS v8 中，只需禁用 cacheAsBitmap
            this.container.cacheAsBitmap = false;
            this.isCached = false;
            
            console.log('Layer uncached successfully');
        } catch (e) {
            console.error('取消缓存图层时出错:', e);
        }
        
        return this;
    }
    
    /**
     * 设置图层可见性
     * @param {boolean} visible - 是否可见
     * @returns {PixiLayer} - 当前图层实例，用于链式调用
     */
    visible(visible) {
        // 在 PixiJS v8 中，我们只需设置容器的 visible 属性
        this.container.visible = visible;
        return this;
    }
    
    /**
     * 设置图层位置
     * @param {Object} position - 位置对象
     * @param {number} position.x - X 坐标
     * @param {number} position.y - Y 坐标
     * @returns {PixiLayer} - 当前图层实例，用于链式调用
     */
    position(position) {
        // 在 PixiJS v8 中，我们只需设置容器的 position
        this.container.position.set(position.x, position.y);
        return this;
    }
    
    /**
     * 设置图层缩放
     * @param {Object} scale - 缩放对象
     * @param {number} scale.x - X 轴缩放
     * @param {number} scale.y - Y 轴缩放
     * @returns {PixiLayer} - 当前图层实例，用于链式调用
     */
    scale(scale) {
        // 在 PixiJS v8 中，我们只需设置容器的 scale
        this.container.scale.set(scale.x, scale.y);
        return this;
    }
    
    /**
     * 重新绘制图层
     * @returns {PixiLayer} - 当前图层实例，用于链式调用
     */
    batchDraw() {
        // PixiJS 自动处理渲染，此方法仅为兼容 Konva API
        return this;
    }
    
    /**
     * 查找图层中的对象
     * @param {string} selector - 选择器（目前仅支持 '.className'）
     * @returns {PIXI.DisplayObject[]} - 匹配的对象数组
     */
    find(selector) {
        const result = [];
        
        // 简单的选择器实现，仅支持类名
        if (selector.startsWith('.')) {
            const className = selector.substring(1);
            this._findByClassName(this.container, className, result);
        }
        
        return result;
    }
    
    /**
     * 递归查找具有特定类名的对象
     * @private
     * @param {PIXI.Container} container - 容器
     * @param {string} className - 类名
     * @param {PIXI.DisplayObject[]} result - 结果数组
     */
    _findByClassName(container, className, result) {
        for (const child of container.children) {
            if (child.label === className) {
                result.push(child);
            }
            
            if (child.children && child.children.length > 0) {
                this._findByClassName(child, className, result);
            }
        }
    }
    
    /**
     * 销毁图层
     */
    destroy() {
        if (this.isCached) {
            this.uncache();
        }
        
        this.container.destroy({ children: true });
        this.container = null;
        this.renderer = null;
    }
} 