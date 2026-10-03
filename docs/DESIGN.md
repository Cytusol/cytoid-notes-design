# Cytoid Notes — 扁平化设计规范

> 代码即规范：`src/notes/*.ts` 是唯一的事实来源，本文解释意图与接入方式。数值以 `src/tokens.ts` 为准。

## 1. 设计原则

1. **纯扁平**：只用纯色填充和描边。不用渐变、发光、噪点或纹理，只有少量透明度变化。
   所有动画都由几何图元（圆、弧、矩形、多边形、线段）的位移、缩放、描边宽度和透明度构成。
2. **保留 Cytoid 的识别度**：圆形 note、白色外环、菱形 Flick、胶囊形 Drop，以及 Cytoid 的尺寸比例和按扫描方向区分的配色都保持不变。
3. **时间线索优先**：Click、Hold 和 Flick 的填充随入场进度 **线性** 增长，`p = 1` 时正好填满并到达判定时刻，与 Cytoid 原有的读谱习惯一致。装饰动画可以用缓动，但不能干扰这条线索。
4. **构造感**：外环由若干弧段拼合，Flick 的菱形从各边中点向两端生长，最后由锁定刻度收拢到 note 上。这是对 Cytus II “机械组装”式入场的扁平化转译。
5. **不只靠颜色区分**：每种 note 都有独立的形状特征，例如 Hold 的箭头和外细环、Long hold 的四角括号、Drag 的白色节点、Click drag child 的细光环、Drop drag 的刻痕。色弱玩家只看形状也能分辨。

## 2. 坐标与尺寸

- 设计单位 `unit = 128px`，即 Click 的外径。图元坐标以 note 中心为原点，+y 朝下；角度 0 指向 12 点方向，顺时针为正。
- 各类型相对 Click 的尺寸沿用 Cytoid `GameConfig`：Drag head 0.8、Drag child 0.65、Flick 1.125、Drop drag 0.8，其余为 1。Click drag head 与 Click 相同。
- 主环描边 0.085u，细线 0.022u，Hold 进度环 0.07u，Hold 身体宽 0.2u，Drag 连线宽 0.075u。

## 3. 颜色系统（Hue 驱动）

- 颜色家族与 Cytoid 的填充色槽位一一对应：`click / hold / flick / long-hold / drag / click-drag / drop-click / drop-drag`。每个家族都分 **up / down** 两个扫描方向，对应 Cytoid 的 `UseAlternativeColor`。
- 用户只需要选择 **OKLCH 色相**，亮度和彩度由 `fitLightness(h)` 与 `tokens.chroma` 决定。黄绿区间会自动提亮，所以任意色相的视觉权重都与默认配色一致。这比让用户直接选 hex 更安全，UX 也更好。
- 每个色相会派生出 5 个角色色：`fill` 主填充、`deep` 深一阶（刻痕、分割线）、`light` 浅一阶（涟漪）、`track` 暗轨道（未填充底盘、Hold 身体），以及 `ring` 外环（默认白色）。
- 兼容 Cytoid 的自定义颜色：家族覆盖值也可以直接写 `#rrggbb`，此时保留该颜色自身的亮度和彩度。
- 还支持全局 `hueShift`、`saturation`（设为 0 即单色模式）和 `ring` 外环色。判定色沿用 Cytoid 默认值：Perfect `#5BC0EB`、Great `#FDE74C`、Good `#9BC53D`、Bad `#E55934`；Miss 改为中性灰 `#6B6F7A`，以便在深色背景上看清。

默认色相（up / down）：Click、Hold、Flick、Drop click 为 247 / 20（蓝 / 红）；Long hold 为 88 / 70（金 / 琥珀）；Drag、Drop drag 为 160（绿）；Click drag 为 292（紫，用来区分 Click drag child）。

## 4. 片段（Clip）模型

每种 note 由若干片段组成，片段参数 `x` 的含义由 `mode` 决定：

