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
        
        // 触摸状态跟踪 - 简化状态管理
        this.touch = {
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
    
    // 设置缩放值 // ？这个没人用？
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
        
        // 应用缩放到两个图层
        this.table.gLayer.scale({ x: this.config.current, y: this.config.current });
        this.table.bgLayer.scale({ x: this.config.current, y: this.config.current });
        
        // 调整位置以保持鼠标位置不变
        const newPos = {
            x: e.clientX - mousePointTo.x * this.config.current,
            y: e.clientY - mousePointTo.y * this.config.current
        };
        
        // 同时更新两个图层的位置
        this.table.gLayer.position(newPos);
        this.table.bgLayer.position(newPos);
        
        // 更新点阵网格以适应当前缩放级别
        this.table.updateGridForZoom(this.config.current);
        
        // 重新绘制两个图层
        this.table.gLayer.batchDraw();
        this.table.bgLayer.batchDraw();
        
        // 保存当前缩放状态到 stage 属性中
        // this.table.stage.scaleX(this.config.current);
        // this.table.stage.scaleY(this.config.current);
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
        
        // 计算初始距离和中心点
        const initialDistance = this.getDistance(
            { x: point1.clientX, y: point1.clientY },
            { x: point2.clientX, y: point2.clientY }
        );
        
        const initialCenter = {
            x: (point1.clientX + point2.clientX) / 2,
            y: (point1.clientY + point2.clientY) / 2
        };
        
        // 记录初始状态
        this.touch.isZooming = true;
        this.isDragging = false;
        this.touch.initialScale = this.config.current;
        this.touch.initialDistance = initialDistance;
        this.touch.initialCenter = initialCenter;
        this.touch.initialPosition = {
            x: this.table.gLayer.x(),
            y: this.table.gLayer.y()
        };
        
        return true;
    }

    // 处理多点触摸移动
    handleMultiTouchMove(pointers) {
        if (!this.touch.isZooming || pointers.length !== 2) return false;

        const [point1, point2] = pointers;
        
        // 计算当前状态
        const currentDistance = this.getDistance(
            { x: point1.clientX, y: point1.clientY },
            { x: point2.clientX, y: point2.clientY }
        );
        
        const currentCenter = {
            x: (point1.clientX + point2.clientX) / 2,
            y: (point1.clientY + point2.clientY) / 2
        };
        
        // 计算缩放比例
        const scaleRatio = currentDistance / this.touch.initialDistance;
        let newScale = this.touch.initialScale * scaleRatio;
        
        // 限制缩放范围
        newScale = Math.max(this.config.min, Math.min(this.config.max, newScale));
        
        // 使用更精确的位置计算方法
        // 1. 计算初始中心点在图层坐标系中的位置
        const initialCenterInLayer = {
            x: (this.touch.initialCenter.x - this.touch.initialPosition.x) / this.touch.initialScale,
            y: (this.touch.initialCenter.y - this.touch.initialPosition.y) / this.touch.initialScale
        };
        
        // 2. 计算当前中心点在图层坐标系中的位置
        const currentCenterInLayer = {
            x: (currentCenter.x - this.touch.initialPosition.x) / this.touch.initialScale,
            y: (currentCenter.y - this.touch.initialPosition.y) / this.touch.initialScale
        };
        
        // 3. 计算中心点的移动（在图层坐标系中）
        const centerDeltaInLayer = {
            x: currentCenterInLayer.x - initialCenterInLayer.x,
            y: currentCenterInLayer.y - initialCenterInLayer.y
        };
        
        // 4. 计算新的图层位置
        const newX = this.touch.initialPosition.x + 
                    centerDeltaInLayer.x * this.touch.initialScale - 
                    initialCenterInLayer.x * (newScale - this.touch.initialScale);
        
        const newY = this.touch.initialPosition.y + 
                    centerDeltaInLayer.y * this.touch.initialScale - 
                    initialCenterInLayer.y * (newScale - this.touch.initialScale);
        
        // 应用变换
        this.config.current = newScale;
        
        // 同时更新两个图层的缩放
        this.table.gLayer.scale({ x: newScale, y: newScale });
        this.table.bgLayer.scale({ x: newScale, y: newScale });
        
        // 同时更新两个图层的位置
        this.table.gLayer.position({ x: newX, y: newY });
        this.table.bgLayer.position({ x: newX, y: newY });
        
        // 更新点阵网格以适应当前缩放级别
        this.table.updateGridForZoom(newScale);
        
        // 重新绘制两个图层
        this.table.gLayer.batchDraw();
        this.table.bgLayer.batchDraw();
        
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
                x: this.table.gLayer.x(),
                y: this.table.gLayer.y()
            };
            
            // 获取剩余的触摸点
            const remainingPointer = Array.from(this.table.activePointers.values())[0];
            this.touch.lastPosition = {
                x: remainingPointer.clientX,
                y: remainingPointer.clientY
            };
            
            return true;
        }
        
        // 如果没有触摸点了，完全重置状态
        this.touch.isZooming = false;
        this.isDragging = false;
        
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
        
        document.getElementById('a4-table').style.cursor = 'move';
    }
    
    // 退出缩放模式
    exitZoomMode() {
        if (!this.isZoomMode) return; // 不在缩放模式
        
        this.isZoomMode = false;
        document.getElementById('a4-table').style.cursor = 'default';
        
        if (this.previousTool) {
            this.table.setActiveTool(this.previousTool);
        }
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
            
            // 更新图层位置
            const newX = this.table.gLayer.x() + deltaX;
            const newY = this.table.gLayer.y() + deltaY;
            
            // 同时更新两个图层的位置
            this.table.gLayer.position({x: newX, y: newY});
            this.table.bgLayer.position({x: newX, y: newY});
            
            // 重新绘制两个图层
            this.table.gLayer.batchDraw();
            this.table.bgLayer.batchDraw();
            
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
            return true;
        }
        return false;
    }
} 