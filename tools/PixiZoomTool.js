import * as PIXI from 'pixi.js';
import { updateDebugInfo } from '../debug.jsx';
import { getCoordinates, createPointerInfo } from '../pixi/utils';

/**
 * PixiZoomTool 类 - 处理缩放和平移功能
 * 替代原有的 Konva ZoomTool
 */
export default class PixiZoomTool {
    /**
     * 创建一个新的 PixiZoomTool 实例
     * @param {PixiTable} table - 表格实例
     */
    constructor(table) {
        this.table = table;
        
        // 缩放配置
        this.config = {
            min: 0.1,
            max: 3,
            current: 1
        };
        
        // 触摸状态
        this.touch = {
            isZooming: false,
            initialScale: 1,
            initialPosition: { x: 0, y: 0 },
            initialDistance: 0,
            initialCenter: { x: 0, y: 0 },
            lastPosition: { x: 0, y: 0 }
        };
        
        // 缩放模式
        this.isZoomMode = false;
        this.previousTool = null;
        
        // 拖动状态
        this.isDragging = false;
        this.dragStartPosition = { x: 0, y: 0 };
        
        // 更新调试信息
        this.updateDebugInfo();
        
        console.log('PixiZoomTool initialized');
    }
    
    /**
     * 更新调试信息
     */
    updateDebugInfo() {
        updateDebugInfo('zoomTool', {
            scale: this.config.current.toFixed(2),
            isZoomMode: this.isZoomMode,
            isDragging: this.isDragging,
            isZooming: this.touch.isZooming,
            position: {
                x: Math.round(this.table.contentLayer.x),
                y: Math.round(this.table.contentLayer.y)
            }
        });
    }
    
    /**
     * 激活工具
     */
    activate() {
        console.log('PixiZoomTool activated');
        this.updateDebugInfo();
    }
    
    /**
     * 停用工具
     */
    deactivate() {
        console.log('PixiZoomTool deactivated');
        this.updateDebugInfo();
    }
    
    /**
     * 获取当前缩放值
     * @returns {number} - 当前缩放值
     */
    getCurrentScale() {
        return this.config.current;
    }
    
    /**
     * 设置缩放值
     * @param {number} scale - 缩放值
     * @returns {number} - 实际应用的缩放值（可能受到限制）
     */
    setScale(scale) {
        this.config.current = Math.max(this.config.min, Math.min(this.config.max, scale));
        this.updateDebugInfo();
        return this.config.current;
    }
    
    /**
     * 处理滚轮缩放
     * @param {WheelEvent} e - 滚轮事件
     */
    wheel(e) {
        e.preventDefault();
        
        // 获取当前缩放和图层引用
        const oldScale = this.config.current;
        const contentLayer = this.table.contentLayer;
        const bgLayer = this.table.bgLayer;
        const canvas = this.table.app.canvas;
        
        // 创建指针信息对象
        const pointer = createPointerInfo(e);
        
        // 使用坐标工具获取鼠标在画布上和世界中的位置
        const coords = getCoordinates(pointer, canvas, contentLayer, this.table);
        
        // 根据滚轮方向调整缩放
        const direction = e.deltaY > 0 ? -1 : 1;
        const factor = 0.1;
        const newScale = direction > 0 ? oldScale * (1 + factor) : oldScale / (1 + factor);
        
        // 限制缩放范围
        const constrainedScale = Math.max(this.config.min, Math.min(this.config.max, newScale));
        this.config.current = constrainedScale;
        
        // 计算新位置，以保持鼠标指针处的内容在缩放前后保持一致
        // 公式：newPos = pointer - (pointer - oldPos) * (newScale / oldScale)
        // 这里pointer是鼠标在客户端坐标系的位置，oldPos是图层当前位置
        const newX = pointer.x - (coords.worldX * constrainedScale);
        const newY = pointer.y - (coords.worldY * constrainedScale);
        
        // 应用新的缩放和位置到两个图层
        contentLayer.scale.set(constrainedScale);
        bgLayer.scale.set(constrainedScale);
        
        contentLayer.position.set(newX, newY);
        bgLayer.position.set(newX, newY);
        
        // 更新调试信息
        this.updateDebugInfo();
        
        // 额外调试信息
        if (Math.random() < 0.05) { // 只显示5%的调试信息，避免日志过多
            console.log('Zoom Debug:', {
                oldScale,
                newScale: constrainedScale,
                worldPos: { x: coords.worldX, y: coords.worldY },
                oldPos: { x: contentLayer.position.x, y: contentLayer.position.y },
                newPos: { x: newX, y: newY },
                clientPos: { x: pointer.x, y: pointer.y }
            });
        }
    }
    
