# Cytoid Notes — 扁平化设计规范

> 代码即规范：`src/notes/*.ts` 是唯一的事实来源，本文解释意图与接入方式。数值以 `src/tokens.ts` 为准。

## 1. 设计原则

1. **纯扁平**：只用纯色填充和描边。不用渐变、发光、噪点或纹理，只有少量透明度变化。
   所有动画都由几何图元（圆、弧、矩形、多边形、线段）的位移、缩放、描边宽度和透明度构成。
2. **保留 Cytoid 的识别度**：圆形 note、白色外环、双环 Hold、菱形 Flick、带箭头的 Drag head、纯色圆的 Drag child、静态胶囊 Drop、白色虚线 Drag 连线，以及 Cytoid 的尺寸比例和按扫描方向区分的配色都保持不变。
3. **只在需要时给出时间线索**：
   - Click 和 Flick 需要读点击时刻。时间反馈参考 Cytus II 的结构：先平静地预备，最后加速收尾，并在判定前闪一下。线性增长只能告诉玩家“还早”，加速、收拢和闪烁才能告诉玩家“就是现在”。
   - Hold 允许提前按下，Drag 系列只需要跟随路径。它们会尽快进入稳态，之后保持静止，不提供时间读数。
4. **外部提示要克制**：note 外部的装饰（锁定刻度、括号）只作为周边提示，透明度低、位移小，不干扰整张谱面的阅读。
5. **不只靠颜色区分**：每种 note 都有独立的形状特征，色弱玩家只看形状也能分辨：
   - Click：彩色实心球，里面的核心逐渐长大，颜色按 1-2-3 深度变化；
   - Hold：外环加无边框的暗色核心，以及静止的中心圆圈；
   - Long hold：外环加无边框的暗色核心，以及静止的中心方框，外加四角括号；
   - Drag head 和 Click drag head：沿链方向的白色箭头；
   - Drag child：纯色圆；
   - Drop drag：刻痕。

   Click drag child 与 Drag child 形状相同，只靠颜色区分。
6. **判定特效要小**：特效范围基本不超出 note 外径的 1.5 倍，密集段落叠加时也不会刺眼。

## 2. 坐标与尺寸

- 设计单位 `unit = 128px`，即 Click 的外径。图元坐标以 note 中心为原点，+y 朝下；角度 0 指向 12 点方向，顺时针为正。
- 各类型相对 Click 的尺寸沿用 Cytoid `GameConfig`：Drag head 0.8、Drag child 0.65、Flick 1.125、Drop drag 0.8，其余为 1。Click drag head 与 Click 相同。
- 描边与宽度（单位 u）：
  - 主环 0.085u，细线 0.022u；
  - **Hold 身体（进度条）宽 0.284u**，Long hold 相同，取自 Cytoid HoldLine；
  - Hold 进度环：中心半径 1.34R，宽 0.083u，取自 Cytoid ProgressRing；
  - **Drag 连线宽 0.0716u**，白色虚线，划线和间隔各 0.0358u，取自 Cytoid DragLine。

## 3. 颜色系统（Hue 驱动）

- 颜色家族与 Cytoid 的填充色槽位一一对应：`click / hold / flick / long-hold / drag / click-drag / drop-click / drop-drag`。每个家族都分 **up / down** 两个扫描方向，对应 Cytoid 的 `UseAlternativeColor`。
- 用户只需要选择 **OKLCH 色相**，亮度和彩度由 `fitLightness(h)` 与 `tokens.chroma` 决定。黄绿区间会自动提亮，所以任意色相的视觉权重都与默认配色一致。这比让用户直接选 hex 更安全，UX 也更好。
- 每个色相会派生出 5 个角色色：
  - `fill`：主填充；
  - `deep`：深一阶，用于 Hold 暗核心与 ping、Flick 刻痕、Drag child 内细环、Drop drag 刻痕；
  - `light`：浅一阶，用于涟漪；
  - **1-2-3 深度刻度**：`track`（1）· `deep`（2）· `fill`（3，本色），供 Click 和 Flick 的颜色递进使用；
  - `track`：暗轨道，用于未填充底盘和 Hold 身体；
  - `ring`：外环与连线，默认白色。
