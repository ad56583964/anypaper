# Anya4 重构计划：从 Konva 迁移到 PixiJS

## 背景与目标

当前 Anya4 项目使用 Konva.js 实现白板功能，但在大型画布和复杂缩放操作时遇到性能瓶颈。本重构计划旨在将渲染层从 Konva 迁移到 PixiJS，以提高性能和可扩展性，同时保持现有功能。

## 为什么选择 PixiJS

1. **性能优势**：
   - 基于 WebGL 的渲染，充分利用 GPU 加速
   - 更高效的批处理和缓存机制
   - 更低的内存占用

2. **适合大型画布**：
   - 原生支持视口裁剪和对象池化
   - 更适合处理大量对象和频繁的变换操作

3. **活跃的社区和维护**：
   - 广泛应用于游戏和交互式应用
   - 持续更新和优化

## 重构策略

采用渐进式重构策略，将系统分解为独立模块，逐步替换每个模块，同时保持系统功能。

### 阶段 1：环境准备与基础架构

1. **安装 PixiJS 依赖**
2. **创建基础渲染架构**
3. **实现基本的画布和图层管理**

### 阶段 2：核心组件重构

1. **Table 组件重构**
2. **绘图工具重构（Pencil）**
3. **缩放与平移功能重构（Zoom）**

### 阶段 3：高级功能与优化

1. **实现高效的视口裁剪**
2. **优化绘图性能**
3. **实现多点触控支持**

### 阶段 4：集成与测试

1. **与现有 React 组件集成**
2. **全面测试与性能评估**
3. **优化与调整**

## 详细实施计划

### 阶段 1：环境准备与基础架构

#### 1.1 安装 PixiJS 依赖

```bash
npm install pixi.js
```

#### 1.2 创建基础渲染类

创建 `PixiRenderer` 类作为 PixiJS 渲染的核心，替代当前的 Konva Stage。

```javascript
// src/pixi/PixiRenderer.js
import * as PIXI from 'pixi.js';

export default class PixiRenderer {
    constructor(containerId, width, height) {
        // 创建 PIXI 应用
        this.app = new PIXI.Application({
            width,
            height,
            backgroundColor: 0xdddddd,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            antialias: true
        });
        
        // 添加到容器
        const container = document.getElementById(containerId);
        container.appendChild(this.app.view);
        
        // 创建图层
        this.bgLayer = new PIXI.Container();
        this.contentLayer = new PIXI.Container();
        
        this.app.stage.addChild(this.bgLayer);
        this.app.stage.addChild(this.contentLayer);
        
        // 初始化交互管理器
        this.initInteraction();
    }
    
    initInteraction() {
        // 设置交互
        this.app.stage.interactive = true;
        this.app.stage.hitArea = new PIXI.Rectangle(0, 0, this.app.screen.width, this.app.screen.height);
    }
    
    // 其他基础方法...
}
```

#### 1.3 实现基本的图层管理

创建图层管理系统，对应当前的 Konva Layer。

```javascript
// src/pixi/PixiLayer.js
import * as PIXI from 'pixi.js';

export default class PixiLayer {
    constructor(renderer, options = {}) {
        this.renderer = renderer;
        this.container = new PIXI.Container();
        
        // 设置选项
        if (options.name) {
            this.container.name = options.name;
        }
        
        // 添加到渲染器
        if (options.parent === 'background') {
            renderer.bgLayer.addChild(this.container);
        } else {
            renderer.contentLayer.addChild(this.container);
        }
    }
    
    // 添加图形
    add(displayObject) {
        this.container.addChild(displayObject);
        return this;
    }
    
    // 清除图层
    clear() {
        while(this.container.children.length > 0) {
            const child = this.container.getChildAt(0);
            this.container.removeChild(child);
        }
        return this;
    }
    
    // 其他图层方法...
}
```

### 阶段 2：核心组件重构

#### 2.1 Table 组件重构

创建新的 Table 类，使用 PixiJS 替代 Konva。

