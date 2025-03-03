import Table from "./table";

export default function DrawingApp() {
    // 禁用浏览器默认的触摸行为，以便我们自己处理
    document.body.style.touchAction = 'none';
    document.body.style.overscrollBehavior = 'none';
    
    // 阻止浏览器默认的双指缩放
    document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('gesturechange', function(e) {
        e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('gestureend', function(e) {
        e.preventDefault();
    }, { passive: false });

    // 阻止双击缩放
    document.addEventListener('dblclick', function(e) {
        e.preventDefault();
    }, { passive: false });

    // 创建表格实例
    const table = new Table();
    
    // 添加调试信息
    console.log("DrawingApp initialized with touch events configured");
}
