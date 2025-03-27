import * as PIXI from 'pixi.js';

/**
 * PixiPaper 类 - 用于管理白板中的 Paper 组件
 * 从 PixiTable 中抽取，专门处理纸张相关的逻辑
 */
export default class PixiPaper {
    /**
     * 创建一个新的 PixiPaper 实例
     * @param {PixiTable} table - 父表格实例
     * @param {Object} options - Paper 选项
     */
    constructor(table, options = {}) {
        this.table = table;
        
        // 默认 paper 配置
        this.width = options.width || 3840;  // 默认 paper 宽度
        this.height = options.height || 2880; // 默认 paper 高度
        this.cornerRadius = options.cornerRadius || 5; // 圆角半径
        this.borderWidth = options.borderWidth || 1; // 边框宽度
        this.borderColor = options.borderColor || 0x333333; // 边框颜色
        this.fillColor = options.fillColor || 0xffffff; // 填充颜色
        this.shadowAlpha = options.shadowAlpha || 0.2; // 阴影透明度
        this.shadowColor = options.shadowColor || 0x000000; // 阴影颜色
        this.shadowOffset = options.shadowOffset || 5; // 阴影偏移
        this.shadowBlur = options.shadowBlur || 5; // 阴影模糊强度
        
        // 存储主要对象引用
        this.paperGraphics = null; // paper 图形对象
        this.paperContainer = null; // paper 容器
        this.shadowGraphics = null; // 阴影图形对象
        this.mask = null; // paper 遮罩
        
        // 创建 paper 容器
        this.createPaperContainer();
        
        // 创建 paper
        this.createPaper();
        
        // 创建遮罩
        this.createMask();
    }
    
    /**
     * 创建 paper 容器
     */
    createPaperContainer() {
        this.paperContainer = new PIXI.Container();
        this.paperContainer.label = 'paper';
        
        // 计算居中位置
        this.x = (this.table.width - this.width) / 2;
        this.y = (this.table.height - this.height) / 2;
        
        // 设置 paperContainer 的位置，让它偏移到计算出的位置
        this.paperContainer.position.set(this.x, this.y);
        
        // 将 paperContainer 添加到 table 的 bgLayer
        if (this.table.bgLayer) {
            this.table.bgLayer.addChild(this.paperContainer);
        }
    }
    
    /**
     * 创建 paper 遮罩
     * @returns {PIXI.Graphics} 创建的遮罩对象
     */
    createMask() {
        if (this.mask) return this.mask;
        
        // 创建遮罩图形
        this.mask = new PIXI.Graphics();
        this.mask.beginFill(0xffffff);
        this.mask.drawRoundedRect(0, 0, this.width, this.height, this.cornerRadius);
        this.mask.endFill();
        
        // 设置遮罩位置
        this.mask.x = this.x;
        this.mask.y = this.y;
        
        // 将遮罩添加到 paperContainer
        if (this.paperContainer) {
            this.paperContainer.addChild(this.mask);
        }
        
        console.log('Paper mask created:', {
            bounds: {
                x: this.x,
                y: this.y,
                width: this.width,
                height: this.height
            },
            cornerRadius: this.cornerRadius
        });
        
        return this.mask;
    }
    
    /**
     * 创建 paper
     */
    createPaper() {
        // 创建 paper 对象，绘制从 (0, 0) 开始
        this.paperGraphics = new PIXI.Graphics()
            .setStrokeStyle(this.borderWidth, this.borderColor)
            .roundRect(0, 0, this.width, this.height, this.cornerRadius)
            .fill(this.fillColor);

        // 创建容器用于组织 paper 和阴影
        const paperItemContainer = new PIXI.Container();
        paperItemContainer.addChild(this.paperGraphics);
        
        // 创建阴影，相对于 (0, 0) 偏移 shadowOffset
        this.shadowGraphics = new PIXI.Graphics()
            .roundRect(this.shadowOffset, this.shadowOffset, this.width, this.height, this.cornerRadius)
            .fill({
                color: this.shadowColor,
                alpha: this.shadowAlpha
            });
        
        // 添加模糊滤镜
        const blurFilter = new PIXI.BlurFilter();
        blurFilter.strength = this.shadowBlur;
        this.shadowGraphics.filters = [blurFilter];
        
        // 确保阴影在 paper 下方
        paperItemContainer.addChildAt(this.shadowGraphics, 0);
        
        // 添加到 paper 容器
        this.paperContainer.addChild(paperItemContainer);
        
        console.log('Paper created', {
            width: this.width,
            height: this.height,
            containerPosition: { x: this.x, y: this.y }
        });
    }
    
