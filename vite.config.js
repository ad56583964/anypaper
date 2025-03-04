import { defineConfig } from 'vite';

export default defineConfig({
  // 启用 TypeScript 支持
  esbuild: {
    // 允许处理 .ts 文件
    include: /\.(tsx?|jsx?)$/,
    // 排除 node_modules 目录
    exclude: ['node_modules/**'],
  },
  // 解析别名
  resolve: {
    alias: {
      // 如果需要，可以添加别名
    },
    // 添加 .ts 扩展名支持
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  // 开发服务器配置
  server: {
    // 启用热更新
    hmr: true,
  },
  // 构建配置
  build: {
    // 输出目录
    outDir: 'dist',
    // 启用源码映射
    sourcemap: true,
    // 压缩代码
    minify: 'terser',
    // Terser 配置
    terserOptions: {
      // 移除 console.log
      compress: {
        drop_console: false, // 在开发阶段保留 console.log，在生产环境可以设置为 true
      },
    },
  },
  // 优化依赖
  optimizeDeps: {
    // 包含需要预构建的依赖
    include: ['perfect-freehand'],
    // 排除本地 Konva
    exclude: ['konva']
  },
}); 