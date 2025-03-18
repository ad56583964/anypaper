import * as PIXI from 'pixi.js';

/**
 * 坐标和变换工具函数
 */

/**
 * 将客户端坐标转换为容器的本地坐标
 * @param {PIXI.Application} app - PIXI 应用实例
 * @param {number} clientX - 客户端 X 坐标
 * @param {number} clientY - 客户端 Y 坐标
 * @param {PIXI.Container} container - 目标容器
 * @returns {PIXI.Point} - 容器本地坐标系中的点
 */
export function convertPointToLocalCoordinates(app, clientX, clientY, container) {
    // 创建一个临时点来存储结果
    const point = new PIXI.Point();
    
    // 使用 PixiJS 的交互系统将客户端坐标映射到舞台坐标
    app.renderer.events.mapPositionToPoint(point, clientX, clientY);
    
    // 转换为容器的本地坐标
    const localPoint = container.toLocal(point);
    
    return localPoint;
}