- 兼容 Cytoid 的自定义颜色：家族覆盖值也可以直接写 `#rrggbb`，此时保留该颜色自身的亮度和彩度，并且 **不受** `hueShift` 影响。
- 还支持全局 `hueShift`、`saturation`（设为 0 即单色模式）和 `ring` 外环色。
- 判定色沿用 Cytoid 默认值：Perfect `#5BC0EB`、Great `#FDE74C`、Good `#9BC53D`、Bad `#E55934`。Miss 改为中性灰 `#6B6F7A`，以便在深色背景上看清。

默认色相（up / down）：

| 家族 | up | down |
|---|---|---|
| Click、Hold、Flick、Drop click | 247（蓝） | 20（红） |
| **Click drag（head 与 child）** | 247（蓝） | 20（红），与 Click 一致 |
| Long hold | 88（金） | 70（琥珀） |
| Drag、Drop drag | 160（绿） | 160（绿） |

Click drag 仍是一个独立家族，可以单独改色。

## 4. 片段（Clip）模型

每种 note 由若干片段组成，片段参数 `x` 的含义由 `mode` 决定：

| mode | x | 用途 |
|---|---|---|
| `normalized` | 入场进度 p ∈ [0,1]，窗口终点 = 判定时刻 | enter；名义时长 1.2 s，实际按 intro→hit 窗口拉伸 |
| `static` | 忽略 | Drop 的静态图（只烘焙 1 帧） |
| `once` | 判定后的秒数 | clear-perfect/great/good/bad、miss |
| `loop` | 秒数，周期 = duration，首尾无缝 | hold-loop（0.6 s） |
| `progress` | 玩法进度 ∈ [0,1] | hold-progress |

Hold 的持续阶段拆成三层叠加，自下而上依次是 `press`（note 本体）、`loop`（本体内部的收缩动画）和 `progress`（进度环）。拆层后，帧动画也能在运行时与矢量版本按完全相同的方式合成。

## 5. 各类型规格

p 为入场进度。下表区间都指 p 的取值范围，例如 “0–0.1 淡入”。

### Click / Click drag head
- **结构**：实心球、核心和白色外环，颜色使用 **1-2-3 深度刻度**：
  - 一开始球体和核心都是深度 2（`deep`），note 读作一个纯色的球；
  - 随着判定临近，核心从深度 2 升到深度 3（`fill`，即本色）并扩张，背景从深度 2 降到深度 1（`track`）；
  - 颜色递进使用 ease-in-out（0.1–0.94）；
  - 三个色阶的**亮度差压缩到原来的一半**（`DEPTH_CONTRAST = 0.5`：`fill` 锚定不动，`deep`、`track` 的亮度各向 `fill` 靠拢一半，色相/饱和度不变），命中前的明暗对比尖峰减半，避免把视线从扫描线上拉走。

  深度递进仍是入场语言，但刻意克制：时机主要由扫描线承载，note 只作地标。
- **时间反馈**：参考 Cytus II 的 Click 逐帧拆解。原作的结构是：前 1/4 几乎静止的暗环；中段点亮，核心很小；最后约 0.4 s 外圈的同心环向内收拢，同时核心加速膨胀；判定前 2 帧暗下再亮起。扁平化的对应做法：
  - 0–0.1 淡入；0–0.5 整体缩放 0.62→1；0–0.4 外环由 3 段弧拼合。这是平静的预备段。
  - 0–0.94 核心以 **ease-out（三次方）** 从小点长到 0.8 倍内径，起点与渐入同步（p = 0）：出生后先快后慢，远在判定前就趋于静止，命中前不再有加速冲刺感。判定时核心是本色，外圈留一圈深度 1 的暗色。
  - 0.68–1 一道细白 **收拢环** 从 1.9R **按时间线性** 收拢到外环上，粗细只有发丝线的 0.6–1.1 倍（初版的一半）。透明度不超过 0.25（初版的一半），只作为极弱的周边提示；线性运动让玩家能读出速度。
  - 0.86–0.89 **首次闪烁**：紧贴结尾闪烁的引导闪，形态相同（白核 α 0.6、外环加粗 25%），与结尾闪构成双闪节奏；
  - 0.92–1 **结尾闪烁**：核心闪白（最高 α 0.6），外环加粗 25%，在 p = 1 时正好回落。
- **Click drag head**：时间反馈与 Click 完全相同，核心上叠加白色箭头，指向链的下一个节点（`heading`）。

### Hold
- **形状**与 Click 明显不同：
  - 粗外环；
  - 半径 0.55R 的 **deep 色暗核心**，无边框，位置取自 Cytoid HoldNoteRing 的内环；
  - 核心中央是 **静止的** 小白圆圈（半径 0.2R）。

  Hold 不使用箭头，因为箭头会让玩家误以为要拖动。
