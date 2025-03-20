import React from 'react';
import ReactDOM from 'react-dom/client';

// 调试信息管理器
class DebugManager {
    static instance = null;
    
    constructor() {
        this.subscribers = new Set();
        this.debugInfo = {
            ticker: {
                fps: 0,
                targetFPS: '不限制',
                deltaTime: 0,
                deltaMS: 0,
                speed: 1,
                active: '未启动'
            },
            mousePosition: { x: 0, y: 0 },
            deviceTracker: {
                lastEvent: 'none',
                deviceType: 'none',
                position: { x: 0, y: 0 },
                pressure: 0,
                tiltX: 0,
                tiltY: 0,
                timestamp: 0,
                pointerId: null,
                pointerType: 'none',
                isPrimary: false,
                buttons: 0
            }
        };
        // console.log('DebugManager initialized with:', this.debugInfo);
    }

    static getInstance() {
        if (!DebugManager.instance) {
            DebugManager.instance = new DebugManager();
        }
        return DebugManager.instance;
    }

    subscribe(callback) {
        // console.log('New subscriber added');
        this.subscribers.add(callback);
        // 立即通知新订阅者当前状态
        callback(this.debugInfo);
        return () => {
            // console.log('Subscriber removed');
            this.subscribers.delete(callback);
        };
    }

    updateInfo(category, data) {
        // console.log('Updating debug info:', category, data);
        this.debugInfo = {
            ...this.debugInfo,
            [category]: {
                ...this.debugInfo[category],
                ...data
            }
        };
        // console.log('New debug info state:', this.debugInfo);
        this.notifySubscribers();
    }

    notifySubscribers() {
        // console.log('Notifying', this.subscribers.size, 'subscribers');
        this.subscribers.forEach(callback => {
            try {
                callback(this.debugInfo);
            } catch (error) {
                // console.error('Error in subscriber callback:', error);
            }
        });
    }
}

// Debug Hook
function useDebugInfo() {
    const [debugInfo, setDebugInfo] = React.useState(() => {
        // console.log('Initial debug info:', DebugManager.getInstance().debugInfo);
        return DebugManager.getInstance().debugInfo;
    });

    React.useEffect(() => {
        // console.log('Setting up debug info subscription');
        const unsubscribe = DebugManager.getInstance().subscribe(newInfo => {
            // console.log('Received new debug info:', newInfo);
            setDebugInfo(newInfo);
        });
        
        return () => {
            // console.log('Cleaning up debug info subscription');
            unsubscribe();
        };
    }, []);

    return debugInfo;
}

