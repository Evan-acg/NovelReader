# Universal Novel Reader

[![Greasy Fork](https://img.shields.io/greasyfork/dt/universal-novel-reader?label=Greasy%20Fork)](https://greasyfork.org/scripts/)
[![GitHub release](https://img.shields.io/github/v/release/Evan-acg/NovelReader)](https://github.com/Evan-acg/NovelReader/releases)

跨站小说阅读脚本 — 统一阅读样式，内容去广告、修正拼音字、段落整理，自动下一页。

## 功能

- 跨站通用 — 基于规则引擎，支持大量小说站点
- 统一阅读样式 — 字体、字号、行高、宽度、皮肤自由调节
- 广告净化 — 自动移除广告及干扰元素
- 拼音字修正 — 自动修正常见拼音替代字
- 繁简转换 — 支持简繁互换
- 自动下一页 — 无缝加载下一章
- 键盘快捷键 — 翻页、唤出设置
- 自定义规则 — 可编写站点级和文本替换规则

## 安装

- **[Greasy Fork](https://greasyfork.org/)** — 搜索 "Universal Novel Reader" 安装
- **手动安装** — 从 [Releases](https://github.com/Evan-acg/NovelReader/releases) 下载 `.user.js`

安装后打开任意小说网页，脚本自动启动进入阅读模式。

## 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化并自动构建）
npm run dev

# 类型检查
npm run typecheck

# 测试
npm test

# 生产构建
npm run build
```

构建产物位于 `dist/novel-reader.user.js`。

## 发布

推 tag 后 CI 自动完成：

```bash
npm version <major|minor|patch>
git push --follow-tags
```

- 创建 GitHub Release 并上传构建产物
- 更新 `dist` 分支，Greasy Fork 自动同步

## 许可证

GPL v3
