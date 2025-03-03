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
  
  // 添加触摸调试信息
  const touchDebug = document.getElementById('touch-debug');
  if (touchDebug) {
    touchDebug.textContent = 'Touch: waiting...';
  }
  
  // 调试触摸事件
  document.body.addEventListener('touchstart', function(e) {
    if (touchDebug) {
      touchDebug.textContent = 'Touch: detected!';
      touchDebug.style.backgroundColor = 'rgba(0,255,0,0.5)';
      
      // 3秒后重置状态，便于观察后续触摸
      setTimeout(() => {
        touchDebug.textContent = 'Touch: waiting...';
        touchDebug.style.backgroundColor = 'rgba(0,0,0,0.5)';
      }, 3000);
    }
    console.log('Touch event detected', e);
    // 不阻止事件传播，让 Konva 能够处理
  }, {passive: true});
  
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

// 阻止双指缩放
window.addEventListener('touchmove', function(e) {
    if (e.touches.length > 1) {
        // 仅当有多个触摸点时阻止默认行为，这通常是缩放手势
        // 但不阻止事件传播，让 Konva 能够处理多点触摸
    }
}, {passive: true});

// preinit DrawingApp
const myDrawingApp = new DrawingApp('a4-table');

console.log((typeof myDrawingApp))

initDebugbar();