// DebugBar Component
export const DebugBar = React.forwardRef(function DebugBar(props, ref) {
    const debugInfo = useDebugInfo();
    const [expanded, setExpanded] = React.useState({
        ticker: true,
        mousePosition: true,
        deviceTracker: true
    });
    
    React.useEffect(() => {
        // console.log('DebugBar rendered with:', debugInfo);
    }, [debugInfo]);

    const toggleSection = (section) => {
        setExpanded(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // 阻止默认的触摸事件，防止长按选择文本
    const preventTouchSelection = (e) => {
        e.preventDefault();
        return false;
    };
    
    // 组件挂载时添加触摸事件监听器
    React.useEffect(() => {
        const debugbarElement = document.getElementById('debugbar');
        if (debugbarElement) {
            debugbarElement.addEventListener('touchstart', preventTouchSelection, { passive: false });
            debugbarElement.addEventListener('touchmove', preventTouchSelection, { passive: false });
            debugbarElement.addEventListener('touchend', preventTouchSelection, { passive: false });
        }
        
        // 组件卸载时移除事件监听器
        return () => {
            if (debugbarElement) {
                debugbarElement.removeEventListener('touchstart', preventTouchSelection);
                debugbarElement.removeEventListener('touchmove', preventTouchSelection);
                debugbarElement.removeEventListener('touchend', preventTouchSelection);
            }
        };
    }, []);

    // 格式化时间戳为可读格式
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;
    };

    // 获取设备类型的中文名称和颜色
    const getDeviceTypeInfo = (deviceType) => {
        switch(deviceType) {
            case 'mouse':
                return { name: '鼠标', color: '#4CAF50' };
            case 'touch':
                return { name: '触摸', color: '#2196F3' };
            case 'pen':
                return { name: '手写笔', color: '#9C27B0' };
            case 'wheel':
                return { name: '滚轮', color: '#FF9800' };
            default:
                return { name: '未知', color: '#757575' };
        }
    };

    // 获取事件类型的中文名称
    const getEventName = (eventType) => {
        switch(eventType) {
            case 'pointerdown': return '指针按下';
            case 'pointermove': return '指针移动';
            case 'pointerup': return '指针抬起';
            case 'touchstart': return '触摸开始';
            case 'touchmove': return '触摸移动';
            case 'touchend': return '触摸结束';
            case 'wheel': return '滚轮事件';
            default: return eventType;
        }
    };

    const deviceInfo = getDeviceTypeInfo(debugInfo.deviceTracker.deviceType);

    return (
        <div style={{ 
            padding: '10px', 
            border: '1px solid #ccc',
            borderRadius: '8px',
            backgroundColor: '#f8f9fa',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            maxWidth: '400px',
            margin: '10px',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            WebkitTouchCallout: 'none',
            touchAction: 'none'
        }}>
            <h2 style={{ 
                margin: '0 0 15px 0', 
                color: '#333',
                borderBottom: '1px solid #ddd',
                paddingBottom: '8px',
                fontSize: '18px'
            }}>调试信息面板</h2>
            
            {/* Ticker 信息 */}
            <div style={{ marginBottom: '15px' }}>
                <div 
                    onClick={() => toggleSection('ticker')}
                    style={{ 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 'bold',
                        color: '#555'
                    }}
                >
                    <span style={{ 
                        transform: expanded.ticker ? 'rotate(90deg)' : 'rotate(0deg)',
                        display: 'inline-block',
                        marginRight: '5px',
                        transition: 'transform 0.2s'
                    }}>▶</span>
                    <h3 style={{ margin: '5px 0' }}>渲染信息</h3>
                </div>
                
                {expanded.ticker && (
                    <div style={{ 
                        padding: '8px', 
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        border: '1px solid #eee',
                        marginLeft: '15px'
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            marginBottom: '8px',
                            backgroundColor: '#4CAF5022',
                            padding: '5px',
                            borderRadius: '4px'
                        }}>
                            <div style={{ 
                                width: '12px', 
                                height: '12px', 
                                borderRadius: '50%', 
                                backgroundColor: '#4CAF50',
                                marginRight: '8px'
                            }}></div>
                            <span style={{ fontWeight: 'bold', color: '#4CAF50' }}>
                                {debugInfo.ticker.active}
                            </span>
                        </div>
                        
                        <p style={{ margin: '5px 0' }}>
                            <span style={{ fontWeight: 'bold' }}>FPS:</span> {debugInfo.ticker.fps}
                        </p>
                        <p style={{ margin: '5px 0' }}>
                            <span style={{ fontWeight: 'bold' }}>目标 FPS:</span> {debugInfo.ticker.targetFPS}
                        </p>
                        <p style={{ margin: '5px 0' }}>
                            <span style={{ fontWeight: 'bold' }}>Delta Time:</span> {debugInfo.ticker.deltaTime}
                        </p>
                        <p style={{ margin: '5px 0' }}>
                            <span style={{ fontWeight: 'bold' }}>Delta MS:</span> {debugInfo.ticker.deltaMS}
                        </p>
                        <p style={{ margin: '5px 0' }}>
                            <span style={{ fontWeight: 'bold' }}>速度:</span> {debugInfo.ticker.speed}
                        </p>
                    </div>
                )}
            </div>
            
            {/* 鼠标位置信息 */}
            <div style={{ marginBottom: '15px' }}>
                <div 
                    onClick={() => toggleSection('mousePosition')}
                    style={{ 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 'bold',
                        color: '#555'
                    }}
                >
                    <span style={{ 
                        transform: expanded.mousePosition ? 'rotate(90deg)' : 'rotate(0deg)',
                        display: 'inline-block',
                        marginRight: '5px',
                        transition: 'transform 0.2s'
                    }}>▶</span>
                    <h3 style={{ margin: '5px 0' }}>鼠标位置</h3>
                </div>
                
                {expanded.mousePosition && (
                    <div style={{ 
                        padding: '8px', 
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        border: '1px solid #eee',
                        marginLeft: '15px'
                    }}>
                        <p style={{ margin: '5px 0' }}>X: {debugInfo.mousePosition.x.toFixed(2)}</p>
                        <p style={{ margin: '5px 0' }}>Y: {debugInfo.mousePosition.y.toFixed(2)}</p>
                    </div>
                )}
            </div>
            
            {/* 设备追踪信息 */}
            <div style={{ marginBottom: '15px' }}>
                <div 
                    onClick={() => toggleSection('deviceTracker')}
                    style={{ 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 'bold',
                        color: '#555'
                    }}
                >
                    <span style={{ 
                        transform: expanded.deviceTracker ? 'rotate(90deg)' : 'rotate(0deg)',
                        display: 'inline-block',
                        marginRight: '5px',
                        transition: 'transform 0.2s'
                    }}>▶</span>
                    <h3 style={{ margin: '5px 0' }}>设备追踪</h3>
                </div>
                
                {expanded.deviceTracker && (
                    <div style={{ 
                        padding: '8px', 
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        border: '1px solid #eee',
                        marginLeft: '15px'
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            marginBottom: '8px',
                            backgroundColor: deviceInfo.color + '22',
                            padding: '5px',
                            borderRadius: '4px'
                        }}>
                            <div style={{ 
                                width: '12px', 
                                height: '12px', 
                                borderRadius: '50%', 
                                backgroundColor: deviceInfo.color,
                                marginRight: '8px'
                            }}></div>
                            <span style={{ fontWeight: 'bold', color: deviceInfo.color }}>
                                {deviceInfo.name}
                            </span>
                        </div>
                        
                        <p style={{ margin: '5px 0' }}>
                            <span style={{ fontWeight: 'bold' }}>事件类型:</span> {getEventName(debugInfo.deviceTracker.lastEvent)}
                        </p>
                        <p style={{ margin: '5px 0' }}>
                            <span style={{ fontWeight: 'bold' }}>位置:</span> X: {debugInfo.deviceTracker.position.x.toFixed(2)}, Y: {debugInfo.deviceTracker.position.y.toFixed(2)}
                        </p>
                        <p style={{ margin: '5px 0' }}>
                            <span style={{ fontWeight: 'bold' }}>Pointer ID:</span> {debugInfo.deviceTracker.pointerId}
                        </p>
                        
                        {debugInfo.deviceTracker.pointerType === 'pen' && (
                            <>
                                <p style={{ margin: '5px 0' }}>
                                    <span style={{ fontWeight: 'bold' }}>压力:</span> {debugInfo.deviceTracker.pressure.toFixed(3)}
                                </p>
                                <p style={{ margin: '5px 0' }}>
                                    <span style={{ fontWeight: 'bold' }}>倾斜角:</span> X: {debugInfo.deviceTracker.tiltX}°, Y: {debugInfo.deviceTracker.tiltY}°
                                </p>
                            </>
                        )}
                        
                        {debugInfo.deviceTracker.pointerType === 'wheel' && (
                            <>
                                <p style={{ margin: '5px 0' }}>
                                    <span style={{ fontWeight: 'bold' }}>Delta X:</span> {debugInfo.deviceTracker.deltaX}
                                </p>
                                <p style={{ margin: '5px 0' }}>
                                    <span style={{ fontWeight: 'bold' }}>Delta Y:</span> {debugInfo.deviceTracker.deltaY}
                                </p>
                                <p style={{ margin: '5px 0' }}>
                                    <span style={{ fontWeight: 'bold' }}>Ctrl 键:</span> {debugInfo.deviceTracker.ctrlKey ? '按下' : '未按下'}
                                </p>
                            </>
                        )}
                        
                        {debugInfo.deviceTracker.pointerType === 'touch' && debugInfo.deviceTracker.touchCount !== undefined && (
                            <p style={{ margin: '5px 0' }}>
                                <span style={{ fontWeight: 'bold' }}>触摸点数:</span> {debugInfo.deviceTracker.touchCount}
                            </p>
                        )}
                        
                        <p style={{ margin: '5px 0' }}>
                            <span style={{ fontWeight: 'bold' }}>是否主指针:</span> {debugInfo.deviceTracker.isPrimary ? '是' : '否'}
                        </p>
                        
                        {debugInfo.deviceTracker.buttons !== undefined && (
                            <p style={{ margin: '5px 0' }}>
                                <span style={{ fontWeight: 'bold' }}>按钮状态:</span> {debugInfo.deviceTracker.buttons}
                            </p>
                        )}
                        
                        <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                            <span style={{ fontWeight: 'bold' }}>时间戳:</span> {formatTimestamp(debugInfo.deviceTracker.timestamp)}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
});

// 导出调试管理器的更新方法
export const updateDebugInfo = (category, data) => {
    // console.log('updateDebugInfo called:', category, data);
    DebugManager.getInstance().updateInfo(category, data);
};

// 导出获取当前调试信息的方法
export const getDebugInfo = () => {
    return DebugManager.getInstance().debugInfo;
};

export default function initDebugbar() {
    // console.log('initDebugbar called');
    const debugbarElement = document.getElementById('debugbar');
    if (!debugbarElement) {
        // console.error('Debug bar element not found!');
        return;
    }
    
    // 添加全局样式，防止文本选择
    const style = document.createElement('style');
    style.textContent = `
        #debugbar, #debugbar * {
            user-select: none !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            -webkit-touch-callout: none !important;
        }
    `;
    document.head.appendChild(style);
    
    const debugbar = ReactDOM.createRoot(debugbarElement);
    const debugBarComponentRef = React.createRef();
    window.DebugBarComponentRef = debugBarComponentRef;
    
    debugbar.render(
        <React.StrictMode>
            <DebugBar ref={debugBarComponentRef} />
        </React.StrictMode>
    );
}