    /**
     * 计算两个触摸点之间的距离
     * @param {Object} point1 - 第一个触摸点
     * @param {Object} point2 - 第二个触摸点
     * @returns {number} - 距离
     */
    getDistance(point1, point2) {
        const dx = point1.clientX - point2.clientX;
        const dy = point1.clientY - point2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * 计算两个触摸点的中心点
     * @param {Object} point1 - 第一个触摸点
     * @param {Object} point2 - 第二个触摸点
     * @returns {Object} - 中心点
     */
    getCenter(point1, point2) {
        return {
            x: (point1.clientX + point2.clientX) / 2,
            y: (point1.clientY + point2.clientY) / 2
        };
    }
    
    /**
     * 处理多点触摸开始
     * @param {Array} pointers - 触摸点数组
     * @returns {boolean} - 是否处理了事件
     */
    handleMultiTouchStart(pointers) {
        if (pointers.length !== 2) return false;
        
        const [point1, point2] = pointers;
        
        // 计算初始距离和中心点
        const initialDistance = this.getDistance(point1, point2);
        const initialCenter = this.getCenter(point1, point2);
        
        // 记录初始状态
        this.touch.isZooming = true;
        this.isDragging = false;
        this.touch.initialScale = this.config.current;
        this.touch.initialDistance = initialDistance;
        this.touch.initialCenter = initialCenter;
        
        const contentLayer = this.table.contentLayer;
        this.touch.initialPosition = {
            x: contentLayer.x,
            y: contentLayer.y
        };
        
        // 更新调试信息
        updateDebugInfo('zoomTool', {
            status: 'multitouch_start',
            scale: this.config.current.toFixed(2),
            isZooming: true,
            initialDistance,
            initialCenter,
            initialPosition: this.touch.initialPosition
        });
        
        return true;
    }
    
    /**
     * 处理多点触摸移动
     * @param {Array} pointers - 触摸点数组
     * @returns {boolean} - 是否处理了事件
     */
    handleMultiTouchMove(pointers) {
        if (!this.touch.isZooming || pointers.length !== 2) return false;
        
        const [point1, point2] = pointers;
        const contentLayer = this.table.contentLayer;
        const bgLayer = this.table.bgLayer;
        
        // 计算当前状态
        const currentDistance = this.getDistance(point1, point2);
        const currentCenter = this.getCenter(point1, point2);
        
        // 计算缩放比例
        const scaleRatio = currentDistance / this.touch.initialDistance;
        let newScale = this.touch.initialScale * scaleRatio;
        
        // 限制缩放范围
        newScale = Math.max(this.config.min, Math.min(this.config.max, newScale));
        
        // 计算初始中心点在图层坐标系中的位置
        const initialCenterInLayer = {
            x: (this.touch.initialCenter.x - this.touch.initialPosition.x) / this.touch.initialScale,
            y: (this.touch.initialCenter.y - this.touch.initialPosition.y) / this.touch.initialScale
        };
        
        // 计算当前中心点在图层坐标系中的位置
        const currentCenterInLayer = {
            x: (currentCenter.x - this.touch.initialPosition.x) / this.touch.initialScale,
            y: (currentCenter.y - this.touch.initialPosition.y) / this.touch.initialScale
        };
        
        // 计算中心点的移动（在图层坐标系中）
        const centerDeltaInLayer = {
            x: currentCenterInLayer.x - initialCenterInLayer.x,
            y: currentCenterInLayer.y - initialCenterInLayer.y
        };
        
        // 计算新的图层位置
        const newX = this.touch.initialPosition.x + 
                    centerDeltaInLayer.x * this.touch.initialScale - 
                    initialCenterInLayer.x * (newScale - this.touch.initialScale);
        
        const newY = this.touch.initialPosition.y + 
                    centerDeltaInLayer.y * this.touch.initialScale - 
                    initialCenterInLayer.y * (newScale - this.touch.initialScale);
        
        // 应用变换
        this.config.current = newScale;
        
        // 同时更新两个图层的缩放
        contentLayer.scale.set(newScale, newScale);
        bgLayer.scale.set(newScale, newScale);
        
        // 同时更新两个图层的位置
        contentLayer.position.set(newX, newY);
        bgLayer.position.set(newX, newY);
        
        // 更新调试信息
        updateDebugInfo('zoomTool', {
            status: 'multitouch_move',
            scale: newScale.toFixed(2),
            isZooming: true,
            currentDistance,
            currentCenter,
            newPosition: { x: newX, y: newY }
        });
        
        return true;
    }
    
    /**
     * 处理多点触摸结束
     * @param {PointerEvent} event - 指针事件
     * @returns {boolean} - 是否处理了事件
     */
    handleMultiTouchEnd(event) {
        if (!this.touch.isZooming) return false;
        
        const activePointers = this.table.activePointers;
        
        // 如果还有一个触摸点，转为拖动模式
        if (activePointers.size === 1) {
            this.touch.isZooming = false;
            this.isDragging = true;
            
            const contentLayer = this.table.contentLayer;
            this.dragStartPosition = {
                x: contentLayer.x,
                y: contentLayer.y
            };
            
            // 获取剩余的触摸点
            const remainingPointer = Array.from(activePointers.values())[0];
            this.touch.lastPosition = {
                x: remainingPointer.clientX,
                y: remainingPointer.clientY
            };
            
            // 更新调试信息
            updateDebugInfo('zoomTool', {
                status: 'drag_start',
                scale: this.config.current.toFixed(2),
                isZooming: false,
                isDragging: true,
                dragStartPosition: this.dragStartPosition,
                lastPosition: this.touch.lastPosition
            });
            
            return true;
        }
        
        // 如果没有触摸点了，完全重置状态
        this.touch.isZooming = false;
        this.isDragging = false;
        
        // 更新调试信息
        this.updateDebugInfo();
        
        return true;
    }
    
    /**
     * 进入缩放模式
     */
    enterZoomMode() {
        if (this.isZoomMode) return; // 已经在缩放模式
        
        this.isZoomMode = true;
        this.previousTool = this.table.currentTool ? this.table.currentTool.name : null;
        
        if (this.table.currentTool) {
            this.table.currentTool.deactivate();
        }
        
        // 更改鼠标样式
        document.getElementById('a4-table').style.cursor = 'move';
        
        // 更新调试信息
        updateDebugInfo('zoomTool', {
            status: 'zoom_mode_entered',
            isZoomMode: true,
            previousTool: this.previousTool
        });
        
        console.log('Entered zoom mode');
    }
    
    /**
     * 退出缩放模式
     */
    exitZoomMode() {
        if (!this.isZoomMode) return; // 不在缩放模式
        
        this.isZoomMode = false;
        
        // 恢复鼠标样式
        document.getElementById('a4-table').style.cursor = 'default';
        
        // 恢复之前的工具
        if (this.previousTool) {
            this.table.setActiveTool(this.previousTool);
        }
        
        // 更新调试信息
        updateDebugInfo('zoomTool', {
            status: 'zoom_mode_exited',
            isZoomMode: false,
            previousTool: this.previousTool
        });
        
        console.log('Exited zoom mode');
    }
    
    /**
     * 处理指针按下事件
     * @param {PointerEvent} e - 指针事件
     * @returns {boolean} - 是否处理了事件
     */
    pointerdown(e) {
        if (this.isZoomMode) {
            this.isDragging = true;
            
            const contentLayer = this.table.contentLayer;
            this.dragStartPosition = {
                x: contentLayer.x,
                y: contentLayer.y
            };
            
            // 创建指针信息对象
            const pointer = createPointerInfo(e);
            this.touch.lastPosition = {
                x: pointer.x,
                y: pointer.y
            };
            
            // 更新调试信息
            updateDebugInfo('zoomTool', {
                status: 'drag_start',
                isZoomMode: true,
                isDragging: true,
                dragStartPosition: this.dragStartPosition,
                pointerPosition: { x: pointer.x, y: pointer.y }
            });
            
            return true;
        }
        return false;
    }
    
    /**
     * 处理指针移动事件
     * @param {PointerEvent} e - 指针事件
     * @returns {boolean} - 是否处理了事件
     */
    pointermove(e) {
        if (this.isZoomMode && this.isDragging) {
            // 创建指针信息对象
            const pointer = createPointerInfo(e);
            const currentPointerPos = {
                x: pointer.x,
                y: pointer.y
            };
            
            // 计算移动距离
            const deltaX = currentPointerPos.x - this.touch.lastPosition.x;
            const deltaY = currentPointerPos.y - this.touch.lastPosition.y;
            
            // 获取图层
            const contentLayer = this.table.contentLayer;
            const bgLayer = this.table.bgLayer;
            
            // 更新图层位置
            const newX = contentLayer.x + deltaX;
            const newY = contentLayer.y + deltaY;
            
            // 同时更新两个图层的位置
            contentLayer.position.set(newX, newY);
            bgLayer.position.set(newX, newY);
            
            // 更新最后的指针位置
            this.touch.lastPosition = currentPointerPos;
            
            // 更新调试信息
            updateDebugInfo('zoomTool', {
                status: 'dragging',
                isZoomMode: true,
                isDragging: true,
                delta: { x: deltaX, y: deltaY },
                newPosition: { x: newX, y: newY }
            });
            
            return true;
        }
        return false;
    }
    
    /**
     * 处理指针抬起事件
     * @param {PointerEvent} e - 指针事件
     * @returns {boolean} - 是否处理了事件
     */
    pointerup(e) {
        if (this.isZoomMode && this.isDragging) {
            this.isDragging = false;
            
            // 更新调试信息
            updateDebugInfo('zoomTool', {
                status: 'drag_end',
                isZoomMode: true,
                isDragging: false,
                scale: this.config.current.toFixed(2),
                position: {
                    x: Math.round(this.table.contentLayer.x),
                    y: Math.round(this.table.contentLayer.y)
                }
            });
            
            return true;
        }
        return false;
    }
}