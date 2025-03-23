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
            initialDistance: 0,
            initialContentPosition: { x: 0, y: 0 },
            initialBgPosition: { x: 0, y: 0 },
            initialCenter: { x: 0, y: 0 }
        };
        
        // 缩放模式
        this.isZoomMode = false;
        this.previousTool = null;
        
        // 拖动状态
        this.isDragging = false;
        this.isPanning = false;
        this.lastPanPoint = null;
        this.spaceKeyDown = false;
        
        // 初始化时隐藏调试指针
        if (this.table.zoomDebugPointer) {
            this.table.zoomDebugPointer._hitpointer.visible = false;
        }
        
        // 更新调试信息
        this.updateDebugInfo();
        
        console.log('PixiZoomTool initialized');
    }
    
    /**
     * 更新调试信息
     */
    updateDebugInfo(additionalInfo = {}) {
        updateDebugInfo('zoomTool', {
            scale: this.table.contentLayer.scale.x.toFixed(2),
            isZoomMode: this.isZoomMode,
            isDragging: this.isDragging,
            isPanning: this.isPanning,
            isZooming: this.touch.isZooming,
            position: {
                x: Math.round(this.table.contentLayer.x),
                y: Math.round(this.table.contentLayer.y)
            },
            ...additionalInfo
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
        return this.table.contentLayer.scale.x;
    }
    
    /**
     * 设置缩放值
     * @param {number} scale - 缩放值
     * @returns {number} - 实际应用的缩放值（可能受到限制）
     */
    setScale(scale) {
        const newScale = Math.max(this.config.min, Math.min(this.config.max, scale));
        this.table.contentLayer.scale.set(newScale, newScale);
        this.table.bgLayer.scale.set(newScale, newScale);
        
        // 如果表格有 centerViewOnPaper 方法，则调用它来居中 paper
        if (typeof this.table.centerViewOnPaper === 'function') {
            this.table.centerViewOnPaper();
        }
        
        this.updateDebugInfo();
        return newScale;
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
        
        // 显示调试指针
        this.showDebugPointer();
        
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

        // 设置一个定时器，在缩放操作结束后隐藏指针
        if (this._hidePointerTimeout) {
            clearTimeout(this._hidePointerTimeout);
        }
        this._hidePointerTimeout = setTimeout(() => {
            this.hideDebugPointer();
        }, 1000); // 1秒后隐藏指针
    }
    
    /**
     * 计算两个触摸点之间的距离
     * @param {Object} point1 - 第一个触摸点
     * @param {Object} point2 - 第二个触摸点
     * @returns {number} - 距离
     */
    getDistance(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
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
            x: (point1.x + point2.x) / 2,
            y: (point1.y + point2.y) / 2
        };
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
        // 如果是触摸事件，阻止默认行为以防止浏览器缩放等操作
        if (e.pointerType === 'touch') {
            e.preventDefault();
        }
        
        // 存储当前指针
        this.table.activePointers.set(e.pointerId, {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            type: e.pointerType
        });
        
        // 处理多点触控 - 如果有两个及以上触摸点，切换到多点触控模式
        if (this.table.activePointers.size === 2) {
            const pointers = Array.from(this.table.activePointers.values());
            this.startPinchZoom(pointers);
            return true;
        }
        
        // 单指情况 - 处理平移
        if (this.isZoomMode || this.spaceKeyDown) {
            this.isPanning = true;
            this.lastPanPoint = { x: e.clientX, y: e.clientY };
            
            // 记录当前内容层和背景层位置
            this.startContentPosition = {
                x: this.table.contentLayer.position.x,
                y: this.table.contentLayer.position.y
            };
            
            this.startBgPosition = {
                x: this.table.bgLayer.position.x,
                y: this.table.bgLayer.position.y
            };
            
            // 更新调试信息
            this.updateDebugInfo({
                action: 'pan_start',
                position: { x: e.clientX, y: e.clientY }
            });
            
            return true;
        }
        
        return false;
    }
    
    /**
     * 开始双指缩放
     * @param {Array} pointers - 指针数组
     */
    startPinchZoom(pointers) {
        if (pointers.length !== 2) return;
        
        // 显示调试指针
        this.showDebugPointer();
        
        const [pointer1, pointer2] = pointers;
        
        // 计算初始两点的距离和中心
        this.touch.initialDistance = this.getDistance(pointer1, pointer2);
        this.touch.initialCenter = this.getCenter(pointer1, pointer2);
        
        // 记录当前缩放值
        this.touch.initialScale = this.table.contentLayer.scale.x;
        
        // 记录图层初始位置
        this.touch.initialContentPosition = {
            x: this.table.contentLayer.position.x,
            y: this.table.contentLayer.position.y
        };
        
        this.touch.initialBgPosition = {
            x: this.table.bgLayer.position.x,
            y: this.table.bgLayer.position.y
        };
        
        // 设置缩放标志
        this.touch.isZooming = true;
        this.isPanning = false; // 如果之前在拖动，现在转为缩放
        
        // 将当前触摸中心转换为舞台坐标和本地坐标
        const screenCenter = new PIXI.Point(
            this.touch.initialCenter.x,
            this.touch.initialCenter.y
        );
        
        // 转换为舞台坐标
        const stageCenter = new PIXI.Point();
        this.table.app.stage.worldTransform.applyInverse(screenCenter, stageCenter);
        
        // 转换为内容层和背景层本地坐标
        this.touch.initialLocalCenter = this.table.contentLayer.toLocal(stageCenter);
        this.touch.initialBgLocalCenter = this.table.bgLayer.toLocal(stageCenter);
        
        // 更新调试信息
        this.updateDebugInfo({
            status: 'pinch_zoom_start',
            initialDistance: this.touch.initialDistance.toFixed(2),
            initialCenter: this.touch.initialCenter,
            initialScale: this.touch.initialScale.toFixed(2)
        });
        
        console.log('Pinch zoom started', {
            pointers: pointers.map(p => ({ id: p.id, x: p.x, y: p.y })),
            initialDistance: this.touch.initialDistance,
            initialCenter: this.touch.initialCenter,
            initialScale: this.touch.initialScale
        });
    }
    
    /**
     * 处理指针移动事件
     * @param {PointerEvent} e - 指针事件
     * @returns {boolean} - 是否处理了事件
     */
    pointermove(e) {
        // 更新指针位置
        if (this.table.activePointers.has(e.pointerId)) {
            const pointer = this.table.activePointers.get(e.pointerId);
            pointer.x = e.clientX;
            pointer.y = e.clientY;
        }
        
        // 判断是否处于双指缩放状态
        if (this.touch.isZooming && this.table.activePointers.size === 2) {
            this.handlePinchZoom();
            return true;
        }
        
        // 判断是否处于平移状态
        if (this.isPanning) {
            this.handlePan(e);
            return true;
        }
        
        return false;
    }
    
    /**
     * 处理双指缩放
     */
    handlePinchZoom() {
        const pointers = Array.from(this.table.activePointers.values());
        if (pointers.length !== 2) return;
        
        const [pointer1, pointer2] = pointers;
        
        // 计算当前两点的距离和中心
        const currentDistance = this.getDistance(pointer1, pointer2);
        const currentCenter = this.getCenter(pointer1, pointer2);
        
        // 计算缩放比例
        const scaleRatio = currentDistance / this.touch.initialDistance;
        let newScale = this.touch.initialScale * scaleRatio;
        
        // 限制缩放范围
        newScale = Math.max(this.config.min, Math.min(this.config.max, newScale));
        
        // 将当前触摸中心转换为舞台坐标
        const screenCenter = new PIXI.Point(currentCenter.x, currentCenter.y);
        const stageCenter = new PIXI.Point();
        this.table.app.stage.worldTransform.applyInverse(screenCenter, stageCenter);
        
        // 计算缩放值变化
        const scaleFactor = newScale / this.touch.initialScale;
        
        // 应用缩放
        this.table.contentLayer.scale.set(newScale, newScale);
        this.table.bgLayer.scale.set(newScale, newScale);
        
        // 计算中心点偏移
        const dx = currentCenter.x - this.touch.initialCenter.x;
        const dy = currentCenter.y - this.touch.initialCenter.y;
        
        // 计算缩放引起的偏移
        const zoomOffsetX = (this.touch.initialLocalCenter.x * this.touch.initialScale) * (1 - scaleFactor);
        const zoomOffsetY = (this.touch.initialLocalCenter.y * this.touch.initialScale) * (1 - scaleFactor);
        
        // 计算新位置并应用
        const newContentX = this.touch.initialContentPosition.x + dx + zoomOffsetX;
        const newContentY = this.touch.initialContentPosition.y + dy + zoomOffsetY;
        
        // 应用新位置
        this.table.contentLayer.position.set(newContentX, newContentY);
        this.table.bgLayer.position.set(newContentX, newContentY);
        
        // 如果有调试指针，更新其位置
        if (this.table.zoomDebugPointer) {
            const localPoint = this.table.bgLayer.toLocal(stageCenter);
            this.table.zoomDebugPointer.update(localPoint.x, localPoint.y, this.table.app);
        }
        
        // 更新调试信息
        this.updateDebugInfo({
            status: 'pinch_zoom_move',
            currentDistance: currentDistance.toFixed(2),
            currentCenter,
            scaleRatio: scaleRatio.toFixed(2),
            newScale: newScale.toFixed(2),
            position: { x: newContentX.toFixed(0), y: newContentY.toFixed(0) }
        });
    }
    
    /**
     * 处理平移
     * @param {PointerEvent} e - 指针事件
     */
    handlePan(e) {
        if (!this.lastPanPoint) return;
        
        // 计算位移
        const dx = e.clientX - this.lastPanPoint.x;
        const dy = e.clientY - this.lastPanPoint.y;
        
        // 更新图层位置
        this.table.contentLayer.position.x += dx;
        this.table.contentLayer.position.y += dy;
        this.table.bgLayer.position.x += dx;
        this.table.bgLayer.position.y += dy;
        
        // 更新上一次位置
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
        
        // 更新调试信息
        this.updateDebugInfo({
            action: 'panning',
            delta: { x: dx, y: dy },
            position: { x: e.clientX, y: e.clientY }
        });
    }
    
    /**
     * 处理指针抬起事件
     * @param {PointerEvent} e - 指针事件
     * @returns {boolean} - 是否处理了事件
     */
    pointerup(e) {
        // 从活动指针集合中移除该指针
        this.table.activePointers.delete(e.pointerId);
        
        // 判断是否正在进行双指缩放
        if (this.touch.isZooming) {
            // 如果还有一个手指，则转变为平移模式
            if (this.table.activePointers.size === 1) {
                this.touch.isZooming = false;
                this.isPanning = true;
                
                // 隐藏调试指针
                this.hideDebugPointer();
                
                // 获取剩余的触摸点作为平移起始点
                const remainingPointer = Array.from(this.table.activePointers.values())[0];
                this.lastPanPoint = { x: remainingPointer.x, y: remainingPointer.y };
                
                // 记录当前位置为起始位置
                this.startContentPosition = {
                    x: this.table.contentLayer.position.x,
                    y: this.table.contentLayer.position.y
                };
                
                this.startBgPosition = {
                    x: this.table.bgLayer.position.x,
                    y: this.table.bgLayer.position.y
                };
                
                // 更新调试信息
                this.updateDebugInfo({
                    status: 'pinch_to_pan',
                    isPanning: true,
                    isZooming: false
                });
                
                return true;
            } 
            // 如果没有手指了，结束所有手势
            else if (this.table.activePointers.size === 0) {
                this.touch.isZooming = false;
                this.isPanning = false;
                this.lastPanPoint = null;
                
                // 更新调试信息
                this.updateDebugInfo({
                    status: 'gesture_end',
                    isPanning: false,
                    isZooming: false
                });
                
                return true;
            }
        }
        
        // 如果在平移模式下且没有触摸点了，结束平移
        if (this.isPanning && this.table.activePointers.size === 0) {
            this.isPanning = false;
            this.lastPanPoint = null;
            
            // 更新调试信息
            this.updateDebugInfo({
                status: 'pan_end',
                isPanning: false
            });
            
            return true;
        }
        
        return false;
    }

    /**
     * 显示缩放调试指针
     */
    showDebugPointer() {
        if (this.table.zoomDebugPointer && !this.table.zoomDebugPointer._hitpointer.visible) {
            this.table.zoomDebugPointer._hitpointer.visible = true;
        }
    }

    /**
     * 隐藏缩放调试指针
     */
    hideDebugPointer() {
        if (this.table.zoomDebugPointer && this.table.zoomDebugPointer._hitpointer.visible) {
            this.table.zoomDebugPointer._hitpointer.visible = false;
        }
    }
}