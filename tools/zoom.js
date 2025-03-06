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
    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // 处理触摸缩放
    handleTouchZoom(e) {
        e.preventDefault();
        
        if (e.touches.length !== 2) {
            console.log("ZOOM_LOG: 触摸点不足2个，退出缩放");
            return;
        }

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        
        // 计算当前触摸状态
        const currentDistance = this.getDistance(touch1, touch2);
        const currentCenter = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };

        if (!this.touch.isZooming) {
            // 首次触摸，记录初始状态
            this.touch.initialDistance = currentDistance;
            this.touch.initialCenter = { ...currentCenter };
            this.touch.initialScale = this.config.current;
            this.touch.initialPosition = {
                x: this.table.stage.x(),
                y: this.table.stage.y()
            };
            this.touch.isZooming = true;
            
            console.log("ZOOM_LOG: 初始化缩放状态", JSON.stringify({
                initialDistance: this.touch.initialDistance.toFixed(1),
                initialCenter: {
                    x: this.touch.initialCenter.x.toFixed(1), 
                    y: this.touch.initialCenter.y.toFixed(1)
                },
                initialScale: this.touch.initialScale.toFixed(3),
                initialPosition: {
                    x: this.touch.initialPosition.x.toFixed(1), 
                    y: this.touch.initialPosition.y.toFixed(1)
                }
            }));
            return;
        }

        // 使用直接的缩放比例计算，避免累积误差
        const scaleRatio = currentDistance / this.touch.initialDistance;
        
        // 计算新的缩放值，相对于触摸开始时的缩放值
        let newScale = this.touch.initialScale * scaleRatio;
        
        // 限制缩放范围
        const oldScale = newScale;
        newScale = Math.max(this.config.min, Math.min(this.config.max, newScale));
        
        // 如果缩放被限制，调整scaleRatio
        const adjustedScaleRatio = newScale / this.touch.initialScale;
        
        console.log("ZOOM_LOG: 缩放计算", JSON.stringify({
            initialDistance: this.touch.initialDistance.toFixed(1),
            currentDistance: currentDistance.toFixed(1),
            scaleRatio: scaleRatio.toFixed(3),
            adjustedScaleRatio: adjustedScaleRatio.toFixed(3),
            initialScale: this.touch.initialScale.toFixed(3),
            calculatedScale: oldScale.toFixed(3),
            limitedScale: newScale.toFixed(3)
        }));
        
        // 使用更精确的位置计算方法
        // 1. 计算初始中心点在舞台坐标系中的位置
        const initialCenterInStage = {
            x: (this.touch.initialCenter.x - this.touch.initialPosition.x) / this.touch.initialScale,
            y: (this.touch.initialCenter.y - this.touch.initialPosition.y) / this.touch.initialScale
        };
        
        // 2. 计算当前中心点应该在舞台坐标系中的位置
        const currentCenterInStage = {
            x: (currentCenter.x - this.touch.initialPosition.x) / this.touch.initialScale,
            y: (currentCenter.y - this.touch.initialPosition.y) / this.touch.initialScale
        };
        
        // 3. 计算中心点的移动（在舞台坐标系中）
        const centerDeltaInStage = {
            x: currentCenterInStage.x - initialCenterInStage.x,
            y: currentCenterInStage.y - initialCenterInStage.y
        };
        
        // 4. 计算新的舞台位置
        // 新位置 = 初始位置 + 中心点移动 * 初始缩放 - 初始中心点 * (新缩放 - 初始缩放)
        const newX = this.touch.initialPosition.x + 
                    centerDeltaInStage.x * this.touch.initialScale - 
                    initialCenterInStage.x * (newScale - this.touch.initialScale);
        
        const newY = this.touch.initialPosition.y + 
                    centerDeltaInStage.y * this.touch.initialScale - 
                    initialCenterInStage.y * (newScale - this.touch.initialScale);
        
        // 应用新的缩放和位置
        this.config.current = newScale;
        this.table.stage.scale({ x: newScale, y: newScale });
        this.table.stage.position({x: newX, y: newY});
        this.table.stage.batchDraw();
        
        // 更新调试信息
        console.log("ZOOM_LOG: 缩放完成", JSON.stringify({
            finalScale: newScale.toFixed(3),
            finalPosition: {x: newX.toFixed(1), y: newY.toFixed(1)},
            ratio: adjustedScaleRatio.toFixed(3)
        }));
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
        document.getElementById('a4-table').classList.add('zoom-mode');
        document.getElementById('a4-table').style.cursor = 'move';
    }
    
    // 退出缩放模式
    exitZoomMode() {
        if (!this.isZoomMode) return; // 不在缩放模式
        
        this.isZoomMode = false;
        document.getElementById('a4-table').classList.remove('zoom-mode');
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