    /**
     * 获取 paper 的边界
     * @returns {Object} - paper 的边界信息，相对于 paperContainer 的本地坐标系
     */
    getBounds() {
        if (!this.paperGraphics) return null;
        
        // 获取 paperGraphics 的本地边界（相对于 paperContainer）
        const localBounds = this.paperGraphics.getLocalBounds();
        
        console.log('Paper local bounds:', {
            bounds: localBounds,
            scale: this.paperContainer.scale
        });
        
        // 返回相对于 paperContainer 的本地边界
        return {
            x: localBounds.x,
            y: localBounds.y,
            width: localBounds.width,
            height: localBounds.height
        };
    }
    
    /**
     * 检查点是否在 paper 范围内
     * @param {number} x - X 坐标（全局坐标）
     * @param {number} y - Y 坐标（全局坐标）
     * @returns {boolean} - 是否在 paper 范围内
     */
    isPointInside(x, y) {
        if (!this.paperGraphics || !this.paperContainer) {
            return false;
        }

        // 先将点转换到 bgLayer 的本地坐标系
        const bgLayerPoint = this.table.bgLayer.toLocal(new PIXI.Point(x, y));

        // 然后再考虑 paperContainer 相对于 bgLayer 的位置和缩放
        const containerPos = this.paperContainer.position;
        const containerScale = this.paperContainer.scale;
        
        const inside = (
            bgLayerPoint.x >= containerPos.x && 
            bgLayerPoint.x <= containerPos.x + this.width * containerScale.x &&
            bgLayerPoint.y >= containerPos.y && 
            bgLayerPoint.y <= containerPos.y + this.height * containerScale.y
        );

        // 记录详细的检查信息
        // 记录点的位置和检查结果
        console.log('Point inside check:', {
            globalPoint: `(${Math.round(x)}, ${Math.round(y)})`,
            localPoint: `(${Math.round(bgLayerPoint.x)}, ${Math.round(bgLayerPoint.y)})`,
            paperBounds: {
                x: Math.round(containerPos.x),
                y: Math.round(containerPos.y),
                width: Math.round(this.width * containerScale.x),
                height: Math.round(this.height * containerScale.y)
            },
            scale: `(${containerScale.x.toFixed(2)}, ${containerScale.y.toFixed(2)})`,
            inside
        });

        return inside;
    }
    

    
    /**
     * 调整视口使 Paper 居中显示
     * 在缩放后调用此方法可以确保 Paper 在视图中居中
     */
    centerInView() {
        if (!this.paperGraphics) return;
        
        // 获取当前缩放值
        const scale = this.table.contentLayer.scale.x;
        
        // 计算 paper 的中心点（在其自身的局部坐标系中）
        const paperCenterX = this.width / 2;
        const paperCenterY = this.height / 2;
        
        // 计算视口中心
        const viewportCenterX = this.table.getScaledStageWidth() / 2;
        const viewportCenterY = this.table.getScaledStageHeight() / 2;
        
        // 将 paper 中心点转换到全局坐标系
        const paperCenterGlobal = this.paperContainer.toGlobal(new PIXI.Point(paperCenterX, paperCenterY));
        console.log('paperCenterGlobal', paperCenterGlobal);
        // 计算新的内容层位置，使 paper 中心与视口中心对齐
        const newContentX = viewportCenterX - paperCenterGlobal.x * scale;
        const newContentY = viewportCenterY - paperCenterGlobal.y * scale;
        
        // 应用新位置
        this.table.contentLayer.position.set(newContentX, newContentY);
        this.table.bgLayer.position.set(newContentX, newContentY);
        
        console.log('视口已调整，Paper 居中显示', {
            paperSize: { width: this.width, height: this.height },
            paperCenter: { x: paperCenterX, y: paperCenterY },
            paperCenterGlobal,
            viewportCenter: { x: viewportCenterX, y: viewportCenterY },
            scale,
            newPosition: { x: newContentX, y: newContentY }
        });
    }
    
    /**
     * 清除 paper 内容
     */
    clear() {
        if (this.paperContainer) {
            this.paperContainer.removeChildren();
            this.createPaper();
        }
    }
    
    /**
     * 设置 paper 大小
     * @param {number} width - 新宽度
     * @param {number} height - 新高度
     */
    setSize(width, height) {
        this.width = width;
        this.height = height;
        
        // 重新创建 paper
        this.clear();
        this.createPaper();
        
        // 调整视口
        this.centerInView();
    }
}
