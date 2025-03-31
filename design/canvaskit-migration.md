# CanvasKit迁移设计文档

## 背景

当前项目使用Pixi.js作为渲染引擎，我们计划迁移到基于Skia的CanvasKit以获得更好的性能和渲染质量。

## 架构对比

### 当前架构 (Pixi.js)

```
Table (主容器)
├── bgLayer (PIXI.Container)
│   └── Paper
├── contentLayer (PIXI.Container)
│   └── drawingContainer (PIXI.Container)
└── pointerLayer (PIXI.Container)
```

### 目标架构 (CanvasKit)

```
CanvasTable (主容器)
├── backgroundLayer (SkCanvas/Surface)
│   └── CanvasPaper
├── contentLayer (SkCanvas/Surface)
│   └── drawingLayer
└── pointerLayer (SkCanvas/Surface)
```

## 核心组件迁移

1. **Table → CanvasTable**
   - 替换PIXI.Application为CanvasKit初始化
   - 替换PIXI.Container为SkCanvas层级结构
   - 重新实现视图转换（缩放、平移）

2. **Paper → CanvasPaper**
   - 用SkRRect替代PIXI.Graphics绘制圆角矩形
   - 阴影效果使用SkCanvas提供的阴影API

3. **PencilTool → CanvasPencilTool**
   - 使用SkPath替代PIXI.Graphics
   - 利用SkPaint设置笔触样式

## 实现步骤

1. 设置CanvasKit环境
2. 创建基础组件框架
3. 实现核心渲染逻辑
4. 迁移交互事件处理
5. 优化性能和渲染质量

## 技术注意事项

- CanvasKit采用WebAssembly，需确保正确加载
- CanvasKit与Pixi.js的坐标系统和事件处理略有不同
- 使用SkiaSharp样式API绘制高质量图形
