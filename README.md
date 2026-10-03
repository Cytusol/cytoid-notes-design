# cytoid-notes-design

为 [Cytoid](https://github.com/Cytoid/Cytoid) 重新设计的全套扁平化 note 样式与动画。同一份设计会产出两种交付形态：

- **矢量**：由少量几何图元组成，逐帧计算场景树。这是 Cytoid 目前采用的方案，可以直接移植到 Unity。
- **帧动画**：由同一份矢量设计烘焙出 PNG 序列、图集和 manifest，并附带一套 Cylheim 兼容命名的输出。

设计规范见 [docs/DESIGN.md](./docs/DESIGN.md)，调研摘要见 [docs/research/references.md](./docs/research/references.md)。

## 快速开始

```sh
pnpm install
pnpm bake        # 烘焙帧动画 → playground/public/frames（约 10 s）
pnpm dev         # 启动审查页面（Vue playground）
```

## 目录

```
src/
  tokens.ts          尺寸 / 描边 / 时长 / 默认色相 / 判定色
  palette.ts         OKLCH 色相驱动的配色（支持 hue、hex、hueShift、saturation）
  core/              场景图元、缓动、颜色数学
  notes/             每种 note 的设计（enter / hold 层 / clear / miss）与身体、连线
  render/            Canvas2D 与 SVG 渲染器
  bake/              帧动画烘焙（仅 Node 可用，依赖 resvg）与 Cylheim 映射
scripts/
  bake.ts            烘焙 CLI
  sheet.ts           开发用：输出每种 note 全部片段的总览图到 .sheets/
playground/          Vue 审查页面（图鉴 / 检查器 / 谱面预览 / 帧动画 / 调色）
```

## 烘焙参数

```sh
pnpm bake --out out/frames --fps 60 --scale 2 --cylheim
pnpm bake --kinds click,flick --dirs up --hue-shift 40
pnpm bake --palette my-palette.json     # 在 playground 的“调色”页导出
```

## 作为库使用

```ts
import { createContext, createPalette, drawScene, renderNote } from 'cytoid-notes-design'

const palette = createPalette({ families: { click: { up: 200 } } })
const ctx = createContext('click', { palette, direction: 'up', scale: 1 })
const scene = renderNote('click', { phase: 'enter', p: 0.6 }, ctx)
drawScene(canvas.getContext('2d')!, scene) // 调用前先把坐标原点平移到 note 中心
```

## 开发

```sh
pnpm test        # 几何有效性、特效能否淡出、循环是否无缝、采样公式能否互逆
pnpm typecheck
pnpm lint
```

## 许可

代码采用 MIT 许可。`docs/research` 中提到的 Cytus II 资源归其原作者所有，本仓库只用它们作为参考，不包含也不分发这些资源。
