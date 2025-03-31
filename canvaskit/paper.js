/**
 * CanvasPaper 类 - 用于管理白板中的Paper组件
 * 使用CanvasKit替代原有的Pixi.js实现
 */
export default class CanvasPaper {
    /**
     * 创建一个新的CanvasPaper实例
     * @param {CanvasTable} table - 父表格实例
     * @param {Object} options - Paper 选项
     */
    constructor(table, options = {}) {
        this.table = table;
        this.CanvasKit = table.CanvasKit;
        
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
        
        // 计算居中位置
        this.x = (this.table.width - this.width) / 2;
        this.y = (this.table.height - this.height) / 2;
        
        // 初始化绘图资源
        this.initDrawingResources();
    }
    
    /**
     * 初始化绘图资源
     */
    initDrawingResources() {
        // 创建边框绘制样式
        this.borderPaint = new this.CanvasKit.Paint();
        this.borderPaint.setColor(this.CanvasKit.Color4f(
            ((this.borderColor >> 16) & 0xff) / 255,
            ((this.borderColor >> 8) & 0xff) / 255,
            (this.borderColor & 0xff) / 255,
            1.0
        ));
        this.borderPaint.setStyle(this.CanvasKit.PaintStyle.Stroke);
        this.borderPaint.setStrokeWidth(this.borderWidth);
        this.borderPaint.setAntiAlias(true);
        
        // 创建填充绘制样式
        this.fillPaint = new this.CanvasKit.Paint();
        this.fillPaint.setColor(this.CanvasKit.Color4f(
            ((this.fillColor >> 16) & 0xff) / 255,
            ((this.fillColor >> 8) & 0xff) / 255,
            (this.fillColor & 0xff) / 255,
            1.0
        ));
        this.fillPaint.setStyle(this.CanvasKit.PaintStyle.Fill);
        this.fillPaint.setAntiAlias(true);
        
        // 创建阴影绘制样式
        this.shadowPaint = new this.CanvasKit.Paint();
        this.shadowPaint.setColor(this.CanvasKit.Color4f(
            ((this.shadowColor >> 16) & 0xff) / 255,
            ((this.shadowColor >> 8) & 0xff) / 255,
            (this.shadowColor & 0xff) / 255,
            this.shadowAlpha
        ));
        this.shadowPaint.setStyle(this.CanvasKit.PaintStyle.Fill);
        this.shadowPaint.setAntiAlias(true);
        
        // 为阴影添加模糊效果
        const blurFilter = this.CanvasKit.MaskFilter.MakeBlur(
            this.CanvasKit.BlurStyle.Normal,
            this.shadowBlur,
            false
        );
        this.shadowPaint.setMaskFilter(blurFilter);
        
        // 创建paper路径
        this.paperPath = this.createRoundedRectPath(
            0, 0, 
            this.width, this.height, 
            this.cornerRadius
        );
        
        // 创建阴影路径(偏移版本)
        this.shadowPath = this.createRoundedRectPath(
            this.shadowOffset, this.shadowOffset, 
            this.width, this.height, 
            this.cornerRadius
        );
        
        // 创建遮罩区域
        this.createClipRegion();
    }
    
    /**
     * 创建圆角矩形路径
     */
    createRoundedRectPath(x, y, width, height, radius) {
        const rrect = this.CanvasKit.RRectXY(
            this.CanvasKit.LTRBRect(x, y, x + width, y + height),
            radius, radius
        );
        
        const path = new this.CanvasKit.Path();
        path.addRRect(rrect);
        return path;
    }
    
    /**
     * 创建遮罩区域
     */
    createClipRegion() {
        this.clipRegion = this.CanvasKit.RRectXY(
            this.CanvasKit.LTRBRect(
                this.x, 
                this.y, 
                this.x + this.width, 
                this.y + this.height
            ),
            this.cornerRadius, 
            this.cornerRadius
        );
    }
    
    /**
     * 在canvas上绘制paper
     * @param {SkCanvas} canvas - CanvasKit画布对象
     */
    draw(canvas) {
        // 保存当前状态
        canvas.save();
        
        // 平移到paper位置
        canvas.translate(this.x, this.y);
        
        // 先绘制阴影
        canvas.drawPath(this.shadowPath, this.shadowPaint);
        
        // 绘制纸张填充
        canvas.drawPath(this.paperPath, this.fillPaint);
        
        // 绘制纸张边框
        canvas.drawPath(this.paperPath, this.borderPaint);
        
        // 恢复状态
        canvas.restore();
    }
    
    /**
     * 检查点是否在paper范围内
     * @param {number} x - X坐标（全局坐标）
     * @param {number} y - Y坐标（全局坐标）
     * @returns {boolean} - 是否在paper范围内
     */
    isPointInside(x, y) {
        // 简单的边界检查
        return x >= this.x && x <= this.x + this.width && 
               y >= this.y && y <= this.y + this.height;
    }
    
    /**
     * 获取paper的遮罩请求
     * @returns {SkRRect} - paper的遮罩请求
     */
    getClipRRect() {
        return this.clipRegion;
    }
    
    /**
     * 在canvas上应用遮罩
     * @param {SkCanvas} canvas - CanvasKit画布对象
     */
    applyClip(canvas) {
        canvas.clipRRect(this.clipRegion, this.CanvasKit.ClipOp.Intersect, true);
    }
    
    /**
     * 调整视口使paper居中显示
     */
    centerInView() {
        // 重置表格的变换
        this.table.transform.translateX = 0;
        this.table.transform.translateY = 0;
        
        // 更新矩阵
        this.table.updateMatrix();
    }
}
