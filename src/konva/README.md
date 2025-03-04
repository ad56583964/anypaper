# 本地 Konva 源码

这个目录包含了 Konva 9.2.0 版本的源码，已经集成到项目中，以便于定位和解决 Android Phone 上的性能问题。

## 目录结构

- `index.js` - 入口文件，导出所有 Konva 组件
- `*.ts` - Konva 核心文件
- `shapes/*.ts` - Konva 形状文件
- `filters/*.ts` - Konva 滤镜文件
- `build.js` - 构建脚本
- `tsconfig.json` - TypeScript 配置文件

## 如何使用

项目已经修改为使用本地的 Konva 版本，而不是 npm 安装的版本。所有导入 Konva 的文件都已经更新为从 `src/konva` 导入。

## 如何修改

您可以直接修改这个目录下的文件，以优化性能。以下是一些可能需要关注的文件：

- `Stage.ts` - 处理舞台和事件
- `Layer.ts` - 处理图层和缓存
- `Node.ts` - 基础节点类
- `Shape.ts` - 形状基类
- `Context.ts` - Canvas 上下文封装
- `DragAndDrop.ts` - 拖拽功能
- `PointerEvents.ts` - 触摸和鼠标事件处理

## 性能优化方向

针对 Android Phone 上的性能问题，您可以考虑以下优化方向：

1. **减少不必要的渲染和重绘**
   - 检查 `batchDraw` 和 `draw` 方法的调用
   - 优化 `Layer` 的缓存策略

2. **优化触摸事件处理**
   - 检查 `PointerEvents.ts` 和 `DragAndDrop.ts`
   - 减少事件处理的复杂度

3. **使用更高效的绘图算法**
   - 优化 `Shape` 子类的 `_sceneFunc` 方法
   - 减少复杂形状的点数

4. **减少 Canvas 的大小或分辨率**
   - 调整 `Stage` 的大小
   - 使用适合移动设备的分辨率

5. **使用硬件加速**
   - 检查 `Context.ts` 中的 Canvas 配置
   - 启用硬件加速选项

6. **检查内存泄漏**
   - 确保正确销毁不再使用的对象
   - 检查事件监听器是否被正确移除

## 调试技巧

1. 使用 Chrome 开发者工具的性能分析器
2. 添加性能标记来测量关键操作的时间
3. 使用 `console.time` 和 `console.timeEnd` 测量函数执行时间
4. 检查 Canvas 渲染性能，特别是在 Android 设备上

## 注意事项

修改 Konva 源码可能会导致兼容性问题。请确保在修改后进行充分测试，特别是在不同设备和浏览器上。 