| mode | x | 用途 |
|---|---|---|
| `normalized` | 入场进度 p ∈ [0,1]，窗口终点 = 判定时刻 | enter；名义时长 1.2 s，实际按 intro→hit 窗口拉伸 |
| `once` | 判定后的秒数 | clear-perfect/great/good/bad、miss |
| `loop` | 秒数，周期 = duration，首尾无缝 | hold-loop（0.6 s） |
| `progress` | 玩法进度 ∈ [0,1] | hold-progress |

Hold 的持续阶段拆成三层叠加：`loop`（底层）+ `press`（note 本体）+ `progress`（顶层）。拆层后，帧动画也能在运行时与矢量版本按完全相同的方式合成。

## 5. 各类型规格

p 为入场进度。下表区间都指 p 的取值范围，例如 “0–0.12 淡入”。

### Click / Click drag head
- **结构**：暗底盘（track，α 0.55）、填充圆（fill）和白色外环。
- **入场**：0–0.12 淡入；0–0.55 整体缩放 0.62→1（outCubic）；0–0.45 外环由 3 段弧拼合，同时旋转 −60°→0；填充半径 = 内径 × p（线性）；0.55–0.95 四个刻度从 1.55R 收拢到环上，0.86–0.97 消失（锁定提示）。
- **Click drag head**：玩法与样式均同 Click，作为链起点由连线区分。

### Hold
- 在 Click 结构的基础上增加两部分：外圈细环（fill 色，12 段虚线在 0.1–0.7 闭合并减速旋转）；0.55–0.85 时出现白色 V 形箭头，指向身体方向（up 朝上，down 朝下）。
- **press**（0.2 s）：本体缩到 0.86，箭头收起，外细环扩到 1.3R 并变淡。
- **loop**（0.6 s）：两道浅色涟漪从 0.86R 扩散到 1.65R；四段弧以每周期 90° 的速度环绕，保证无缝。
- **progress**：0.86R 外侧有一圈暗轨道，白色弧从 12 点顺时针填充。
- **身体** `holdBody`：暗轨道上的中心虚线在按住时向头部滚动，已完成部分为实心 fill 加白色中线，末端是白色横杠。

### Long hold
- 与 Hold 相同，额外加四角括号：0.35–0.9 从 1.75R 收拢到 1.28R。外环拼合段数为 4，虚线 16 段。
- **身体** `longHoldBody`：竖贯整个游玩区域的双轨道，已完成部分从 note 向上下两端同时延伸，与 Cytoid 一致。
- **clear**：增加一道竖直光束，向上下延伸后收窄淡出。

### Drag head
- 白环、满填充（Cytoid 的普通 drag head 不做填充增长）和白色节点圆点。
- **入场**：从 0.5 倍缩放开始，外环由两半闭合；0.6–0.9 节点以回弹方式弹出。

### Drag child / Click drag child
- **Drag child**：没有外环，是一颗实心 fill 珠子，中心有白色节点。
- **Click drag child**：形状同 Drag child，使用独立颜色家族（click-drag），外加一圈 4 段弧组成的白色虚线光环（缺口始终保留，不会与 Drag head 的实心环混淆）。
- **连线** `dragLine`：fill 色实线，宽 0.075u，画在 note 之下。`lead` 从源 note 的入场开始生长，`trail` 在扫描线经过时从源端收回。

### Flick
- 菱形外环、菱形填充（线性增长）和中心竖向刻痕（deep 色）。刻痕是对 Cytoid 分割菱形的扁平化呼应。
- **入场**：菱形四边从各自中点向两端生长（0–0.45）。左右两个向外的 V 形箭头 **线性** 收拢，在 `lock = 1 − 0.25 s / 1.2 s` 时锁定（Cytoid 的提前 0.25 s），锁定瞬间有一个小幅外弹。
- **clear**：4 段扇区弧，加上左右两条水平冲击条和水平方向的碎片。

