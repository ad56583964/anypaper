import * as PIXI from 'pixi.js';

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
 * @param {PixiTable} [table] - PixiTable 实例（可选）
 * @returns {Object} - 包含画布坐标和世界坐标的对象
 */
export function getCoordinates(pointer, canvas, contentLayer, table) {
    // 获取渲染器的分辨率
    const resolution = table?.app?.renderer?.resolution || 1;
    
    // 获取画布坐标
    const { canvasX, canvasY } = getCanvasCoordinates(pointer, canvas);
    
    // 获取内容层的变换信息
    const scale = contentLayer.scale.x;
    const offsetX = contentLayer.position.x;
    const offsetY = contentLayer.position.y;
    
    // 计算世界坐标
    let worldX, worldY;
    
    // 如果提供了表格实例，使用 PixiJS 的交互系统获取更准确的坐标
    if (table && table.app && table.app.renderer) {
        // 创建一个临时点来存储结果
        const tempPoint = new PIXI.Point();
        
        // 使用 PixiJS 的交互系统将客户端坐标映射到舞台坐标
        if (table.app.renderer.events) {
            // PixiJS v8 方式
            table.app.renderer.events.mapPositionToPoint(tempPoint, pointer.x, pointer.y);
            
            // 记录原始映射结果，用于调试
            const originalX = tempPoint.x;
            const originalY = tempPoint.y;
            
            // 在某些情况下，mapPositionToPoint 可能没有正确处理分辨率
            // 我们可以通过比较 canvas 的 CSS 尺寸和实际尺寸来检测这种情况
            const cssWidth = canvas.clientWidth;
            const cssHeight = canvas.clientHeight;
            const realWidth = canvas.width;
            const realHeight = canvas.height;
            
            // 检查是否需要手动调整分辨率
            const calculatedResolution = realWidth / cssWidth;
            if (Math.abs(calculatedResolution - resolution) > 0.1) {
                // 分辨率不匹配，需要手动调整
                // console.log('Resolution mismatch detected', {
                //     cssSize: `${cssWidth}x${cssHeight}`,
                //     realSize: `${realWidth}x${realHeight}`,
                //     pixiResolution: resolution,
                //     calculatedResolution: calculatedResolution
                // });
                
                // 手动调整坐标，确保考虑正确的分辨率
                tempPoint.x = tempPoint.x / resolution * calculatedResolution;
                tempPoint.y = tempPoint.y / resolution * calculatedResolution;
            }
        } else if (table.app.renderer.plugins && table.app.renderer.plugins.interaction) {
            // PixiJS v7 及以下方式
            table.app.renderer.plugins.interaction.mapPositionToPoint(tempPoint, pointer.x, pointer.y);
            
            // 检查是否需要手动调整分辨率
            const cssWidth = canvas.clientWidth;
            const cssHeight = canvas.clientHeight;
            const realWidth = canvas.width;
            const realHeight = canvas.height;
            const calculatedResolution = realWidth / cssWidth;
            
            if (Math.abs(calculatedResolution - resolution) > 0.1) {
                // 手动调整坐标
                tempPoint.x = tempPoint.x / resolution * calculatedResolution;
                tempPoint.y = tempPoint.y / resolution * calculatedResolution;
            }
        }
        
        // 将舞台坐标转换为内容层的本地坐标
        const localPos = contentLayer.worldTransform.applyInverse(tempPoint);
        
        worldX = localPos.x;
        worldY = localPos.y;
        
        // 添加调试日志
        if (Math.random() < 0.01) { // 只记录 1% 的事件，避免日志过多
            console.log('Coordinate transformation with resolution', {
                client: `(${pointer.x}, ${pointer.y})`,
                canvas: `(${canvasX}, ${canvasY})`,
                stage: `(${tempPoint.x}, ${tempPoint.y})`,
                world: `(${worldX}, ${worldY})`,
                resolution: resolution,
                devicePixelRatio: window.devicePixelRatio,
                scale: scale,
                cssSize: `${canvas.clientWidth}x${canvas.clientHeight}`,
                realSize: `${canvas.width}x${canvas.height}`
            });
        }
    } else {
        // 回退到传统计算方法，确保考虑分辨率
        // 注意：这里我们需要考虑分辨率对坐标的影响
        // 在高分辨率显示器上，canvas 的实际像素数量会比 CSS 像素多
        const cssWidth = canvas.clientWidth;
        const realWidth = canvas.width;
        const calculatedResolution = realWidth / cssWidth;
        
        // 使用计算出的分辨率调整坐标
        worldX = ((canvasX * calculatedResolution) - offsetX) / scale;
        worldY = ((canvasY * calculatedResolution) - offsetY) / scale;
    }
    
    return {
        canvasX,
        canvasY,
        worldX,
        worldY,
        scale,
        offsetX,
        offsetY,
        resolution // 添加分辨率到返回值中，方便调试
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