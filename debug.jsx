import React from 'react';
import ReactDOM from 'react-dom/client';

// 调试信息管理器
class DebugManager {
    static instance = null;
    subscribers = new Set();
    debugInfo = {
        mousePosition: { x: 0, y: 0 },
        pixelRatio: {
            devicePixelRatio: window.devicePixelRatio,
            actualPixelRatio: 0
        },
        // 可以方便地添加更多调试信息类型
    };

    static getInstance() {
        if (!DebugManager.instance) {
            DebugManager.instance = new DebugManager();
        }
        return DebugManager.instance;
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    updateInfo(category, data) {
        this.debugInfo[category] = {
            ...this.debugInfo[category],
            ...data
        };
        this.notifySubscribers();
    }

    notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.debugInfo));
    }
}

// Debug Hook
function useDebugInfo() {
    const [debugInfo, setDebugInfo] = React.useState(DebugManager.getInstance().debugInfo);

    React.useEffect(() => {
        const unsubscribe = DebugManager.getInstance().subscribe(setDebugInfo);
        return unsubscribe;
    }, []);

    return debugInfo;
}

// DebugBar Component
const DebugBar = React.forwardRef(function DebugBar(props, ref) {
    const debugInfo = useDebugInfo();
    
    React.useImperativeHandle(ref, () => ({
        updateInfo: (category, data) => {
            DebugManager.getInstance().updateInfo(category, data);
        }
    }));

    return (
        <div>
            <div>
                <p>Mouse Position</p>
                <p>X: {debugInfo.mousePosition.x}</p>
                <p>Y: {debugInfo.mousePosition.y}</p>
            </div>
            <div>
                <p>Pixel Ratio Info</p>
                <p>Device Pixel Ratio: {debugInfo.pixelRatio.devicePixelRatio}</p>
                <p>Actual Cache Pixel Ratio: {debugInfo.pixelRatio.actualPixelRatio}</p>
            </div>
        </div>
    );
});

// 导出调试管理器的更新方法
export const updateDebugInfo = (category, data) => {
    DebugManager.getInstance().updateInfo(category, data);
};

export default function initDebugbar() {
    console.log('initDebugbar called');
    const debugbarElement = document.getElementById('debugbar');
    const debugbar = ReactDOM.createRoot(debugbarElement);

    const debugBarComponentRef = React.createRef();
    window.DebugBarComponentRef = debugBarComponentRef;
    debugbar.render(<DebugBar ref={debugBarComponentRef} />);
}