- **入场**：Hold 允许提前按下，所以 **不提供时间读数**。0–0.35 迅速成形，0.2–0.42 中心圆圈弹出，之后保持静止。
- **press**（0.2 s）：本体缩到 0.86，中心圆圈保持不动。
- **loop**（0.6 s，画在本体之上，首尾无缝）：
  - **内部 ping**：暗色核心本身做类似 Tailwind CSS `animate-ping` 的动画。每半个周期（与外部涟漪同频、同相）核心圆盘的一份副本在前 75% 内放大到 2 倍并淡出，曲线 ≈ cubic-bezier(0, 0, 0.2, 1)。副本被裁切在头部内径之内，不会压暗白环；中心图形保持静止，画在最上层。
  - **外部脉冲**：两道细浅色涟漪相差半个周期，在进度环外侧扩散。
- **progress**：沿用 Cytoid ProgressRing 的位置和宽度（中心 1.34R，宽 0.083u）。白色领先段长 4/3·p，fill 色段长 p。
- **身体（进度条）** `holdBody`：
  - 宽 0.284u，与 Cytoid 相同；
  - 入场进度 0.3–0.9 期间从头部下方展开；
  - 中心虚线在按住时向头部滚动；
  - 已完成部分为实心 fill 加白色中线，末端是白色横杠。

### Long hold
- 与 Hold 相同，另有三处差别：
  - 金色；
  - 中心图形是 **方框**，边长按视觉面积与圆圈匹配（半边长 = 0.82 × 圆圈半径）；
  - 四角括号在 0.1–0.45 从 1.6R 收拢到 1.28R。
- **身体** `longHoldBody`：竖贯整个游玩区域，宽度与 Hold 相同。已完成部分从 note 向上下两端同时延伸。
- **clear**：增加一道竖直光束，向上下延伸约 3R 后收窄淡出。

### Drag 系列（Drag head / Drag child / Click drag child）
- 玩家只需要关注拖动路径，所以 **p = 0.2 时就进入稳态**，之后完全静止。
- **Drag head**：白环、满填充，加上沿链方向的 **白色箭头**（Cytoid CDragFill 形状）。
  - 箭头角度由 `createContext(..., { heading })` 指定，0 表示向上，顺时针为正。
  - 帧动画按箭头朝上烘焙，使用时整体旋转 sprite；圆形本体是旋转对称的，旋转不影响外观。
- **Drag child**：与 Cytoid 一样是 **纯色圆**。唯一的内部装饰是 0.62R 处一道低对比度的 deep 细环，不会吸引视线，也不影响判断节点位置。
- **Click drag child**：与 Drag child 完全相同，只是颜色跟随 Click。
- **连线** `dragLine`：**不改动 Cytoid 原设计**。
  - 白色虚线，宽 0.0716u，占空比 50%；
  - 虚线图案锚定在源 note 上；
  - `lead` 从源 note 的入场开始生长，`trail` 在扫描线经过时从源端收回。

### Flick
- **结构**：菱形外环、菱形底和菱形核心（与 Click 相同的 1-2-3 深度递进），以及中心竖向刻痕（deep 色）。两侧箭头的开口为 90°。刻痕是对 Cytoid 分割菱形的扁平化呼应。核心采用与 Click 相同的时间语言：ease-out 增长（先快后慢、提前稳定），双闪烁（0.86–0.89 + 0.92–1）。
- **入场**：
  - 0–0.45 菱形四边从各自中点向两端生长；
  - 中心竖向刻痕随核心同步出现：长度跟随核心的 ease-out 生长，透明度 0.05–0.45 ease-out 淡入；
  - 左右两个向外的 V 形箭头 **ease-out** 收拢（先快后慢），p = 0.45 进入稳态，命中前保持静止。原 Cytoid 的“提前 0.25 s 锁定 + snap”按“note 不承载计时”的新前提移除。
- **clear**：4 段扇区弧，加上左右两条较短的水平冲击条和水平方向的碎片。另有 **向右扫出的 V 形箭头**，表示滑动方向。箭头 **虚、宽**，高度与中间的竖向刻痕差不多（约 0.76R），描边粗，透明度不超过 0.42。开口角度为 90°，与 Flick 菱形的角以及 note 两侧的箭头一致；整个动画中尺寸、角度和描边都不变，只有位置和透明度变化。数量为 Perfect 3 个、Great 2 个、Good 和 Bad 各 1 个，依次延迟 0.08 出发。
  - 动画固定按向右烘焙。玩家向左滑时把整个特效旋转 180°；以后若支持任意方向，也是整体旋转。

