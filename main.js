import './style.css'
import React from 'react';
import ReactDOM from 'react-dom';
import initDebugbar from "./debug.jsx";
import PixiTable from './pixi/PixiTable';

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
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 创建 PixiTable 实例并等待初始化完成
        const table = await new PixiTable('a4-table');
        
        // 将 table 实例暴露到全局，方便调试
        window.pixiTable = table;
        
        // 初始化调试栏
        initDebugbar();
        
        console.log('Application initialized');
    } catch (error) {
        console.error('Application initialization error:', error);
    }
});
