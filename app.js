import Table from "./table";

export default function DrawingApp() {
    // 禁用原生缩放，但允许 Konva 处理触摸事件
    document.body.style.touchAction = 'manipulation'; // 允许点击和滚动，但禁用缩放
    document.body.style.overscrollBehavior = 'none'; // 防止页面滚动
    
    // 禁用双指缩放
    document.addEventListener('gesturestart', function(e) {
        e.preventDefault(); // 阻止默认的双指缩放手势
    }, { passive: false });
    
    document.addEventListener('gesturechange', function(e) {
        e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('gestureend', function(e) {
        e.preventDefault();
    }, { passive: false });

    const table = new Table()
}