### Drop click / Drop drag
- **静态图片，没有入场动画**，与 Cytoid 和 Cytus II 一致。下落位移由消费方计算。帧动画只烘焙 1 帧。
- 横向胶囊，Drop click 宽高为 1.15 × 0.3 size。
  - **Drop click**：白边、fill 和白色核心条；
  - **Drop drag**：更短，没有核心条，改为两道 deep 色竖刻痕；不与其他 note 连线。

### 判定特效（所有类型共用一套语法，刻意做小）
1. **色闪**：0–0.32，note 形状以**判定色**放大到 1.08 倍后塌缩，峰值透明度 0.25（不用白色：全尺寸白色圆干扰视线，也压淡判定文字；实心块只作轻微的颜色确认）。
2. **冲击环**：半径从 0.95R 扩到 reach·R（outExpo），描边从 1.6W 收到 0.35W（对应 FlatFX 的 1.333→0.333），峰值透明度 0.5。
   reach 的取值：Click 1.45，Drag 1.4，Flick 1.4，Hold 1.5，Long hold 1.6，Drop 1.3。各评级再乘以系数：Perfect 1、Great 0.9、Good 0.75、Bad 0.6。
3. **扇区环**：仅 Perfect 和 Great 有。24 段，Flick 为 4 段；位于 0.8–1.02 倍 reach 之间，占空比由 0.62 降到 0.12。
4. **方形碎片**：Perfect 6 片（白色），Great 4 片，Good 3 片，Bad 无。碎片最远飞到 1.12 倍 reach，由确定性随机生成，烘焙结果可复现。
5. **按类型的附加效果**：Hold 有第二道环，Long hold 有竖直光束，Flick 有水平冲击条和向右的滑动箭头。

评级越低，特效时长越长、范围越小：Perfect 0.42 s，Great 0.46 s，Good 0.52 s，Bad 0.56 s。
**Miss**（0.5 s）：note 熄灭成暗轨道色，外环变灰并向内收缩、略微下沉。不再划 ×，由 MISS 文字表达。残影结构跟随各 note 自己的稳态尾帧：drag child / click drag child 没有外环，收缩时保留内侧的 deep 发丝环（其余圆形 note 维持“盘 + 灰环”结构）。

### 判定文字（PERFECT / GREAT / GOOD / BAD / MISS）
- **位置**：文字居中在特效中央（note 中心），与 clear 或 miss 特效同时播放，时长相同。
- **字体**：自绘的单线、45° 倒角几何大写字体，只定义了用到的 14 个字母。
  - 字形用与 note 相同的折线图元绘制，不依赖字体文件，Canvas、SVG/resvg 烘焙和 Unity 移植三者的结果完全一致；
  - 字高 0.12u（初版 0.17u，缩小以降低晃眼感），笔画粗 0.18 倍字高，直角斜接、方头端点，与扁平几何风格统一。
- **颜色**：跟随判定色。MISS 的灰色提亮 35%，保证压在暗色残影上也能读清。
- **动画**（u = t / 时长）：
  - 0–0.4 字距从 1 倍字高收拢到 0.32 倍；
  - 0.02 起每个字母间隔 0.035 依次弹出（缩放 0.4→1，outBack）；
  - 0.05–0.4 下方细线从中心向两侧展开（MISS 没有下划线）；
  - 全程上浮 0.12 倍字高（MISS 改为下沉）；
  - 0.7–1 淡出。
- **开关**：`renderNote(kind, state, ctx, { judgement: false })` 可关闭文字；单独调用为 `renderJudgement(grade, t, ctx)`。playground 的图鉴、检查器和谱面预览都提供“Judgement text”开关，方便对比。
- **帧动画**：每个评级只烘焙一份（与 note 类型和方向无关），输出在 `judgement/<grade>`，贴图以文字中心为锚点，叠放在 note 中心即可。`--cylheim` 时 PERFECT 额外输出为 `PERFECT_Gold_top_00146–00158.png`。

## 6. 交付形态