### Drop click / Drop drag
- 横向胶囊，Drop click 宽高为 1.15 × 0.3 size。下落位移由消费方计算，片段本身只负责外观。
- **Drop click**：白边、fill 和白色核心条，核心条在 0.82–1 由 0.28W 加宽到 0.5W（落点提示）。
- **Drop drag**：更短，没有核心条，改为两道 deep 色竖刻痕；不与其他 note 连线。
- **入场**：0–0.35 横向展开（scaleX 0.35→1）。

### 判定特效（所有类型共用一套语法）
1. **闪白**：0–0.32，note 形状先白后转为判定色，放大后塌缩。
2. **冲击环**：半径从 0.95R 扩到 reach·R（outExpo），描边从 1.6W 收到 0.35W（对应 FlatFX 的 1.333→0.333）。
3. **扇区环**：仅 Perfect 和 Great 有。24 段，Flick 为 4 段；占空比由 0.62 降到 0.12，并缓慢旋转。
4. **方形碎片**：Perfect 10 片（白色），Great 7 片，Good 4 片，Bad 无。碎片由确定性随机生成，烘焙结果可复现。
5. **按类型的附加效果**：Hold 有第二道环，Long hold 有竖直光束，Flick 有水平冲击条。

评级越低，特效时长越长、范围越小：Perfect 0.42 s，Great 0.46 s，Good 0.52 s，Bad 0.56 s。
**Miss**（0.5 s）：note 熄灭成暗轨道色，外环变灰并向内收缩、略微下沉，同时划出一个 ×。

## 6. 交付形态

### 矢量（Cytoid 当前方案）
- `renderNote(kind, state, ctx)` 返回场景树，`holdBody / longHoldBody / dragLine` 负责可拉伸部件。
- 场景树只包含 6 种图元，Unity 中可以用 Shapes、LineRenderer 或 SpriteShape 一一对应，也可以继续沿用 Cytoid 现有的 ring/fill sprite 加遮罩。
- 所有动画都是 `seg / lerp / ease` 的组合，没有任何状态，可逐行移植到 C#。参见 `src/core/ease.ts`。

### 帧动画（Cytus II / Cylheim 方案）
- 运行 `pnpm bake`（参数见 `scripts/bake.ts`）后输出到 `<out>/`：
  - `manifest.json`，格式为 `cytoid-notes/frames@1`，记录 fps、每个片段的 mode、帧数、帧尺寸、锚点和采样公式；
  - `<kind>/<dir>/<clip>/<clip>_00000.png`：独立帧；
  - `<kind>/<dir>/<clip>.sheet.png`：图集，行列数写在 manifest 里；
  - `bodies/<dir>/<family>/*.png`：可平铺的身体和连线条带；
  - `cylheim/`（加 `--cylheim` 参数时生成）：沿用 Cylheim `src/images/designer` 的文件名和帧号。烘焙时按 Cylheim 的帧时间线（含重复帧）逐帧反采样，保证动画节奏与矢量版完全一致。
- **采样规则**：`normalized` 的第 i 帧对应 p = (i+1)/N，播放时取 `i = min(N−1, floor(p·N))`，最后一帧就是判定时刻的姿态，与 Cylheim 的取帧方式相同。
- 帧图锚点都在中心 (0.5, 0.5)。画布按全部帧的包围盒对称裁切。
- 颜色已烘焙进帧图。需要自定义色相时，用 `--palette palette.json` 重新烘焙，或用 `--hue-shift` 整体旋转色相。

### Cylheim 适配说明
- Enter（Click / Hold / Long hold / Drag / DragChild / Flick）和 Bloom（Click / Drag / Flick / Hold / LongHold）可以直接替换使用。
- Hold 的 Button 和 Fire 已按原名输出，但 Cylheim 会循环播放 Button，Fire 则带 83px 锚点偏移和加色混合，需要在 Cylheim 侧写一个小适配器。更推荐的做法是新增一个读取 `manifest.json` 的 provider。
