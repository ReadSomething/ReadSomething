# ReadLite - 简洁阅读模式

一款提供清爽无干扰阅读体验的浏览器扩展，具备 AI 文章摘要功能。

![ReadLite截图](assets/screenshot.png)

## 功能特色

- **干净的阅读界面**：将杂乱的网页转换为美观、无干扰的阅读体验
- **AI文章摘要**：获取即时摘要和对正在阅读内容的见解
- **多种主题**：可选择亮色、暗色、棕褐色和纸张模式，满足个人偏好
- **可调整排版**：自定义字体大小、行间距和页面宽度，获得最佳阅读舒适度
- **文章保存**：将文章保存为markdown格式供离线阅读


## 使用方法

1. 从Chrome网上应用店安装扩展（即将推出）
2. 浏览任何文章或博客帖子
3. 点击浏览器工具栏中的ReadLite图标
4. 享受清爽的阅读体验
5. 使用AI按钮获取摘要或提问关于文章的问题

## 开发

### 前提条件
- Node.js (v16+)
- Yarn或npm

### 安装
```bash
# 克隆仓库
git clone https://github.com/yourusername/read-lite.git
cd read-lite

# 安装依赖
yarn install

# 启动开发服务器
yarn dev
```

### 生产构建
```bash
yarn build
```

## 技术细节

本扩展使用以下技术构建：
- [Plasmo Framework](https://www.plasmo.com/) - 浏览器扩展框架
- [React](https://reactjs.org/) - UI库
- [Mozilla Readability](https://github.com/mozilla/readability) - 内容提取
- [Marked](https://marked.js.org/) - Markdown解析

## 许可证

MIT

## 其他语言

- [English](./README.md) 