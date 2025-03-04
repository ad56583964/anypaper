import React from 'react';
import ReactDOM from 'react-dom/client';

// 调试信息管理器
class DebugManager {
    static instance = null;
    
    constructor() {
        this.subscribers = new Set();
        this.debugInfo = {
            mousePosition: { x: 0, y: 0 },
            pixelRatio: {
                devicePixelRatio: window.devicePixelRatio,
                actualPixelRatio: 0
            },
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
    
    React.useEffect(() => {
        // console.log('DebugBar rendered with:', debugInfo);
    }, [debugInfo]);

    return (
        <div style={{ padding: '10px', border: '1px solid #ccc' }}>
            <div>
                <h3>Mouse Position</h3>
                <p>X: {debugInfo.mousePosition.x.toFixed(2)}</p>
                <p>Y: {debugInfo.mousePosition.y.toFixed(2)}</p>
            </div>
            <div>
                <h3>Pixel Ratio Info</h3>
                <p>Device Pixel Ratio: {debugInfo.pixelRatio.devicePixelRatio}</p>
                <p>Actual Cache Pixel Ratio: {debugInfo.pixelRatio.actualPixelRatio}</p>
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
    
    const debugbar = ReactDOM.createRoot(debugbarElement);
    const debugBarComponentRef = React.createRef();
    window.DebugBarComponentRef = debugBarComponentRef;
    
    debugbar.render(
        <React.StrictMode>
            <DebugBar ref={debugBarComponentRef} />
        </React.StrictMode>
    );
}
