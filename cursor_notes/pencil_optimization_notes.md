# Pencil 工具性能优化建议

## 问题分析
在长时间绘制过程中，Pencil 工具出现卡顿，主要原因如下：

1. **点数组持续增长**：每次移动都向 `currentPoints` 数组添加新点，长时间绘制导致数组变得非常大。
2. **重复创建和销毁路径对象**：每次更新都销毁旧路径并创建新路径，导致频繁的垃圾回收。
3. **perfect-freehand 处理大量点的性能问题**：随着点数组增长，`getStroke` 函数需要处理的数据量增加。
4. **频繁的重绘操作**：每次更新都调用 `batchDraw()`，触发整个图层重绘。

## 优化建议

### 1. 点数组优化
- 对点进行抽样或简化，不必存储每一个移动事件的点
- 实现简单的抽样算法，例如：
  ```javascript
  // 示例：基于距离的抽样
  const lastPoint = this.currentPoints[this.currentPoints.length - 1];
  const distance = Math.sqrt(
    Math.pow(point[0] - lastPoint[0], 2) + 
    Math.pow(point[1] - lastPoint[1], 2)
  );
  
  // 只有当距离超过阈值时才添加新点
  if (distance > 5) {
    this.currentPoints.push(point);
  }
  ```

### 2. 增量绘制
- 不要每次都重新创建整个路径，而是只绘制新增的部分
- 将一个长笔画分成多个小段，每段单独缓存
  ```javascript
  // 示例：分段绘制
  if (this.currentPoints.length % 50 === 0) {
    // 每50个点创建一个新段
    const newSegment = new Konva.Path({
      data: this.getSvgPathFromStroke(getStroke(this.currentPoints.slice(-50), options)),
      fill: 'black',
    });
    this.currentStrokeGroup.add(newSegment);
    // 可以考虑缓存这个段
    newSegment.cache();
  }
  ```

### 3. 分段处理
- 当点数量达到一定阈值时，完成当前笔画并开始一个新的笔画
  ```javascript
  // 示例：点数量达到阈值时分段
  if (this.currentPoints.length > 500) {
    // 完成当前笔画
    this.drawCurrentStroke(true);
    
    // 缓存当前组
    this.currentStrokeGroup.cache();
    
    // 保留最后几个点作为新笔画的起点
    const lastPoints = this.currentPoints.slice(-5);
    
    // 开始新的笔画
    this.currentStrokeGroup = new Konva.Group();
    this.mainGroup.add(this.currentStrokeGroup);
    this.currentPoints = lastPoints;
    this.currentPath = null;
  }
  ```

### 4. 使用节流（Throttling）
- 限制 `pointermove` 和 `touchmove` 事件的处理频率
  ```javascript
  // 示例：使用 requestAnimationFrame 节流
  pointermove(e) {
    // 更新当前指针位置
    this.table.updateCurrentPointer();
    
    if (this.isdrawing && !this._moveThrottled) {
      this._moveThrottled = true;
      
      requestAnimationFrame(() => {
        this.updateStroke([this.table.currentPointer.x, this.table.currentPointer.y]);
        this._moveThrottled = false;
      });
    }
    
    this.updateHit();
  }
  ```

### 5. 优化 perfect-freehand 的使用
- 考虑只对最近添加的点进行处理，而不是每次都处理整个数组
- 在本地版本中修改 perfect-freehand 的实现，使其更高效地处理大量点
  ```javascript
  // 示例：只处理最近的点
  const recentPoints = this.currentPoints.length > 100 
    ? this.currentPoints.slice(-100) 
    : this.currentPoints;
  const stroke = getStroke(recentPoints, options);
  ```

### 6. 提前缓存
- 不要等到笔画结束才缓存，可以在绘制过程中定期缓存已完成的部分
  ```javascript
  // 示例：定期缓存
  if (this.currentPoints.length % 100 === 0) {
    // 每100个点缓存一次当前组
    this.currentStrokeGroup.cache();
  }
  ```

### 7. 减少不必要的状态更新
- 降低调试信息的更新频率
  ```javascript
  // 示例：降低调试信息更新频率
  if (!this._updateDebugScheduled && this.currentPoints.length % 10 === 0) {
    this._updateDebugScheduled = true;
    setTimeout(() => {
      updateDebugInfo('mousePosition', {
        x: this.table.currentPointer.x,
        y: this.table.currentPointer.y
      });
      this._updateDebugScheduled = false;
    }, 100);
  }
  ```

### 8. 使用 Web Workers
- 将计算密集型任务（如 perfect-freehand 的计算）移到 Web Worker 中
- 这样可以避免阻塞主线程
  ```javascript
  // 示例：创建 Web Worker
  // worker.js
  self.onmessage = function(e) {
    const { points, options } = e.data;
    // 导入 perfect-freehand (需要适配 Worker 环境)
    importScripts('path/to/perfect-freehand.js');
    const stroke = getStroke(points, options);
    self.postMessage(stroke);
  };
  
  // 主线程
  if (!this.worker) {
    this.worker = new Worker('worker.js');
    this.worker.onmessage = (e) => {
      const stroke = e.data;
      const pathData = this.getSvgPathFromStroke(stroke);
      // 更新路径
      // ...
    };
  }
  
  this.worker.postMessage({
    points: this.currentPoints,
    options: options
  });
  ```

### 9. 硬件加速
- 确保使用 GPU 加速的绘图操作
- 可以考虑使用 `transform` 而不是直接修改路径
  ```javascript
  // 示例：启用硬件加速
  this.currentPath = new Konva.Path({
    data: pathData,
    fill: 'black',
    perfectDrawEnabled: false, // 禁用完美绘制以提高性能
    listening: false,
    draggable: false,
  });
  ```

### 10. 内存管理
- 确保正确释放不再需要的资源
- 监控内存使用情况，及时清理
  ```javascript
  // 示例：清理不再需要的资源
  deactivate() {
    console.log("PencilTool deactivate");
    // 确保在工具停用时结束任何进行中的绘画
    if (this.isdrawing) {
      this.finishStroke();
    }
    
    // 清理不再需要的资源
    this.currentPoints = [];
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
  ```

## 实施优先级

1. **点数组优化** 和 **节流** - 这两项改动相对简单，但可能带来显著改善
2. **分段处理** - 这可以有效解决长笔画的性能问题
3. **优化 perfect-freehand 使用** - 减少计算量
4. **提前缓存** - 提高渲染性能
5. **Web Workers** - 如果前面的优化仍不足够，可以考虑这个更复杂的解决方案

## 性能监控

建议在实施优化前后添加性能监控代码，以便量化改进效果：

```javascript
// 示例：性能监控
const startTime = performance.now();
// 执行操作
const endTime = performance.now();
console.log(`操作耗时: ${endTime - startTime}ms`);
```

也可以监控内存使用情况：

```javascript
// 示例：内存监控
if (window.performance && window.performance.memory) {
  console.log(`已用堆大小: ${performance.memory.usedJSHeapSize / 1048576} MB`);
}
``` 