// 自适应DPR计算工具 - 为不同设备计算统一的实际渲染像素
import Konva from '../src/konva';

export default class AdaptiveDpr {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            targetPixelCount: 2000000, // 目标像素数量（约200万像素，相当于1080p的一半）
            minDpr: 0.75,              // 最小DPR值
            maxDpr: 2.0,               // 最大DPR值
            defaultDpr: 1.0,           // 默认DPR值
            ...options
        };
        
        // 设备信息
        this.deviceInfo = this.collectDeviceInfo();
        
        // 计算最佳DPR
        this.optimalDpr = this.calculateOptimalDpr();
        
        // 记录原始DPR
        this.originalDpr = window.devicePixelRatio;
    }
    
    // 收集设备信息
    collectDeviceInfo() {
        return {
            // 设备像素比
            dpr: window.devicePixelRatio,
            
            // 屏幕尺寸
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            
            // 视口尺寸
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            
            // 估算物理尺寸（英寸）
            estimatedScreenDiagonal: this.estimateScreenSize(),
            
            // 设备类型
            deviceType: this.detectDeviceType(),
            
            // 性能等级
            performanceLevel: this.detectPerformanceLevel()
        };
    }
    
    // 估算屏幕物理尺寸（对角线英寸）
    estimateScreenSize() {
        // 获取设备像素比和屏幕分辨率
        const dpr = window.devicePixelRatio || 1;
        const width = window.screen.width * dpr;
        const height = window.screen.height * dpr;
        
        // 估算对角线像素数
        const diagonalPixels = Math.sqrt(width * width + height * height);
        
        // 估算对角线英寸（假设平均PPI为96*DPR）
        // 这只是一个粗略估计，实际PPI因设备而异
        const estimatedPPI = 96 * dpr;
        const diagonalInches = diagonalPixels / estimatedPPI;
        
        return diagonalInches;
    }
    
    // 检测设备类型
    detectDeviceType() {
        const ua = navigator.userAgent;
        const screenDiagonal = this.estimateScreenSize();
        
        // 检测移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        
        if (!isMobile) {
            return 'desktop';
        }
        
        // 根据屏幕尺寸区分手机和平板
        if (screenDiagonal < 7) {
            return 'phone';
        } else if (screenDiagonal >= 7 && screenDiagonal < 13) {
            return 'tablet';
        } else {
            return 'large-tablet';
        }
    }
    
    // 检测设备性能等级
    detectPerformanceLevel() {
        // 检查硬件并发数（CPU核心数）
        const cores = navigator.hardwareConcurrency || 1;
        
        // 检查设备内存（如果可用）
        const memory = navigator.deviceMemory || 1;
        
        // 简单性能评分
        let performanceScore = (cores * 0.6) + (memory * 0.4);
        
        // 根据分数确定性能等级
        if (performanceScore < 2) {
            return 'low';
        } else if (performanceScore < 4) {
            return 'medium';
        } else {
            return 'high';
        }
    }
    
    // 计算最佳DPR
    calculateOptimalDpr() {
        // 获取视口尺寸
        const { viewportWidth, viewportHeight } = this.deviceInfo;
        
        // 计算视口面积（逻辑像素）
        const viewportArea = viewportWidth * viewportHeight;
        
        // 计算理想DPR：使得实际渲染像素接近目标像素数
        let idealDpr = Math.sqrt(this.options.targetPixelCount / viewportArea);
        
        // 根据设备类型调整
        const { deviceType, performanceLevel } = this.deviceInfo;
        
        // 设备类型调整系数
        const deviceFactor = {
            'phone': 0.8,      // 手机降低DPR以提高性能
            'tablet': 1.0,     // 平板使用标准DPR
            'large-tablet': 1.1, // 大平板略微提高DPR
            'desktop': 1.2     // 桌面设备可以使用更高DPR
        }[deviceType] || 1.0;
        
        // 性能等级调整系数
        const performanceFactor = {
            'low': 0.7,      // 低性能设备大幅降低DPR
            'medium': 0.9,   // 中等性能设备略微降低DPR
            'high': 1.1      // 高性能设备可以使用更高DPR
        }[performanceLevel] || 1.0;
        
        // 应用调整系数
        idealDpr = idealDpr * deviceFactor * performanceFactor;
        
        // 确保DPR在允许范围内
        const finalDpr = Math.max(
            this.options.minDpr,
            Math.min(this.options.maxDpr, idealDpr)
        );
        
        // 四舍五入到小数点后一位，避免过于精细的调整
        return Math.round(finalDpr * 10) / 10;
    }
    
    // 应用最佳DPR到舞台
    applyToStage(stage) {
        if (!stage) {
            console.error('无效的舞台对象');
            return false;
        }
        
        try {
            console.log(`应用自适应DPR: ${this.optimalDpr.toFixed(2)} (原始: ${this.originalDpr})`);
            
            // 获取所有图层
            const layers = stage.getLayers();
            
            if (!layers || layers.length === 0) {
                console.error('没有找到图层');
                return false;
            }
            
            // 应用新的DPR到每个Canvas
            layers.forEach((layer, index) => {
                const canvas = layer.getCanvas();
                if (!canvas || !canvas._canvas) {
                    console.error(`图层 ${index} 没有有效的Canvas`);
                    return;
                }
                
                // 获取当前尺寸
                const width = canvas.width / canvas.getPixelRatio();
                const height = canvas.height / canvas.getPixelRatio();
                
                // 设置新的像素比
                canvas.setPixelRatio(this.optimalDpr);
                
                // 重新设置尺寸以应用新的像素比
                canvas.setSize(width, height);
            });
            
            // 重新绘制舞台
            stage.batchDraw();
            
            // 记录应用结果
            this.logApplicationResult(stage);
            
            return true;
        } catch (error) {
            console.error('应用自适应DPR时出错:', error);
            return false;
        }
    }
    
    // 记录应用结果
    logApplicationResult(stage) {
        // 计算实际渲染像素
        const layers = stage.getLayers();
        let totalPixels = 0;
        
        layers.forEach(layer => {
            const canvas = layer.getCanvas();
            if (canvas && canvas._canvas) {
                totalPixels += canvas._canvas.width * canvas._canvas.height;
            }
        });
        
        // 记录详细信息
        console.log('自适应DPR应用结果:', {
            deviceInfo: this.deviceInfo,
            originalDpr: this.originalDpr,
            calculatedDpr: this.optimalDpr,
            targetPixels: this.options.targetPixelCount,
            actualPixels: totalPixels,
            pixelRatio: (totalPixels / this.options.targetPixelCount).toFixed(2)
        });
    }
    
    // 恢复原始DPR
    restoreOriginalDpr(stage) {
        if (!stage) {
            console.error('无效的舞台对象');
            return false;
        }
        
        try {
            console.log(`恢复原始DPR: ${this.originalDpr}`);
            
            // 获取所有图层
            const layers = stage.getLayers();
            
            if (!layers || layers.length === 0) {
                console.error('没有找到图层');
                return false;
            }
            
            // 应用原始DPR到每个Canvas
            layers.forEach((layer, index) => {
                const canvas = layer.getCanvas();
                if (!canvas || !canvas._canvas) {
                    console.error(`图层 ${index} 没有有效的Canvas`);
                    return;
                }
                
                // 获取当前尺寸
                const width = canvas.width / canvas.getPixelRatio();
                const height = canvas.height / canvas.getPixelRatio();
                
                // 设置原始像素比
                canvas.setPixelRatio(this.originalDpr);
                
                // 重新设置尺寸以应用原始像素比
                canvas.setSize(width, height);
            });
            
            // 重新绘制舞台
            stage.batchDraw();
            
            return true;
        } catch (error) {
            console.error('恢复原始DPR时出错:', error);
            return false;
        }
    }
    
    // 获取设备信息摘要
    getDeviceInfoSummary() {
        const { dpr, screenWidth, screenHeight, estimatedScreenDiagonal, deviceType, performanceLevel } = this.deviceInfo;
        
        return {
            deviceType,
            performanceLevel,
            screenSize: `${screenWidth}x${screenHeight}`,
            estimatedScreenSize: `${estimatedScreenDiagonal.toFixed(1)}英寸`,
            originalDpr: dpr,
            optimalDpr: this.optimalDpr
        };
    }
} 