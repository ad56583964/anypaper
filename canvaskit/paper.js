/**
 * CanvasPaper u7c7b - u7528u4e8eu7ba1u7406u767du677fu4e2du7684Paperu7ec4u4ef6
 * u4f7fu7528CanvasKitu66ffu4ee3u539fu6709u7684Pixi.jsu5b9eu73b0
 */
export default class CanvasPaper {
    /**
     * u521bu5efau4e00u4e2au65b0u7684CanvasPaperu5b9eu4f8b
     * @param {CanvasTable} table - u7236u8868u683cu5b9eu4f8b
     * @param {Object} options - Paper u9009u9879
     */
    constructor(table, options = {}) {
        this.table = table;
        this.CanvasKit = table.CanvasKit;
        
        // u9ed8u8ba4 paper u914du7f6e
        this.width = options.width || 3840;  // u9ed8u8ba4 paper u5bbdu5ea6
        this.height = options.height || 2880; // u9ed8u8ba4 paper u9ad8u5ea6
        this.cornerRadius = options.cornerRadius || 5; // u5706u89d2u534au5f84
        this.borderWidth = options.borderWidth || 1; // u8fb9u6846u5bbdu5ea6
        this.borderColor = options.borderColor || 0x333333; // u8fb9u6846u989cu8272
        this.fillColor = options.fillColor || 0xffffff; // u586bu5145u989cu8272
        this.shadowAlpha = options.shadowAlpha || 0.2; // u9634u5f71u900fu660eu5ea6
        this.shadowColor = options.shadowColor || 0x000000; // u9634u5f71u989cu8272
        this.shadowOffset = options.shadowOffset || 5; // u9634u5f71u504fu79fb
        this.shadowBlur = options.shadowBlur || 5; // u9634u5f71u6a21u7ccau5f3au5ea6
        
        // u8ba1u7b97u5c45u4e2du4f4du7f6e
        this.x = (this.table.width - this.width) / 2;
        this.y = (this.table.height - this.height) / 2;
        
        // u521du59cbu5316u7ed8u56feu8d44u6e90
        this.initDrawingResources();
    }
    
    /**
     * u521du59cbu5316u7ed8u56feu8d44u6e90
     */
    initDrawingResources() {
        // u521bu5efau8fb9u6846u7ed8u5236u6837u5f0f
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
        
        // u521bu5efau586bu5145u7ed8u5236u6837u5f0f
        this.fillPaint = new this.CanvasKit.Paint();
        this.fillPaint.setColor(this.CanvasKit.Color4f(
            ((this.fillColor >> 16) & 0xff) / 255,
            ((this.fillColor >> 8) & 0xff) / 255,
            (this.fillColor & 0xff) / 255,
            1.0
        ));
        this.fillPaint.setStyle(this.CanvasKit.PaintStyle.Fill);
        this.fillPaint.setAntiAlias(true);
        
        // u521bu5efau9634u5f71u7ed8u5236u6837u5f0f
        this.shadowPaint = new this.CanvasKit.Paint();
        this.shadowPaint.setColor(this.CanvasKit.Color4f(
            ((this.shadowColor >> 16) & 0xff) / 255,
            ((this.shadowColor >> 8) & 0xff) / 255,
            (this.shadowColor & 0xff) / 255,
            this.shadowAlpha
        ));
        this.shadowPaint.setStyle(this.CanvasKit.PaintStyle.Fill);
        this.shadowPaint.setAntiAlias(true);
        
        // u4e3au9634u5f71u6dfbu52a0u6a21u7ccau6548u679c
        const blurFilter = this.CanvasKit.MaskFilter.MakeBlur(
            this.CanvasKit.BlurStyle.Normal,
            this.shadowBlur,
            false
        );
        this.shadowPaint.setMaskFilter(blurFilter);
        
        // u521bu5efapaperu8defu5f84
        this.paperPath = this.createRoundedRectPath(
            0, 0, 
            this.width, this.height, 
            this.cornerRadius
        );
        
        // u521bu5efau9634u5f71u8defu5f84(u504fu79fbu7248u672c)
        this.shadowPath = this.createRoundedRectPath(
            this.shadowOffset, this.shadowOffset, 
            this.width, this.height, 
            this.cornerRadius
        );
        
        // u521bu5efau9065u7f57u533au57df
        this.createClipRegion();
    }
    
    /**
     * u521bu5efau5706u89d2u77e9u5f62u8defu5f84
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
     * u521bu5efau9065u7f57u533au57df
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
     * u5728canvasu4e0au7ed8u5236paper
     * @param {SkCanvas} canvas - CanvasKitu753bu5e03u5bf9u8c61
     */
    draw(canvas) {
        // u4fddu5b58u5f53u524du72b6u6001
        canvas.save();
        
        // u5e73u79fbu5230paperu4f4du7f6e
        canvas.translate(this.x, this.y);
        
        // u5148u7ed8u5236u9634u5f71
        canvas.drawPath(this.shadowPath, this.shadowPaint);
        
        // u7ed8u5236u7eb8u5f20u586bu5145
        canvas.drawPath(this.paperPath, this.fillPaint);
        
        // u7ed8u5236u7eb8u5f20u8fb9u6846
        canvas.drawPath(this.paperPath, this.borderPaint);
        
        // u6062u590du72b6u6001
        canvas.restore();
    }
    
    /**
     * u68c0u67e5u70b9u662fu5426u5728paperu8303u56f4u5185
     * @param {number} x - Xu5750u6807uff08u5168u5c40u5750u6807uff09
     * @param {number} y - Yu5750u6807uff08u5168u5c40u5750u6807uff09
     * @returns {boolean} - u662fu5426u5728paperu8303u56f4u5185
     */
    isPointInside(x, y) {
        // u7b80u5355u7684u8fb9u754cu68c0u67e5
        return x >= this.x && x <= this.x + this.width && 
               y >= this.y && y <= this.y + this.height;
    }
    
    /**
     * u83b7u53d6paperu7684u9065u7f57u8bf7u6c42
     * @returns {SkRRect} - paperu7684u9065u7f57u8bf7u6c42
     */
    getClipRRect() {
        return this.clipRegion;
    }
    
    /**
     * u5728canvasu4e0au5e94u7528u9065u7f57
     * @param {SkCanvas} canvas - CanvasKitu753bu5e03u5bf9u8c61
     */
    applyClip(canvas) {
        canvas.clipRRect(this.clipRegion, this.CanvasKit.ClipOp.Intersect, true);
    }
    
    /**
     * u8c03u6574u89c6u53e3u4f7fpaperu5c45u4e2du663eu793a
     */
    centerInView() {
        // u91cdu7f6eu8868u683cu7684u53d8u6362
        this.table.transform.translateX = 0;
        this.table.transform.translateY = 0;
        
        // u66f4u65b0u77e9u9635
        this.table.updateMatrix();
    }
}
