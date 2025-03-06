import DrawingApp from "./app.js";

import './style.css'
import React from 'react';
import ReactDOM from 'react-dom';
import initDebugbar from "./debug.jsx";
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

// preinit DrawingApp
const myDrawingApp = new DrawingApp('a4-table');

console.log((typeof myDrawingApp))

initDebugbar();
