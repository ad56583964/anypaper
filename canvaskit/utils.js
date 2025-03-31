/**
 * u5de5u5177u51fdu6570u96c6u5408 - u4e3aCanvasKitu8fc1u79fbu63d0u4f9bu8f85u52a9u51fdu6570
 */

/**
 * u5c06u5ba2u6237u7aefu5750u6807u8f6cu6362u4e3au672cu5730u5750u6807
 * @param {CanvasTable} table - u8868u683cu5b9eu4f8b
 * @param {number} clientX - u5ba2u6237u7aef X u5750u6807
 * @param {number} clientY - u5ba2u6237u7aef Y u5750u6807
 * @returns {Object} u5185u5bb9u5c42u5750u6807
 */
export function convertPointToLocalCoordinates(table, clientX, clientY) {
    // u83b7u53d6u5f53u524du53d8u6362u4fe1u606f
    const { scale, translateX, translateY } = table.transform;
    
    // u8ba1u7b97u5c45u4e2du504fu79fb
    const centerX = (table.stageWidth - table.width * scale) / 2;
    const centerY = (table.stageHeight - table.height * scale) / 2;
    
    // u8ba1u7b97u5b9eu9645u5e73u79fb
    const actualTranslateX = centerX + translateX;
    const actualTranslateY = centerY + translateY;
    
    // u5e94u7528u53cdu5411u53d8u6362
    const localX = (clientX - actualTranslateX) / scale;
    const localY = (clientY - actualTranslateY) / scale;
    
    return { x: localX, y: localY };
}

/**
 * u5c06u672cu5730u5750u6807u8f6cu6362u4e3au5ba2u6237u7aefu5750u6807
 * @param {CanvasTable} table - u8868u683cu5b9eu4f8b
 * @param {number} localX - u5185u5bb9u5c42 X u5750u6807
 * @param {number} localY - u5185u5bb9u5c42 Y u5750u6807
 * @returns {Object} u5ba2u6237u7aefu5750u6807
 */
export function convertLocalToClientCoordinates(table, localX, localY) {
    // u83b7u53d6u5f53u524du53d8u6362u4fe1u606f
    const { scale, translateX, translateY } = table.transform;
    
    // u8ba1u7b97u5c45u4e2du504fu79fb
    const centerX = (table.stageWidth - table.width * scale) / 2;
    const centerY = (table.stageHeight - table.height * scale) / 2;
    
    // u8ba1u7b97u5b9eu9645u5e73u79fb
    const actualTranslateX = centerX + translateX;
    const actualTranslateY = centerY + translateY;
    
    // u5e94u7528u53d8u6362
    const clientX = localX * scale + actualTranslateX;
    const clientY = localY * scale + actualTranslateY;
    
    return { x: clientX, y: clientY };
}

/**
 * u5c06u5341u516du8fdbu5236u989cu8272u503cu8f6cu6362u4e3aCanvasKit Color4fu683cu5f0f
 * @param {Object} CanvasKit - CanvasKitu5b9eu4f8b
 * @param {number} hexColor - u5341u516du8fdbu5236u989cu8272u503c(0xRRGGBB)
 * @param {number} alpha - u900fu660eu5ea6(0-1)
 * @returns {Float32Array} CanvasKit Color4fu5bf9u8c61
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
 * u521bu5efau5706u89d2u77e9u5f62u8defu5f84
 * @param {Object} CanvasKit - CanvasKitu5b9eu4f8b
 * @param {number} x - u77e9u5f62Xu5750u6807
 * @param {number} y - u77e9u5f62Yu5750u6807
 * @param {number} width - u77e9u5f62u5bbdu5ea6
 * @param {number} height - u77e9u5f62u9ad8u5ea6
 * @param {number} radius - u5706u89d2u534au5f84
 * @returns {SkPath} u521bu5efau7684u8defu5f84
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
