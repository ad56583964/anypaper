import * as PIXI from 'pixi.js';
import { updateDebugInfo } from '../debug.jsx';
import { convertPointToLocalCoordinates } from '../pixi/utils';

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
            lastPosition: { x: 0, y: 0 },
            initialBgPosition: { x: 0, y: 0 }
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
     * 处理滚轮事件 - 缩放
     * @param {WheelEvent} e - 滚轮事件
     */
    wheel(e) {
        // 阻止默认滚动行为
        e.preventDefault();
        
        // 如果未按下 Ctrl 键，忽略事件
        if (!e.ctrlKey && !this.isZoomMode) {
            return;
        }
        
        // 获取滚轮方向和步长
        const delta = Math.sign(-e.deltaY);
        const step = 0.1;
        
        // 获取当前缩放
        let scale = this.table.contentLayer.scale.x;
        
        // 计算新的缩放
        const newScale = Math.max(this.config.min, Math.min(this.config.max, scale + delta * step));
        
        // 如果缩放未发生变化，退出
        if (newScale === scale) {
            return;
        }
        
        // 记录缩放变化
        const scaleFactor = newScale / scale;
        
        // 获取屏幕坐标
        const screenPoint = new PIXI.Point(e.clientX, e.clientY);
        
        // 转换为舞台坐标
        const stagePoint = new PIXI.Point();
        this.table.app.stage.worldTransform.applyInverse(screenPoint, stagePoint);
        
        // 转换为内容层本地坐标
        const localPoint = this.table.contentLayer.toLocal(stagePoint);
        
        // 转换为背景层本地坐标
        const bgLocalPoint = this.table.bgLayer.toLocal(stagePoint);
        
        // 记录鼠标在页面上的绝对坐标 - 这是缩放的中心点
        const absolutePoint = { x: e.clientX, y: e.clientY };
        
        // 记录缩放中心在世界坐标系(stage)中的位置 - 这个位置相对于舞台是固定的
        const worldZoomCenter = { x: stagePoint.x, y: stagePoint.y };
        
        // 更新调试指针位置到缩放中心点（显示在背景层）
        if (this.table.zoomDebugPointer) {
            // 记录缩放前的背景图层上的位置
            const preBgPoint = { x: bgLocalPoint.x, y: bgLocalPoint.y };
            
            // 记录缩放点和世界坐标的关系 - 这个是保持不变的
            this.zoomCenterWorldPoint = worldZoomCenter;
            
            // 将蓝色指针放在缩放中心点位置
            this.table.zoomDebugPointer.update(bgLocalPoint.x, bgLocalPoint.y, this.table.app);
            
            console.log('Zoom center point (before scaling):', {
                screen: absolutePoint,
                stage: worldZoomCenter,
                bgLocal: preBgPoint
            });
        }
        
        // 更新内容层缩放
        this.table.contentLayer.scale.set(newScale, newScale);
        
        // 同步更新背景层缩放
        this.table.bgLayer.scale.set(newScale, newScale);
        
        // 调整位置，使缩放以光标位置为中心
        const currentContentX = this.table.contentLayer.position.x;
        const currentContentY = this.table.contentLayer.position.y;
        const currentBgX = this.table.bgLayer.position.x;
        const currentBgY = this.table.bgLayer.position.y;
        
        // 计算新的位置偏移量
        const offsetX = (localPoint.x * scale) * (1 - scaleFactor);
        const offsetY = (localPoint.y * scale) * (1 - scaleFactor);
        
        // 更新内容层位置 - 使缩放以光标位置为中心
        this.table.contentLayer.position.set(
            currentContentX + offsetX,
            currentContentY + offsetY
        );
        
        // 同步更新背景层位置
        this.table.bgLayer.position.set(
            currentBgX + offsetX,
            currentBgY + offsetY
        );
        
        // 缩放后，更新蓝色指针位置
        if (this.table.zoomDebugPointer && this.zoomCenterWorldPoint) {
            // 将世界坐标转换为新的背景层坐标系
            const postBgPoint = this.table.bgLayer.toLocal(
                new PIXI.Point(this.zoomCenterWorldPoint.x, this.zoomCenterWorldPoint.y)
            );
            
            // 更新蓝色指针到新的位置
            this.table.zoomDebugPointer.update(postBgPoint.x, postBgPoint.y, this.table.app);
            
            console.log('Zoom center point (after scaling):', {
                worldPoint: this.zoomCenterWorldPoint,
                newBgLocal: { x: postBgPoint.x, y: postBgPoint.y }
            });
        }
        
        // 更新调试信息
        updateDebugInfo('zoomTool', {
            action: 'wheel',
            scale: newScale.toFixed(2),
            deltaY: e.deltaY,
            direction: delta > 0 ? 'zoom in' : 'zoom out',
            position: absolutePoint,
            localPosition: { x: localPoint.x, y: localPoint.y }
        });
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
        
        // 记录背景层初始位置
        const bgLayer = this.table.bgLayer;
        this.touch.initialBgPosition = {
            x: bgLayer.x,
            y: bgLayer.y
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
            const bgLayer = this.table.bgLayer;
            
            this.dragStartPosition = {
                x: contentLayer.x,
                y: contentLayer.y
            };
            
            this.dragStartBgPosition = {
                x: bgLayer.x,
                y: bgLayer.y
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
        // 如果有多个触点，处理多点触控
        if (this.table.activePointers.size > 0) {
            this.table.activePointers.set(e.pointerId, {
                id: e.pointerId,
                x: e.clientX,
                y: e.clientY,
                type: e.pointerType
            });
            
            // 处理多点触控开始
            if (this.table.activePointers.size === 2) {
                this.handleMultiTouchStart(Array.from(this.table.activePointers.values()));
            }
            return true;
        }
        
        // 记录指针位置
        const pointerPosition = {
            x: e.clientX,
            y: e.clientY
        };
        
        // 保存指针信息
        this.table.activePointers.set(e.pointerId, {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            type: e.pointerType
        });
        
        // 如果是在缩放模式下或者按住了 Space 键，启用平移
        if (this.isZoomMode || this.spaceKeyDown) {
            this.isPanning = true;
            this.lastPanPoint = pointerPosition;
            
            // 记录当前内容层和背景层位置
            this.startContentPosition = {
                x: this.table.contentLayer.position.x,
                y: this.table.contentLayer.position.y
            };
            this.startBgPosition = {
                x: this.table.bgLayer.position.x,
                y: this.table.bgLayer.position.y
            };
            
            // 更新工具状态
            this.updateDebugInfo({
                action: 'pan_start',
                position: pointerPosition
            });
        }
        
        return true;
    }
    
    /**
     * 处理指针移动事件
     * @param {PointerEvent} e - 指针事件
     * @returns {boolean} - 是否处理了事件
     */
    pointermove(e) {
        // 更新当前指针位置
        if (this.table.activePointers.has(e.pointerId)) {
            const pointer = this.table.activePointers.get(e.pointerId);
            pointer.x = e.clientX;
            pointer.y = e.clientY;
        }
        
        // 处理多点触控移动
        if (this.table.activePointers.size === 2) {
            this.handleMultiTouchMove(Array.from(this.table.activePointers.values()));
            return true;
        }
        
        // 如果不是平移模式，退出
        if (!this.isPanning) return false;
        
        // 获取当前位置
        const currentPosition = {
            x: e.clientX,
            y: e.clientY
        };
        
        // 计算位移
        const dx = currentPosition.x - this.lastPanPoint.x;
        const dy = currentPosition.y - this.lastPanPoint.y;
        
        // 更新内容层和背景层位置
        this.table.contentLayer.position.x += dx;
        this.table.contentLayer.position.y += dy;
        this.table.bgLayer.position.x += dx;
        this.table.bgLayer.position.y += dy;
        
        // 更新最后的平移点
        this.lastPanPoint = currentPosition;
        
        // 更新工具状态
        this.updateDebugInfo({
            action: 'panning',
            position: currentPosition,
            delta: { x: dx, y: dy }
        });
        
        return true;
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