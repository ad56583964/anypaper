/**
 * 坐标和变换工具函数
 */

/**
 * 指针信息接口
 * @typedef {Object} PointerInfo
 * @property {number} x - 指针在客户端坐标系的X坐标
 * @property {number} y - 指针在客户端坐标系的Y坐标
 */

/**
 * 计算客户端坐标到画布坐标系的转换
 * @param {PointerInfo} pointer - 包含x和y的指针信息对象
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @returns {Object} - 包含画布坐标的对象
 */
export function getCanvasCoordinates(pointer, canvas) {
    // 获取Canvas的边界矩形
    const rect = canvas.getBoundingClientRect();
    
    // 计算相对于canvas的坐标
    const canvasX = pointer.x - rect.left;
    const canvasY = pointer.y - rect.top;
    
    return { canvasX, canvasY };
}

/**
 * 计算画布坐标到世界坐标的转换（考虑缩放和平移）
 * @param {Object} coords - 包含canvasX和canvasY的对象
 * @param {PIXI.Container} contentLayer - 内容层容器
 * @returns {Object} - 包含世界坐标的对象
 */
export function canvasToWorldCoordinates(coords, contentLayer) {
    // 获取内容层的变换信息
    const scale = contentLayer.scale.x; // 假设x和y缩放相同
    const offsetX = contentLayer.position.x;
    const offsetY = contentLayer.position.y;
    
    // 计算世界坐标（考虑内容层的缩放和平移）
    // 公式: world = (canvas - offset) / scale
    const worldX = (coords.canvasX - offsetX) / scale;
    const worldY = (coords.canvasY - offsetY) / scale;
    
    return { worldX, worldY };
}

/**
 * 获取从客户端坐标到世界坐标的完整转换
 * @param {PointerInfo} pointer - 包含x和y的指针信息对象
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @param {PIXI.Container} contentLayer - 内容层容器
 * @param {PIXI.Renderer} [renderer] - PixiJS 渲染器实例（可选）
 * @returns {Object} - 包含画布坐标和世界坐标的对象
 */
export function getCoordinates(pointer, canvas, contentLayer, renderer) {
    // 获取画布坐标
    const { canvasX, canvasY } = getCanvasCoordinates(pointer, canvas);
    
    // 获取内容层的变换信息
    const scale = contentLayer.scale.x;
    const offsetX = contentLayer.position.x;
    const offsetY = contentLayer.position.y;
    
    // 计算世界坐标
    let worldX, worldY;
    
    // 如果提供了渲染器，使用 PixiJS 的交互系统获取更准确的坐标
    if (renderer && renderer.app && renderer.app.renderer) {
        // 创建一个临时点来存储结果
        const tempPoint = new PIXI.Point();
        
        // 使用 PixiJS 的交互系统将客户端坐标映射到舞台坐标
        if (renderer.app.renderer.events) {
            // PixiJS v8 方式
            renderer.app.renderer.events.mapPositionToPoint(tempPoint, pointer.x, pointer.y);
        } else if (renderer.app.renderer.plugins && renderer.app.renderer.plugins.interaction) {
            // PixiJS v7 及以下方式
            renderer.app.renderer.plugins.interaction.mapPositionToPoint(tempPoint, pointer.x, pointer.y);
        }
        
        // 将舞台坐标转换为内容层的本地坐标
        const localPos = contentLayer.worldTransform.applyInverse(tempPoint);
        
        worldX = localPos.x;
        worldY = localPos.y;
    } else {
        // 回退到传统计算方法
        worldX = (canvasX - offsetX) / scale;
        worldY = (canvasY - offsetY) / scale;
    }
    
    return {
        canvasX,
        canvasY,
        worldX,
        worldY,
        scale,
        offsetX,
        offsetY
    };
}

/**
 * 从事件对象创建指针信息对象
 * @param {Event} e - 事件对象(如鼠标事件、触摸事件等)
 * @returns {PointerInfo} - 标准化的指针信息对象
 */
export function createPointerInfo(e) {
    return {
        x: e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0),
        y: e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0)
    };
}