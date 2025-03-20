import * as PIXI from 'pixi.js';

/**
 * 坐标和变换工具函数
 */

/**
 * 将客户端坐标转换为容器的本地坐标
 * @param {PIXI.Application} app - PIXI 应用实例
 * @param {number} clientX - 客户端 X 坐标（浏览器窗口中的坐标）
 * @param {number} clientY - 客户端 Y 坐标（浏览器窗口中的坐标）
 * @param {PIXI.Container} container - 目标容器
 * @returns {PIXI.Point} - 容器本地坐标系中的点
 */
export function convertPointToLocalCoordinates(app, clientX, clientY, container) {
    // 创建一个点来存储渲染器坐标系中的位置
    const rendererPoint = new PIXI.Point();
    
    // 步骤1: 将客户端坐标映射到渲染器坐标系
    app.renderer.events.mapPositionToPoint(rendererPoint, clientX, clientY);
    
    // 步骤2: 将渲染器坐标系中的点转换为容器的本地坐标系
    // 注: toLocal方法会创建并返回一个新的Point对象，不会修改输入点
    return container.toLocal(rendererPoint);
}