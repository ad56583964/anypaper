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
        
        // 创建 paper 容器
        this.createPaperContainer();
        
        // 创建 paper
        this.createPaper();
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
     * @returns {Object} - paper 的边界信息
     */
    getBounds() {
        if (!this.paperGraphics) return null;
        
        // 直接从 paperGraphics 获取位置和大小信息
        const paperBounds = this.paperGraphics.getBounds();
        console.log('paperBounds', paperBounds);
        // 将该点从 paper 坐标系转换到 bgLayer 坐标系
        const paperTopLeft = this.table.bgLayer.toLocal(
            new PIXI.Point(paperBounds.x, paperBounds.y),
            this.paperGraphics.parent
        );
        
        return {
            x: paperTopLeft.x,
            y: paperTopLeft.y,
            width: paperBounds.width,
            height: paperBounds.height
        };
    }
    
    /**
     * 检查点是否在 paper 范围内
     * @param {number} x - X 坐标
     * @param {number} y - Y 坐标
     * @returns {boolean} - 是否在 paper 范围内
     */
    isPointInside(x, y) {
        const bounds = this.getBounds();
        if (!bounds) {
            return false;
        }
        
        return x >= bounds.x && 
               x <= bounds.x + bounds.width &&
               y >= bounds.y && 
               y <= bounds.height;
    }
    
    /**
     * 创建用于限制绘制区域的 paper 遮罩
     * @returns {PIXI.Graphics} - 创建的遮罩图形
     */
    createMask() {
        const bounds = this.getBounds();
        if (!bounds) return null;
        
        // 创建一个用于遮罩的 Graphics 对象
        const mask = new PIXI.Graphics();
        
        // 绘制与 paper 相同大小和位置的矩形作为遮罩
        mask.rect(
            bounds.x, 
            bounds.y, 
            bounds.width, 
            bounds.height
        )
        .fill(0xFFFFFF);
        
        console.log('Paper mask created at:', {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height
        });
        
        return mask;
    }
    
    /**
     * 调整视口使 Paper 居中显示
     * 在缩放后调用此方法可以确保 Paper 在视图中居中
     */
    centerInView() {
        if (!this.paperGraphics) return;
        
        // 获取 paper 的边界
        const paperBounds = this.paperGraphics.getBounds();
        
        // 计算 paper 的中心点
        const paperCenterX = paperBounds.x + paperBounds.width / 2;
        const paperCenterY = paperBounds.y + paperBounds.height / 2;
        
        // 获取当前缩放值
        const scale = this.table.contentLayer.scale.x;
        
        // 计算视口中心
        const viewportCenterX = this.table.getScaledStageWidth() / 2;
        const viewportCenterY = this.table.getScaledStageHeight() / 2;
        
        // 将 paper 中心点转换到舞台坐标系
        const paperCenterStage = this.paperGraphics.parent.toGlobal(new PIXI.Point(paperCenterX, paperCenterY));
        
        // 计算新的内容层位置，使 paper 中心与视口中心对齐
        const newContentX = viewportCenterX - paperCenterStage.x * scale;
        const newContentY = viewportCenterY - paperCenterStage.y * scale;
        
        // 应用新位置
        this.table.contentLayer.position.set(newContentX, newContentY);
        this.table.bgLayer.position.set(newContentX, newContentY);
        
        console.log('视口已调整，Paper 居中显示', {
            paperBounds,
            paperCenter: { x: paperCenterX, y: paperCenterY },
            paperCenterStage,
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