import React from 'react';
import ReactDOM from 'react-dom/client';

// function
const DebugBar = React.forwardRef(function DebugBar(props, ref) {
    const [mousePosition,setMousePosition] = React.useState({x:0,y:0});
    
    React.useImperativeHandle(ref, () => ({
        updateMousePosition: (_x, _y) => setMousePosition({ x: _x, y: _y })
    }));

    return (
        <div>
            <p>Mouse Position</p>
            <p>X: {mousePosition.x} </p>
            <p>X: {mousePosition.x} </p>
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