```javascript
// src/pixi/PixiTable.js
import * as PIXI from 'pixi.js';
import PixiRenderer from './PixiRenderer';
import PixiLayer from './PixiLayer';
import PixiPencilTool from './tools/PixiPencilTool';
import PixiZoomTool from './tools/PixiZoomTool';

export default class PixiTable {
    constructor(containerId = 'a4-table') {
        this.pixel = 2;
        
        // 设置 block 大小
        this.block = {
            width: 10 * this.pixel,
            height: 10 * this.pixel,
        };
        
        // 计算画布大小
        this.width = 60 * this.block.width;
        this.height = 60 * this.block.height;
        
        // 创建渲染器
        this.renderer = new PixiRenderer(containerId, this.width, this.height);
        
        // 创建图层
        this.bgLayer = new PixiLayer(this.renderer, { name: 'background', parent: 'background' });
        this.gridLayer = new PixiLayer(this.renderer, { name: 'grid', parent: 'background' });
        this.paperLayer = new PixiLayer(this.renderer, { name: 'paper', parent: 'background' });
        this.drawingLayer = new PixiLayer(this.renderer, { name: 'drawing' });
        
        // 初始化工具
        this.tools = {};
        this.initTools();
        
        // 初始化表格
        this.initTable();
        
        // 设置事件监听
        this.setupEventListeners();
    }
    
    initTools() {
        // 初始化工具
        this.pencilTool = new PixiPencilTool(this);
        this.zoomTool = new PixiZoomTool(this);
        
        // 注册工具
        this.registerTool('pencil', this.pencilTool);
        this.registerTool('zoom', this.zoomTool);
        
        // 设置默认工具
        this.setActiveTool('pencil');
    }
    
    registerTool(name, tool) {
        this.tools[name] = tool;
    }
    
    setActiveTool(name) {
        if (this.currentTool) {
            this.currentTool.deactivate();
        }
        
        this.currentTool = this.tools[name];
        
        if (this.currentTool) {
            this.currentTool.activate();
        }
    }
    
    initTable() {
        // 绘制背景
        this.drawBackground();
        
        // 绘制网格
        this.drawGrid();
        
        // 创建 paper
        this.createPaper();
    }
    
    drawBackground() {
        // 创建背景矩形
        const bg = new PIXI.Graphics();
        bg.beginFill(0xdddddd);
        bg.lineStyle(4, 0x8B4513);
        bg.drawRect(0, 0, this.width, this.height);
        bg.endFill();
        
        this.bgLayer.add(bg);
    }
    
    drawGrid() {
        // 实现高效的网格绘制
        // 使用 PIXI.Graphics 或 PIXI.Sprite 从纹理绘制
    }
    
    createPaper() {
        // 创建 16:9 比例的 paper
    }
    
    setupEventListeners() {
        // 设置事件监听
    }
    
    // 其他方法...
}
```

#### 2.2 绘图工具重构（Pencil）

```javascript
// src/pixi/tools/PixiPencilTool.js
import * as PIXI from 'pixi.js';
import { getStroke } from '../../src/perfect-freehand/packages/perfect-freehand/src';

export default class PixiPencilTool {
    constructor(table) {
        this.table = table;
        this.isDrawing = false;
        this.currentPoints = [];
        this.currentPressures = [];
        
        // 当前绘制的图形
        this.currentGraphics = null;
        
        // 存储所有绘制的图形
        this.drawings = [];
    }
    
    activate() {
        console.log("PixiPencilTool activate");
    }
    
    deactivate() {
        console.log("PixiPencilTool deactivate");
        if (this.isDrawing) {
            this.finishStroke();
        }
    }
    
    pointerdown(event) {
        // 处理指针按下事件
    }
    
    pointermove(event) {
        // 处理指针移动事件
    }
    
    pointerup(event) {
        // 处理指针抬起事件
    }
    
    startStroke(x, y, pressure = 0.5) {
        // 开始绘制
    }
    
    updateStroke(x, y, pressure = 0.5) {
        // 更新绘制
    }
    
    finishStroke() {
        // 完成绘制
    }
    
    drawCurrentStroke(isLast) {
        // 绘制当前笔画
    }
    
    // 其他方法...
}
```

#### 2.3 缩放与平移功能重构（Zoom）

```javascript
// src/pixi/tools/PixiZoomTool.js
import * as PIXI from 'pixi.js';

export default class PixiZoomTool {
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
            initialCenter: { x: 0, y: 0 }
        };
        
        // 缩放模式
        this.isZoomMode = false;
        this.previousTool = null;
        
        // 拖动状态
        this.isDragging = false;
        this.dragStartPosition = { x: 0, y: 0 };
    }
    
    activate() {
        console.log("PixiZoomTool activate");
    }
    
    deactivate() {
        console.log("PixiZoomTool deactivate");
    }
    
    wheel(e) {
        // 处理滚轮缩放
    }
    
    handleMultiTouchStart(pointers) {
        // 处理多点触摸开始
    }
    
    handleMultiTouchMove(pointers) {
        // 处理多点触摸移动
    }
    
    handleMultiTouchEnd(event) {
        // 处理多点触摸结束
    }
    
    // 其他方法...
}
```

### 阶段 3：高级功能与优化

#### 3.1 实现高效的视口裁剪

PixiJS 原生支持视口裁剪，我们可以利用这一特性实现高效的渲染：

```javascript
// 在 PixiRenderer 中添加视口裁剪功能
initViewportClipping() {
    // 设置 cull 区域
    this.contentLayer.cullable = true;
    this.updateViewport();
    
    // 添加视口更新监听
    this.app.ticker.add(() => {
        this.updateViewport();
    });
}

updateViewport() {
    // 获取当前视口信息
    const bounds = new PIXI.Rectangle(
        -this.contentLayer.x / this.contentLayer.scale.x,
        -this.contentLayer.y / this.contentLayer.scale.y,
        this.app.screen.width / this.contentLayer.scale.x,
        this.app.screen.height / this.contentLayer.scale.y
    );
    
    // 设置裁剪区域
    this.contentLayer.cullArea = bounds;
}
```

#### 3.2 优化绘图性能

