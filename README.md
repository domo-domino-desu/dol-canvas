# dol-canvas

`dol-canvas` 是一个用于渲染 Degrees of Lewdity 风格角色立绘的 Canvas 库，提供中文 payload API，并内置 Vue 组件封装。

默认资源地址使用 testingcf.jsdelivr CDN：

```text
https://testingcf.jsdelivr.net/gh/domo-domino-desu/dol-canvas@main/img/
```

## Vue 使用

```vue
<template>
  <DolCanvas :payload="payload" :size="256" :animate="true" />
</template>

<script setup lang="ts">
import { DolCanvas } from "dol-canvas/vue";
import type { CharacterPayload } from "dol-canvas";

const payload: CharacterPayload = {
  身形: "经典",
  胸部: 3,
  左臂: "idle",
  右臂: "idle",
  发型: {
    发型: "自然状态",
    长度: "及肩",
    刘海: "自然状态",
  },
  发色: "红色",
  仪态: "温柔",
  眼睛: {
    左眼瞳色: "紫色",
    右眼瞳色: "紫色",
  },
  眉毛: "中",
  嘴部: "微笑",
  脸红程度: 1,
  衣物: {
    上装: { 名称: "连衣太阳裙", 主色调: "white", 耐久度: "full" },
    下装: { 名称: "连衣太阳裙", 主色调: "white", 耐久度: "full" },
    内衣下装: { 名称: "普通内裤", 主色调: "pale white", 耐久度: "full" },
    头饰: { 名称: "发卡", 主色调: "white", 耐久度: "full" },
    鞋子: { 名称: "校服鞋", 耐久度: "full" },
    腿饰: { 名称: "女式运动袜", 耐久度: "full" },
  },
};
</script>
```

也可以作为 Vue 插件注册：

```ts
import { createApp } from "vue";
import DolCanvasPlugin from "dol-canvas/vue";
import App from "./App.vue";

createApp(App).use(DolCanvasPlugin).mount("#app");
```

## 原生 Canvas 使用

```ts
import { DolCanvas, type CharacterPayload } from "dol-canvas";

const canvas = document.querySelector("canvas")!;
const renderer = new DolCanvas(canvas);

const payload: CharacterPayload = {
  发型: { 发型: "自然状态", 长度: "及肩", 刘海: "自然状态" },
  发色: "红色",
  眼睛: { 左眼瞳色: "紫色", 右眼瞳色: "紫色" },
  ……
};

await renderer.render(payload);
```

启用动画：

```ts
await renderer.startAnimation(payload);
renderer.stopAnimation();
```

## 资源地址

默认会从 CDN 加载 `img/` 资源。如果需要自托管图片，可以传入 `baseUrl`：

```vue
<DolCanvas :payload="payload" base-url="/assets/dol-img/" />
```

或全局配置：

```ts
import { DolCanvas } from "dol-canvas";

DolCanvas.configure({
  baseUrl: "/assets/dol-img/",
});
```

`baseUrl` 需要指向包含 `body/`、`clothes/`、`hair/`、`face/` 等目录的资源根路径。

## Payload 说明

主要字段：

- `身形`：`经典`、`瘦长`、`曲线`、`柔软`
- `胸部`：`0` 到 `6`
- `左臂`：`idle`、`cover`
- `右臂`：`idle`、`cover`、`hold`
- `发型`：可以是字符串，也可以是 `{ 发型, 长度, 刘海 }`
- `发色`：使用内置发色中文名
- `眼睛`：只使用 `左眼瞳色`、`右眼瞳色`
- `衣物`：按槽位填写，例如 `上装`、`下装`、`内衣下装`、`头饰`、`鞋子`、`腿饰`

衣物颜色字段可以使用：

- `主色调`
- `第二色调`

衣物耐久度支持：

- `full`
- `torn`
- `tattered`
- `frayed`

## 开发命令

```bash
bun run typecheck
bun run lint
bun run build
```
