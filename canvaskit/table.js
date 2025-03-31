import { CanvasKitInit } from 'canvaskit-wasm';
import { convertPointToLocalCoordinates } from './utils';
import CanvasPaper from './paper';
import CanvasPencilTool from '../tools/canvaskit-pencil-tool';

/**
 * CanvasTable 类 - 主要的表格组件
 * 使用CanvasKit替代原有的Pixi.js实现
 */
export default class CanvasTable {
    /**
     * 创建一个新的CanvasTable实例
     * @param {string} containerId - 容器元素的ID
     * @param {Object} options - 表格选项
     * @returns {Promise} - 初始化完成的Promise
     */
    constructor(containerId = 'a4-table', options = {}) {
        // 禁用整个文档的右键菜单
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });

        // 设置block大小
        this.block = {
            width: 40,
            height: 40,
        };
        
        // 平移状态
        this.panning = {
            active: false,
            startX: 0,
            startY: 0,
            lastX: 0,
            lastY: 0,
            touchStartTime: 0,
            touchStartDistance: 0,
            canStartPanning: false,
            isRightSide: false,
            accumulatedDx: 0,
            accumulatedDy: 0
        };
        
        // 固定paper的尺寸
        this.paperWidth = 3840;
        this.paperHeight = 2880;
        
        // 计算内容大小
        this.width = 240 * this.block.width;
        this.height = 240 * this.block.height;
        
        // 获取容器
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }
        
        console.log('CanvasTable constructor', containerId, this.width, this.height);
        
        // 使用Promise处理异步初始化
        return new Promise(async (resolve) => {
            try {
                // 初始化CanvasKit
                await this.initCanvasKit(container);
                
                // 初始化表格
                this.initTable();
                
                // 初始化工具
                this.initTools();
                
                // 创建光标指示器
                this.initPointer(options.pointerOptions);
                
                // 启动渲染循环
                this.startRenderLoop();
                
                resolve(this);
            } catch (error) {
                console.error('CanvasTable initialization error:', error);
            }
        });
    }
    
    /**
     * 初始化CanvasKit
     * @param {HTMLElement} container - 容器元素
     */
    async initCanvasKit(container) {
        // 初始化CanvasKit
        this.CanvasKit = await CanvasKitInit({
            // 指定CanvasKit WASM文件的位置
            locateFile: (file) => `node_modules/canvaskit-wasm/bin/${file}`,
        });
        
        // 创建Canvas元素
        this.canvas = document.createElement('canvas');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        container.appendChild(this.canvas);
        
        // 记录舞台尺寸
        this.stageWidth = window.innerWidth;
        this.stageHeight = window.innerHeight;
        
        // 创建CanvasKit Surface
        this.surface = this.CanvasKit.MakeCanvasSurface(this.canvas);
        if (!this.surface) {
            throw new Error('Could not make CanvasKit surface');
        }
        
        // 获取SkCanvas
        this.skCanvas = this.surface.getCanvas();
        
        // 设置图层的变换矩阵
        this.transform = { 
            scale: 1,
            translateX: 0,
            translateY: 0
        };
        
        // 设置图层清晰的矩阵
        this.matrix = this.CanvasKit.Matrix.identity();
        
        // 初始化交互管理器
        this.initInteraction();
        
        // 添加窗口大小变化监听
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // 跟踪活动的触摸点
        this.activePointers = new Map();
        
        // 事件监听器
        this.eventListeners = {};
        
        console.log('CanvasTable initCanvasKit complete', {
            width: this.stageWidth,
            height: this.stageHeight,
            devicePixelRatio: window.devicePixelRatio
        });
    }
    
    /**
     * 初始化表格
     */
    initTable() {
        // 初始化各个图层的绘制函数
        this.layers = {
            background: (canvas) => {
                // 背景层绘制逻辑
                if (this.paper) {
                    this.paper.draw(canvas);
                }
            },
            content: (canvas) => {
                // 内容层绘制逻辑
                if (this.drawingPaths && this.drawingPaths.length > 0) {
                    // 绘制所有路径
                    this.drawingPaths.forEach(path => {
                        if (path.paint && path.skPath) {
                            canvas.drawPath(path.skPath, path.paint);
                        }
                    });
                }
            },
            pointer: (canvas) => {
                // 指针层绘制逻辑
                if (this.pointer) {
                    this.pointer.draw(canvas);
                }
            }
        };
        
        // 初始化绘图路径数组
        this.drawingPaths = [];
        
        // 居中内容
        this.centerContent();
    }
    
    /**
     * 初始化工具
     */
    initTools() {
        // 创建Paper
        this.paper = new CanvasPaper(this);
        
        // 创建PencilTool
        this.pencilTool = new CanvasPencilTool(this);
    }
    
    /**
     * 初始化指针
     */
    initPointer(options) {
        // 实现光标指示器...
        console.log('Pointer initialized');
    }
    
    /**
     * 启动渲染循环
     */
    startRenderLoop() {
        const renderLoop = () => {
            // 清空画布
            this.skCanvas.clear(this.CanvasKit.WHITE);
            
            // 保存当前状态
            this.skCanvas.save();
            
            // 应用变换
            this.updateMatrix();
            this.skCanvas.concat(this.matrix);
            
            // 绘制背景层
            this.layers.background(this.skCanvas);
            
            // 绘制内容层
            this.layers.content(this.skCanvas);
            
            // 恢复状态（移除变换）
            this.skCanvas.restore();
            
            // 在原始坐标系中绘制指针层
            this.layers.pointer(this.skCanvas);
            
            // 刷新Surface
            this.surface.requestAnimationFrame(renderLoop);
        };
        
        // 启动渲染循环
        this.surface.requestAnimationFrame(renderLoop);
    }
    
    /**
     * 更新变换矩阵
     */
    updateMatrix() {
        this.matrix = this.CanvasKit.Matrix.identity();
        
        // 应用平移（保持内容居中）
        const centerX = (this.stageWidth - this.width * this.transform.scale) / 2;
        const centerY = (this.stageHeight - this.height * this.transform.scale) / 2;
        
        // 计算最终平移值
        const translateX = centerX + this.transform.translateX;
        const translateY = centerY + this.transform.translateY;
        
        // 应用变换：先平移后缩放
        this.CanvasKit.Matrix.translate(this.matrix, translateX, translateY);
        this.CanvasKit.Matrix.scale(this.matrix, this.transform.scale, this.transform.scale);
    }
    
    /**
     * 居中显示内容
     */
    centerContent() {
        // 重置变换
        this.transform.translateX = 0;
        this.transform.translateY = 0;
        
        // 更新矩阵
        this.updateMatrix();
    }
    
    /**
     * 处理窗口大小变化
     */
    handleResize() {
        // 更新画布大小
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // 更新舞台尺寸
        this.stageWidth = window.innerWidth;
        this.stageHeight = window.innerHeight;
        
        // 重新居中内容
        this.centerContent();
    }
    
    /**
     * 初始化交互管理器
     */
    initInteraction() {
        // 实现交互逻辑...
        console.log('Interaction initialized');
    }
    
    /**
     * 调整视图以使Paper居中
     */
    centerViewOnPaper() {
        if (this.paper) {
            this.paper.centerInView();
        }
    }
}