利用 PixiJS 的图形缓存和批处理功能优化绘图性能：

```javascript
// 在 PixiPencilTool 中优化绘图性能
finishStroke() {
    if (!this.isDrawing) return;
    
    // 完成最终绘制
    this.drawCurrentStroke(true);
    
    // 将绘制的图形转换为纹理以提高性能
    const texture = this.table.renderer.app.renderer.generateTexture(
        this.currentGraphics,
        PIXI.SCALE_MODES.LINEAR,
        window.devicePixelRatio || 2
    );
    
    // 创建精灵
    const sprite = new PIXI.Sprite(texture);
    sprite.position.set(this.currentGraphics.x, this.currentGraphics.y);
    
    // 添加到绘图层
    this.table.drawingLayer.add(sprite);
    
    // 移除原图形
    this.table.drawingLayer.container.removeChild(this.currentGraphics);
    
    // 存储绘制的精灵
    this.drawings.push(sprite);
    
    // 重置状态
    this.isDrawing = false;
    this.currentPoints = [];
    this.currentPressures = [];
    this.currentGraphics = null;
}
```

#### 3.3 实现多点触控支持

利用 PixiJS 的交互系统实现多点触控支持：

```javascript
// 在 PixiRenderer 中添加多点触控支持
initInteraction() {
    // 设置交互
    this.app.stage.interactive = true;
    this.app.stage.hitArea = new PIXI.Rectangle(0, 0, this.app.screen.width, this.app.screen.height);
    
    // 跟踪活动的触摸点
    this.activePointers = new Map();
    
    // 添加事件监听
    this.app.view.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.app.view.addEventListener('pointermove', this.handlePointerMove.bind(this));
    this.app.view.addEventListener('pointerup', this.handlePointerUp.bind(this));
    this.app.view.addEventListener('pointercancel', this.handlePointerUp.bind(this));
}

handlePointerDown(e) {
    // 记录触摸点
    this.activePointers.set(e.pointerId, {
        id: e.pointerId,
        clientX: e.clientX,
        clientY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        pointerType: e.pointerType,
        pressure: e.pressure || 0,
        isPrimary: e.isPrimary
    });
    
    // 处理多点触摸
    if (this.activePointers.size === 2) {
        // 触发多点触摸事件
    }
}

// 其他处理方法...
```

### 阶段 4：集成与测试

#### 4.1 与现有 React 组件集成

创建 React 组件包装 PixiTable：

```javascript
// src/components/PixiTableComponent.jsx
import React, { useEffect, useRef } from 'react';
import PixiTable from '../pixi/PixiTable';

const PixiTableComponent = () => {
    const containerRef = useRef(null);
    const tableRef = useRef(null);
    
    useEffect(() => {
        if (containerRef.current && !tableRef.current) {
            // 创建 PixiTable 实例
            tableRef.current = new PixiTable(containerRef.current.id);
            
            // 清理函数
            return () => {
                if (tableRef.current) {
                    // 清理资源
                    tableRef.current.destroy();
                    tableRef.current = null;
                }
            };
        }
    }, []);
    
    return (
        <div 
            id="a4-table" 
            ref={containerRef} 
            style={{ width: '100%', height: '100%' }}
        />
    );
};

export default PixiTableComponent;
```

#### 4.2 全面测试与性能评估

1. **功能测试**：确保所有功能正常工作
2. **性能测试**：测量 FPS、内存使用和响应时间
3. **兼容性测试**：在不同设备和浏览器上测试

#### 4.3 优化与调整

根据测试结果进行最终优化和调整。

## 迁移路径

为了确保平稳过渡，我们将采用以下迁移路径：

1. **并行开发**：保持现有 Konva 实现不变，同时开发 PixiJS 版本
2. **功能对等**：确保 PixiJS 版本实现所有现有功能
3. **A/B 测试**：在开发环境中进行 A/B 测试，比较两个版本的性能
4. **渐进替换**：在确认 PixiJS 版本稳定后，逐步替换现有实现

## 风险与缓解策略

1. **学习曲线**：PixiJS 的 API 与 Konva 不同，需要时间学习
   - 缓解：创建适配层，使 PixiJS API 更接近当前使用的 Konva API

2. **功能差异**：PixiJS 可能缺少 Konva 的某些功能
   - 缓解：提前识别差异，必要时自行实现缺失功能

3. **集成问题**：与现有代码集成可能遇到挑战
   - 缓解：采用模块化设计，确保清晰的接口边界

4. **性能期望**：性能提升可能不如预期
   - 缓解：进行早期原型验证，确认性能提升幅度

## 时间线

1. **阶段 1**：环境准备与基础架构 - 1 周
2. **阶段 2**：核心组件重构 - 2 周
3. **阶段 3**：高级功能与优化 - 1 周
4. **阶段 4**：集成与测试 - 1 周

总计：约 5 周

## 结论

将 Anya4 从 Konva 迁移到 PixiJS 是一项重要的技术升级，预计将显著提高应用在大型画布和复杂操作时的性能。通过采用渐进式重构策略，我们可以在保持系统功能的同时，平稳地完成这一迁移。 