import React from 'react';
import ReactDOM from 'react-dom/client';

// function
const DebugBar = React.forwardRef(function DebugBar(props, ref) {
    const [mousePosition, setMousePosition] = React.useState({x:0, y:0});
    const [pixelRatioInfo, setPixelRatioInfo] = React.useState({
        devicePixelRatio: window.devicePixelRatio,
        actualPixelRatio: 0
    });
    
    React.useImperativeHandle(ref, () => ({
        updateMousePosition: (_x, _y) => setMousePosition({ x: _x, y: _y }),
        updatePixelRatioInfo: (deviceRatio, actualRatio) => setPixelRatioInfo({
            devicePixelRatio: deviceRatio,
            actualPixelRatio: actualRatio
        })
    }));

    // 这里是 debug 信息的填入区域
    return (
        <div>
            <div>
                <p>Mouse Position</p>
                <p>X: {mousePosition.x}</p>
                <p>Y: {mousePosition.y}</p>
            </div>
            <div>
                <p>Pixel Ratio Info</p>
                <p>Device Pixel Ratio: {pixelRatioInfo.devicePixelRatio}</p>
                <p>Actual Cache Pixel Ratio: {pixelRatioInfo.actualPixelRatio}</p>
            </div>
        </div>
    );
})

export default function initDebugbar() {
    console.log('initDebugbar called');
    // 获取根节点
    const debugbarElement = document.getElementById('debugbar');
    const debugbar = ReactDOM.createRoot(debugbarElement);
    // 渲染应用

    const debugBarComponentRef = React.createRef();

    window.DebugBarComponentRef = debugBarComponentRef;

    debugbar.render(<DebugBar ref={debugBarComponentRef} />);
}
