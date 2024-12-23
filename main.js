import DrawingApp from "./app.js";

import './style.css'
import React from 'react';
import ReactDOM from 'react-dom';
import initDebugbar from "./debug.jsx";
// let DEBUG_INFO = console.log;

var theme = {
    background_color: "#dff"
}

// 阻止 全局网页缩放
window.addEventListener('wheel', function (event) {
    event.preventDefault();
}, { passive: false });

window.DebugBarComponentRef

// preinit DrawingApp

const myDrawingApp = new DrawingApp('a4-table');

console.log((typeof myDrawingApp))

initDebugbar();
