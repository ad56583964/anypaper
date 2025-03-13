/**
 * 坐标和变换工具函数
 */

/**
 * 计算客户端坐标到画布坐标系的转换
 * @param {Object} e - 包含clientX和clientY的事件对象
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @returns {Object} - 包含画布坐标和世界坐标的对象
 */
export function getCanvasCoordinates(e, canvas) {
    // 获取Canvas的边界矩形
    const rect = canvas.getBoundingClientRect();
    
    // 计算相对于canvas的坐标
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
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
 * @param {Object} e - 包含clientX和clientY的事件对象
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @param {PIXI.Container} contentLayer - 内容层容器
 * @returns {Object} - 包含画布坐标和世界坐标的对象
 */
export function getCoordinates(e, canvas, contentLayer) {
    // 获取画布坐标
    const { canvasX, canvasY } = getCanvasCoordinates(e, canvas);
    
    // 获取内容层的变换信息
    const scale = contentLayer.scale.x;
    const offsetX = contentLayer.position.x;
    const offsetY = contentLayer.position.y;
    
    // 计算世界坐标
    const worldX = (canvasX - offsetX) / scale;
    const worldY = (canvasY - offsetY) / scale;
    
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