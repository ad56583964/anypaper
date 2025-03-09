import './style.css'
import React from 'react';
import ReactDOM from 'react-dom';
import initDebugbar from "./debug.jsx";
import PixiTable from './src/pixi/PixiTable';
import PixiPencilTool from './src/pixi/tools/PixiPencilTool';
import PixiZoomTool from './src/pixi/tools/PixiZoomTool';
// let DEBUG_INFO = console.log;

var theme = {
    background_color: "#dff"
}

// 阻止浏览器缩放
window.addEventListener('wheel', function (event) {
    if (event.ctrlKey) {
        event.preventDefault(); // 阻止 Ctrl+滚轮 缩放
    }
}, { passive: false });

// 初始化 PixiTable
document.addEventListener('DOMContentLoaded', () => {
    // 创建 PixiTable 实例
    const table = new PixiTable('a4-table');
    
    // 创建工具
    const pencilTool = new PixiPencilTool(table);
    const zoomTool = new PixiZoomTool(table);
    
    // 注册工具
    table.registerTool('pencil', pencilTool);
    table.registerTool('zoom', zoomTool);
    
    // 设置默认工具
    table.setActiveTool('pencil');
    
    // 添加键盘事件监听
    document.addEventListener('keydown', (e) => {
        // Escape 键退出缩放模式
        if (e.key === 'Escape' && zoomTool.isZoomMode) {
            zoomTool.exitZoomMode();
        }
        
        // Z 键切换缩放模式
        if (e.key === 'z' || e.key === 'Z') {
            if (zoomTool.isZoomMode) {
                zoomTool.exitZoomMode();
            } else {
                zoomTool.enterZoomMode();
            }
        }
        
        // P 键切换到铅笔工具
        if (e.key === 'p' || e.key === 'P') {
            if (zoomTool.isZoomMode) {
                zoomTool.exitZoomMode();
            }
            table.setActiveTool('pencil');
        }
    });
    
    // 将 table 实例暴露到全局，方便调试
    window.pixiTable = table;
    
    console.log('PixiTable initialized');
    
    // 初始化调试栏
    initDebugbar();
});
