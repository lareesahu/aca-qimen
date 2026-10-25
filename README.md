# 鼠鼠阿仓奇门排盘 · 网页版

时家转盘 · 拆补法定局。奇门遁甲九宫排盘，纯前端计算，不联网、不上传。

原 Windows 桌面版（Electron，v0.64 测试版）里的 `index.html` 直接搬到网页：
同一套排盘逻辑、同样的九宫盘面，加上手机端排版、自托管字体（不再依赖飞书 CDN）、
PWA manifest 与离线缓存。

## 在线

https://lareesahu.github.io/aca-qimen/

## 本地

```bash
python -m http.server 8099
# http://127.0.0.1:8099
```

## 结构

- `index.html` — 全部界面与排盘逻辑（单文件）
- `assets/fonts/` — 思源宋体 / 思源黑体子集（woff2，自托管）
- `assets/icons/` — 图标（含 180 / 192 / 512 用于 PWA）
- `manifest.webmanifest`、`sw.js` — 可「添加到主屏幕」，二次打开走离线缓存

## 说明

- 桌面版原始发行包不在本仓库内。
- 排盘规则：值符随时干，值使随时支；中五宫天禽寄坤二；23:00 子时用次日干支。