### 矢量（Cytoid 当前方案）
- `renderNote(kind, state, ctx)` 返回场景树，`holdBody / longHoldBody / dragLine` 负责可拉伸部件。
- 场景树只包含 6 种图元，Unity 中可以用 Shapes、LineRenderer 或 SpriteShape 一一对应，也可以继续沿用 Cytoid 现有的 ring/fill sprite 加遮罩。
- 所有动画都是 `seg / lerp / ease` 的组合，没有任何状态，可逐行移植到 C#。参见 `src/core/ease.ts`。
- **透明度约定**：组的 opacity **逐级乘到叶子图元上**，不做离屏合成；同一图元的填充和描边也各自混合。这正是游戏引擎里每个 sprite 单独设置 alpha 的行为，Canvas 预览、SVG/resvg 烘焙和 Unity 移植三者因此保持一致。
- `createContext` 的 `direction` 只决定配色（对应 Cytoid 的 `UseAlternativeColor`，消费方按 Cytoid 的规则自行算出，包括 `is_forward` 和 Drop 的 `NoteDirection`）。Hold 身体和箭头的朝向由独立的 `bodyDirection` 决定，默认与 `direction` 相同，以支持故事板覆盖和反向页面。

### 帧动画（Cytus II / Cylheim 方案）
- 运行 `pnpm bake`（参数见 `scripts/bake.ts`）后输出到 `<out>/`：
  - `manifest.json`，格式为 `cytoid-notes/frames@1`，记录 fps、每个片段的 mode、帧数、帧尺寸、锚点和采样公式；
  - `<kind>/<dir>/<clip>/<clip>_00000.png`：独立帧；
  - `<kind>/<dir>/<clip>.sheet.png`：图集，行列数写在 manifest 里；
  - `bodies/<dir>/<family>/*.png`：可平铺的 Hold、Long hold 身体条带和白色虚线连线；
  - `cylheim/`（加 `--cylheim` 参数时生成）：沿用 Cylheim `src/images/designer` 的文件名和帧号。烘焙时按 Cylheim 的帧时间线（含重复帧）逐帧反采样，保证动画节奏与矢量版完全一致。
- **采样规则**：`normalized` 采用右端点采样，第 i 帧画的是 p = (i+1)/N 时的姿态，播放时取 `i = min(N−1, floor(p·N))`。因此每帧显示的是所在时间片终点的姿态，比连续时间最多超前 1/N，最后一帧正好是判定时刻的姿态。Cylheim 的取帧方式与此相同。
- 帧图锚点都在中心 (0.5, 0.5)。画布按全部帧的包围盒对称裁切。
- 颜色已烘焙进帧图。需要自定义色相时，用 `--palette palette.json` 重新烘焙，或用 `--hue-shift` 整体旋转色相。

### Cylheim 适配说明
- Enter（Click / Hold / Long hold / Drag / DragChild / Flick）、Drop 静态图（`Note-DropClick.png` / `Note-DropDrag.png`，宽度对齐原图）和 Bloom（Click / Drag / Flick / Hold / LongHold）可以直接替换使用。
  - 帧时间线：Enter 为 30 fps（含重复帧）；Bloom 为 51 fps，前 3 或 4 帧各显示一次，其余帧各显示两次。烘焙时按每帧的实际显示时刻反采样。因为 Cylheim 各家族的 Bloom 窗口长度不同（0.33–0.67 s），我们 0.42 s 的特效会被均匀压缩或拉伸进这个窗口。
  - 尺寸：Cylheim 会再乘一次自己的显示倍率（Hold / LongHold ×0.83，Drag head ×0.8，Drag child ×0.42，Flick ×0.8）。烘焙时按 `174px / 128 ÷ 倍率` 放大来抵消，所以屏幕上看到的大小仍符合本设计。Hold 进入按住状态后，Cylheim 的倍率会变成 ×1，Button 序列也按 ×1 烘焙。
  - Hold 的 17–40 号帧会被 grouped-popup 预加载，其中奇数帧 25–39 不在普通时间线上，按帧号插值补齐。
  - Cylheim 中的 Click drag head 用的是 Drag 的贴图，而在本设计里它是 Click 加箭头。另外，Drag 贴图中的箭头朝上，Cylheim 需要按链方向旋转 sprite。
- Hold 的 Button 和 Fire 已按原名输出，但 Cylheim 会循环播放 Button，Fire 则带 83px 锚点偏移和加色混合，需要在 Cylheim 侧写一个小适配器。更推荐的做法是新增一个读取 `manifest.json` 的 provider。
