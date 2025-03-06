import DrawingApp from "./app.js";

import './style.css'
import React from 'react';
import ReactDOM from 'react-dom';
import initDebugbar from "./debug.jsx";
// let DEBUG_INFO = console.log;

// 生成一个随机哈希值作为版本标识
const versionHash = Math.random().toString(36).substring(2, 8) + '-' + new Date().toISOString().replace(/[-:.TZ]/g, '').substring(0, 12);

// 显示版本哈希
document.addEventListener('DOMContentLoaded', function() {
  const versionElement = document.getElementById('version-hash');
  if (versionElement) {
    versionElement.textContent = 'v: ' + versionHash;
  }
  
  // 禁用浏览器的默认触摸行为，但保留基本的触摸功能
  document.addEventListener('touchmove', function(e) {
    // 如果不是在 canvas 上的触摸，则阻止默认行为
    if (e.target.tagName !== 'CANVAS') {
      e.preventDefault();
    }
  }, {passive: false});
  
  console.log('DOM fully loaded and parsed');
  console.log('Touch enabled: ' + ('ontouchstart' in window));
  console.log('Version hash: ' + versionHash);
});

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
