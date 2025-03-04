// 自定义 Konva 入口文件
// 直接从 _CoreInternals.ts 导入 Konva 对象

import { Konva } from './_CoreInternals';

// 导入形状
import { Arc } from './shapes/Arc';
import { Arrow } from './shapes/Arrow';
import { Circle } from './shapes/Circle';
import { Ellipse } from './shapes/Ellipse';
import { Image } from './shapes/Image';
import { Label } from './shapes/Label';
import { Line } from './shapes/Line';
import { Path } from './shapes/Path';
import { Rect } from './shapes/Rect';
import { RegularPolygon } from './shapes/RegularPolygon';
import { Ring } from './shapes/Ring';
import { Sprite } from './shapes/Sprite';
import { Star } from './shapes/Star';
import { Text } from './shapes/Text';
import { TextPath } from './shapes/TextPath';
import { Transformer } from './shapes/Transformer';
import { Wedge } from './shapes/Wedge';

// 导入滤镜
import { Blur } from './filters/Blur';
import { Brighten } from './filters/Brighten';
import { Contrast } from './filters/Contrast';
import { Emboss } from './filters/Emboss';
import { Enhance } from './filters/Enhance';
import { Grayscale } from './filters/Grayscale';
import { HSL } from './filters/HSL';
import { HSV } from './filters/HSV';
import { Invert } from './filters/Invert';
import { Kaleidoscope } from './filters/Kaleidoscope';
import { Mask } from './filters/Mask';
import { Noise } from './filters/Noise';
import { Pixelate } from './filters/Pixelate';
import { Posterize } from './filters/Posterize';
import { RGB } from './filters/RGB';
import { RGBA } from './filters/RGBA';
import { Sepia } from './filters/Sepia';
import { Solarize } from './filters/Solarize';
import { Threshold } from './filters/Threshold';

// 将形状和滤镜添加到 Konva 对象
Object.assign(Konva, {
  // 形状
  Arc,
  Arrow,
  Circle,
  Ellipse,
  Image,
  Label,
  Line,
  Path,
  Rect,
  RegularPolygon,
  Ring,
  Sprite,
  Star,
  Text,
  TextPath,
  Transformer,
  Wedge,
  
  // 滤镜
  Blur,
  Brighten,
  Contrast,
  Emboss,
  Enhance,
  Grayscale,
  HSL,
  HSV,
  Invert,
  Kaleidoscope,
  Mask,
  Noise,
  Pixelate,
  Posterize,
  RGB,
  RGBA,
  Sepia,
  Solarize,
  Threshold
});

// 导出 Konva 对象
export default Konva;

// 导出单独的组件，以便可以单独导入
export {
  Konva,
  // 形状
  Arc,
  Arrow,
  Circle,
  Ellipse,
  Image,
  Label,
  Line,
  Path,
  Rect,
  RegularPolygon,
  Ring,
  Sprite,
  Star,
  Text,
  TextPath,
  Transformer,
  Wedge,
  
  // 滤镜
  Blur,
  Brighten,
  Contrast,
  Emboss,
  Enhance,
  Grayscale,
  HSL,
  HSV,
  Invert,
  Kaleidoscope,
  Mask,
  Noise,
  Pixelate,
  Posterize,
  RGB,
  RGBA,
  Sepia,
  Solarize,
  Threshold
}; 