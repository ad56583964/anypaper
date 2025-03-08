import Konva from '../src/konva';

export default class ZoomTool {
    constructor(table) {
        this.table = table;
        
        // 缩放配置
        this.config = {
            min: 0.1,
            max: 3,
            current: 1
        };
        
        // 触摸状态跟踪
        this.touch = {
            lastDistance: 0,
            lastCenter: { x: 0, y: 0 },
            lastScale: 1,
            lastPosition: { x: 0, y: 0 },
            isZooming: false,
            initialScale: 1,
            initialPosition: { x: 0, y: 0 },
            initialDistance: 0,
            initialCenter: { x: 0, y: 0 }
        };
        
        // 缩放模式标志
        this.isZoomMode = false;
        this.previousTool = null;
        
        // 拖动状态
        this.isDragging = false;
        this.dragStartPosition = { x: 0, y: 0 };
    }
    
    // 激活工具
    activate() {
        console.log("ZoomTool activate");
    }
    
    // 停用工具
    deactivate() {
        console.log("ZoomTool deactivate");
    }
    
    // 获取当前缩放值
    getCurrentScale() {
        return this.config.current;
    }
    
    // 设置缩放值
    setScale(scale) {
        this.config.current = Math.max(this.config.min, Math.min(this.config.max, scale));
        return this.config.current;
    }
    
    // 处理滚轮缩放
    wheel(e) {
        e.preventDefault();
        
        const oldScale = this.config.current;
        const mousePointTo = {
            x: (e.clientX - this.table.gLayer.x()) / oldScale,
            y: (e.clientY - this.table.gLayer.y()) / oldScale,
        };
        
        // 根据滚轮方向调整缩放
        const direction = e.deltaY > 0 ? -1 : 1;
        const factor = 0.1;
        const newScale = direction > 0 ? oldScale * (1 + factor) : oldScale / (1 + factor);
        
        // 限制缩放范围
        this.config.current = Math.max(this.config.min, Math.min(this.config.max, newScale));
        
        // 应用缩放
        this.table.gLayer.scale({ x: this.config.current, y: this.config.current });
        
        // 调整位置以保持鼠标位置不变
        const newPos = {
            x: e.clientX - mousePointTo.x * this.config.current,
            y: e.clientY - mousePointTo.y * this.config.current
        };
        
        this.table.gLayer.position(newPos);
        this.table.gLayer.batchDraw();
        
        // 保存当前缩放状态到 stage 属性中
        this.table.stage.scaleX(this.config.current);
        this.table.stage.scaleY(this.config.current);
        
        console.log("Zoom: " + this.config.current.toFixed(2));
    }
    
