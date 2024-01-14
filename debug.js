import Konva from "konva";

// function

// 创建一个文本框用于显示调试信息
var debugText = new Konva.Text({
    x: 10,
    y: 10,
    fontFamily: "Arial",
    fontSize: 16,
    fill: "red",
});

layer.add(debugText);
