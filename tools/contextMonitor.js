// 监控Canvas上下文的save和restore操作
export default class ContextMonitor {
    constructor(stage) {
        this.stage = stage;
        this.saveCount = 0;
        this.restoreCount = 0;
        this.saveRestoreStack = [];
        this.isMonitoring = false;
        this.originalRestore = null;
        this.originalSave = null;
    }

    // 开始监控
    startMonitoring() {
        if (this.isMonitoring) {
            console.warn('已经在监控中');
            return;
        }

        const layers = this.stage.getLayers();
        if (!layers || layers.length === 0) {
            console.error('没有找到图层');
            return;
        }

        // 为每个图层的上下文打补丁
        layers.forEach((layer, index) => {
            const context = layer.getContext();
            if (!context || !context._context) {
                console.error(`图层 ${index} 没有有效的上下文`);
                return;
            }

            this._patchContext(context, `图层 ${index}`);
        });

        this.isMonitoring = true;
        console.log('开始监控Canvas上下文的save和restore操作');
    }

    // 停止监控
    stopMonitoring() {
        if (!this.isMonitoring) {
            console.warn('没有在监控中');
            return;
        }

        const layers = this.stage.getLayers();
        if (!layers || layers.length === 0) {
            console.error('没有找到图层');
            return;
        }

        // 恢复原始方法
        layers.forEach((layer, index) => {
            const context = layer.getContext();
            if (!context || !context._context) {
                console.error(`图层 ${index} 没有有效的上下文`);
                return;
            }

            this._unpatchContext(context);
        });

        this.isMonitoring = false;
        console.log('停止监控Canvas上下文的save和restore操作');
        this._printSummary();
    }

    // 为上下文打补丁
    _patchContext(context, layerName) {
        const self = this;
        
        // 保存原始方法
        if (!context._originalRestore) {
            context._originalRestore = context.restore;
        }
        if (!context._originalSave) {
            context._originalSave = context.save;
        }

        // 替换restore方法
        context.restore = function() {
            self.restoreCount++;
            
            // 获取当前上下文状态
            const currentState = self._captureContextState(this._context);
            
            // 记录调用堆栈
            const stack = new Error().stack;
            
            console.log(`[${layerName}] restore() 调用 #${self.restoreCount}`);
            console.log('调用堆栈:', stack);
            
            if (self.saveRestoreStack.length > 0) {
                self.saveRestoreStack.pop();
            } else {
                console.warn(`[${layerName}] restore() 调用没有对应的save()`);
            }
            
            // 调用原始方法
            const result = context._originalRestore.apply(this, arguments);
            
            // 获取restore后的状态
            const newState = self._captureContextState(this._context);
            
            // 输出状态变化
            console.log('restore前状态:', currentState);
            console.log('restore后状态:', newState);
            console.log('状态差异:', self._compareStates(currentState, newState));
            
            return result;
        };

        // 替换save方法
        context.save = function() {
            self.saveCount++;
            
            // 获取当前上下文状态
            const currentState = self._captureContextState(this._context);
            
            // 记录调用堆栈
            const stack = new Error().stack;
            
            console.log(`[${layerName}] save() 调用 #${self.saveCount}`);
            console.log('调用堆栈:', stack);
            
            // 保存当前状态到栈
            self.saveRestoreStack.push({
                state: currentState,
                stack: stack
            });
            
            // 调用原始方法
            return context._originalSave.apply(this, arguments);
        };
    }

    // 恢复原始上下文方法
    _unpatchContext(context) {
        if (context._originalRestore) {
            context.restore = context._originalRestore;
            delete context._originalRestore;
        }
        
        if (context._originalSave) {
            context.save = context._originalSave;
            delete context._originalSave;
        }
    }

    // 捕获上下文当前状态
    _captureContextState(ctx) {
        if (!ctx) return null;
        
        try {
            return {
                transform: ctx.getTransform ? ctx.getTransform() : null,
                fillStyle: ctx.fillStyle,
                strokeStyle: ctx.strokeStyle,
                lineWidth: ctx.lineWidth,
                lineCap: ctx.lineCap,
                lineJoin: ctx.lineJoin,
                miterLimit: ctx.miterLimit,
                lineDashOffset: ctx.lineDashOffset,
                shadowOffsetX: ctx.shadowOffsetX,
                shadowOffsetY: ctx.shadowOffsetY,
                shadowBlur: ctx.shadowBlur,
                shadowColor: ctx.shadowColor,
                globalAlpha: ctx.globalAlpha,
                globalCompositeOperation: ctx.globalCompositeOperation,
                font: ctx.font,
                textAlign: ctx.textAlign,
                textBaseline: ctx.textBaseline,
                direction: ctx.direction,
                imageSmoothingEnabled: ctx.imageSmoothingEnabled
            };
        } catch (e) {
            console.error('捕获上下文状态失败:', e);
            return null;
        }
    }

    // 比较两个状态对象，返回差异
    _compareStates(state1, state2) {
        if (!state1 || !state2) return '无法比较状态';
        
        const differences = {};
        
        for (const key in state1) {
            if (key === 'transform') {
                if (state1[key] && state2[key]) {
                    // 比较变换矩阵
                    const t1 = state1[key];
                    const t2 = state2[key];
                    
                    if (t1.a !== t2.a || t1.b !== t2.b || t1.c !== t2.c || 
                        t1.d !== t2.d || t1.e !== t2.e || t1.f !== t2.f) {
                        differences[key] = {
                            from: `matrix(${t1.a}, ${t1.b}, ${t1.c}, ${t1.d}, ${t1.e}, ${t1.f})`,
                            to: `matrix(${t2.a}, ${t2.b}, ${t2.c}, ${t2.d}, ${t2.e}, ${t2.f})`
                        };
                    }
                }
            } else if (state1[key] !== state2[key]) {
                differences[key] = {
                    from: state1[key],
                    to: state2[key]
                };
            }
        }
        
        return Object.keys(differences).length > 0 ? differences : '没有差异';
    }

    // 打印监控摘要
    _printSummary() {
        console.log('=== Canvas上下文监控摘要 ===');
        console.log(`总save()调用次数: ${this.saveCount}`);
        console.log(`总restore()调用次数: ${this.restoreCount}`);
        
        if (this.saveCount > this.restoreCount) {
            console.warn(`警告: save()调用次数多于restore()调用次数，差值: ${this.saveCount - this.restoreCount}`);
        } else if (this.restoreCount > this.saveCount) {
            console.warn(`警告: restore()调用次数多于save()调用次数，差值: ${this.restoreCount - this.saveCount}`);
        }
        
        if (this.saveRestoreStack.length > 0) {
            console.warn(`警告: 有 ${this.saveRestoreStack.length} 个save()调用没有对应的restore()`);
            this.saveRestoreStack.forEach((item, index) => {
                console.warn(`未匹配的save() #${index + 1}:`, item.stack);
            });
        }
        
        console.log('========================');
    }
} 