    // 计算两个触摸点之间的距离
    getDistance(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // 计算两个触摸点的中心点
    getCenter(point1, point2) {
        return {
            x: (point1.x + point2.x) / 2,
            y: (point1.y + point2.y) / 2
        };
    }

    // 处理多点触摸开始
    handleMultiTouchStart(pointers) {
        if (pointers.length !== 2) return false;

        const [point1, point2] = pointers;
        
        this.touch.isZooming = true;
        this.isDragging = false;
        
        // 记录初始状态
        this.touch.initialScale = this.config.current;
        this.touch.initialPosition = {
            x: this.table.stage.x(),
            y: this.table.stage.y()
        };
        
        // 计算初始距离和中心点
        this.touch.initialDistance = this.getDistance(point1, point2);
        this.touch.initialCenter = this.getCenter(point1, point2);
        
        console.log('ZOOM_LOG: 双指触摸开始，重置缩放状态');
        return true;
    }

    // 处理多点触摸移动
    handleMultiTouchMove(pointers) {
        if (!this.touch.isZooming || pointers.length !== 2) return false;

        const [point1, point2] = pointers;
        
        // 计算当前距离和缩放比例
        const currentDistance = this.getDistance(point1, point2);
        const scaleRatio = currentDistance / this.touch.initialDistance;
        
        // 计算新的缩放值
        let newScale = this.touch.initialScale * scaleRatio;
        newScale = Math.max(this.config.min, Math.min(this.config.max, newScale));
        
        // 计算当前中心点
        const currentCenter = this.getCenter(point1, point2);
        
        // 计算位移
        const deltaX = currentCenter.x - this.touch.initialCenter.x;
        const deltaY = currentCenter.y - this.touch.initialCenter.y;
        
        // 应用缩放和位移
        this.config.current = newScale;
        
        const newX = this.touch.initialPosition.x + deltaX;
        const newY = this.touch.initialPosition.y + deltaY;
        
        this.table.stage.scale({ x: newScale, y: newScale });
        this.table.stage.position({x: newX, y: newY});
        this.table.stage.batchDraw();
        
        console.log('ZOOM_LOG: 双指触摸移动', {
            scale: newScale.toFixed(2),
            position: { x: newX.toFixed(0), y: newY.toFixed(0) }
        });
        
        return true;
    }

    // 处理多点触摸结束
    handleMultiTouchEnd(event) {
        if (!this.touch.isZooming) return false;
        
        // 如果还有一个触摸点，转为拖动模式
        if (this.table.activePointers.size === 1) {
            this.touch.isZooming = false;
            this.isDragging = true;
            this.dragStartPosition = {
                x: this.table.stage.x(),
                y: this.table.stage.y()
            };
            
            // 获取剩余的触摸点
            const remainingPointer = Array.from(this.table.activePointers.values())[0];
            this.touch.lastPosition = {
                x: remainingPointer.x,
                y: remainingPointer.y
            };
            
            console.log('ZOOM_LOG: 从缩放过渡到拖动');
            return true;
        }
        
        // 如果没有触摸点了，完全重置状态
        this.touch.isZooming = false;
        this.isDragging = false;
        console.log('ZOOM_LOG: 触摸结束，完全重置状态');
        return true;
    }
    
    // 进入缩放模式
    enterZoomMode() {
        if (this.isZoomMode) return; // 已经在缩放模式
        
        this.isZoomMode = true;
        this.previousTool = this.table.currentTool ? this.table.currentTool.name : null;
        
        if (this.table.currentTool) {
            this.table.currentTool.deactivate();
        }
        
        console.log("进入缩放模式");
        document.getElementById('a4-table').style.cursor = 'move';
    }
    
    // 退出缩放模式
    exitZoomMode() {
        if (!this.isZoomMode) return; // 不在缩放模式
        
        this.isZoomMode = false;
        document.getElementById('a4-table').style.cursor = 'default';
        
        if (this.previousTool) {
            this.table.setActiveTool(this.previousTool);
            console.log("退出缩放模式，恢复工具: " + this.previousTool);
        } else {
            console.log("退出缩放模式");
        }
    }
    
    // 处理触摸开始事件
    touchstart(e) {
        if (e.touches.length === 2) {
            // 双指触摸，初始化缩放状态
            this.touch.isZooming = true;
            this.isDragging = false; // 确保拖动状态被重置
            this.touch.initialScale = this.config.current;
            this.touch.initialPosition = {
                x: this.table.stage.x(),
                y: this.table.stage.y()
            };
            
            // 记录初始触摸点和中心点
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            this.touch.initialDistance = this.getDistance(touch1, touch2);
            this.touch.initialCenter = {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2
            };
            
            console.log('ZOOM_LOG: 双指触摸开始，重置缩放状态');
            e.preventDefault();
            return true;
        } else if (e.touches.length === 1 && this.isZoomMode && !this.touch.isZooming) {
            // 单指触摸且在缩放模式下，初始化拖动
            this.isDragging = true;
            this.dragStartPosition = {
                x: this.table.stage.x(),
                y: this.table.stage.y()
            };
            this.touch.lastPosition = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
            
            console.log('ZOOM_LOG: 缩放模式-单指拖动开始', {
                dragStartPosition: this.dragStartPosition,
                touchPosition: this.touch.lastPosition
            });
            e.preventDefault();
            return true;
        }
        return false;
    }
    
    // 处理触摸移动事件
    touchmove(e) {
        if (e.touches.length === 2 && this.touch.isZooming) {
            this.handleTouchZoom(e);
            return true;
        } else if (e.touches.length === 1 && this.isDragging) {
            // 单指拖动处理
            const touch = e.touches[0];
            const currentTouchPos = {
                x: touch.clientX,
                y: touch.clientY
            };
            
            // 计算移动距离
            const deltaX = currentTouchPos.x - this.touch.lastPosition.x;
            const deltaY = currentTouchPos.y - this.touch.lastPosition.y;
            
            // 更新舞台位置
            const newX = this.table.stage.x() + deltaX;
            const newY = this.table.stage.y() + deltaY;
            this.table.stage.position({x: newX, y: newY});
            this.table.stage.batchDraw();
            
            // 更新最后的触摸位置
            this.touch.lastPosition = currentTouchPos;
            
            e.preventDefault();
            return true;
        }
        return false;
    }
    
    // 处理触摸结束事件
    touchend(e) {
        if (this.touch.isZooming && e.touches.length === 1) {
            // 从双指变为单指，转为拖动模式
            this.touch.isZooming = false;
            this.isDragging = true;
            this.dragStartPosition = {
                x: this.table.stage.x(),
                y: this.table.stage.y()
            };
            this.touch.lastPosition = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
            
            console.log('ZOOM_LOG: 从缩放过渡到拖动', {
                dragStartPosition: this.dragStartPosition,
                touchPosition: this.touch.lastPosition
            });
            return true;
        } else if (e.touches.length === 0) {
            // 所有手指离开
            this.touch.isZooming = false;
            this.isDragging = false;
            console.log('ZOOM_LOG: 所有触摸结束，完全重置状态');
            return true;
        }
        return false;
    }
    
    // 处理指针按下事件
    pointerdown(e) {
        if (this.isZoomMode) {
            this.isDragging = true;
            this.dragStartPosition = {
                x: this.table.stage.x(),
                y: this.table.stage.y()
            };
            this.touch.lastPosition = {
                x: e.clientX,
                y: e.clientY
            };
            
            console.log('ZOOM_LOG: 缩放模式-指针拖动开始', {
                dragStartPosition: this.dragStartPosition,
                pointerPosition: this.touch.lastPosition
            });
            return true;
        }
        return false;
    }
    
    // 处理指针移动事件
    pointermove(e) {
        if (this.isZoomMode && this.isDragging) {
            const currentPointerPos = {
                x: e.clientX,
                y: e.clientY
            };
            
            // 计算移动距离
            const deltaX = currentPointerPos.x - this.touch.lastPosition.x;
            const deltaY = currentPointerPos.y - this.touch.lastPosition.y;
            
            // 更新舞台位置
            const newX = this.table.stage.x() + deltaX;
            const newY = this.table.stage.y() + deltaY;
            this.table.stage.position({x: newX, y: newY});
            this.table.stage.batchDraw();
            
            // 更新最后的指针位置
            this.touch.lastPosition = currentPointerPos;
            
            return true;
        }
        return false;
    }
    
    // 处理指针抬起事件
    pointerup(e) {
        if (this.isZoomMode && this.isDragging) {
            this.isDragging = false;
            console.log('ZOOM_LOG: 缩放模式-指针拖动结束');
            return true;
        }
        return false;
    }
} 