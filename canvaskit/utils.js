/**
 * 工具函数集合 - 为CanvasKit迁移提供辅助函数
 */

/**
 * 将客户端坐标转换为本地坐标
 * @param {CanvasTable} table - 表格实例
 * @param {number} clientX - 客户端 X 坐标
 * @param {number} clientY - 客户端 Y 坐标
 * @returns {Object} 内容层坐标
 */
export function convertPointToLocalCoordinates(table, clientX, clientY) {
    // 获取当前变换信息
    const { scale, translateX, translateY } = table.transform;
    
    // 计算居中偏移
    const centerX = (table.stageWidth - table.width * scale) / 2;
    const centerY = (table.stageHeight - table.height * scale) / 2;
    
    // 计算实际平移
    const actualTranslateX = centerX + translateX;
    const actualTranslateY = centerY + translateY;
    
    // 应用反向变换
    const localX = (clientX - actualTranslateX) / scale;
    const localY = (clientY - actualTranslateY) / scale;
    
    return { x: localX, y: localY };
}

/**
 * 将本地坐标转换为客户端坐标
 * @param {CanvasTable} table - 表格实例
 * @param {number} localX - 内容层 X 坐标
 * @param {number} localY - 内容层 Y 坐标
 * @returns {Object} 客户端坐标
 */
export function convertLocalToClientCoordinates(table, localX, localY) {
    // 获取当前变换信息
    const { scale, translateX, translateY } = table.transform;
    
    // 计算居中偏移
    const centerX = (table.stageWidth - table.width * scale) / 2;
    const centerY = (table.stageHeight - table.height * scale) / 2;
    
    // 计算实际平移
    const actualTranslateX = centerX + translateX;
    const actualTranslateY = centerY + translateY;
    
    // 应用变换
    const clientX = localX * scale + actualTranslateX;
    const clientY = localY * scale + actualTranslateY;
    
    return { x: clientX, y: clientY };
}

/**
 * 将十六进制颜色值转换为CanvasKit Color4f格式
 * @param {Object} CanvasKit - CanvasKit实例
 * @param {number} hexColor - 十六进制颜色值(0xRRGGBB)
 * @param {number} alpha - 透明度(0-1)
 * @returns {Float32Array} CanvasKit Color4f对象
 */
export function hexToColor4f(CanvasKit, hexColor, alpha = 1.0) {
    return CanvasKit.Color4f(
        ((hexColor >> 16) & 0xff) / 255,
        ((hexColor >> 8) & 0xff) / 255,
        (hexColor & 0xff) / 255,
        alpha
    );
}

/**
 * 创建圆角矩形路径
 * @param {Object} CanvasKit - CanvasKit实例
 * @param {number} x - 矩形X坐标
 * @param {number} y - 矩形Y坐标
 * @param {number} width - 矩形宽度
 * @param {number} height - 矩形高度
 * @param {number} radius - 圆角半径
 * @returns {SkPath} 创建的路径
 */
export function createRoundedRectPath(CanvasKit, x, y, width, height, radius) {
    const path = new CanvasKit.Path();
    
    const rrect = CanvasKit.RRectXY(
        CanvasKit.LTRBRect(x, y, x + width, y + height),
        radius, radius
    );
    
    path.addRRect(rrect);
    return path;
}
