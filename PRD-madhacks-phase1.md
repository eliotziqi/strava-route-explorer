# Phase 1 — Heatmap + Point-Select 小版本规格

## 目标（概述）

- 实现按经过次数着色的路线热力线；
- 地图支持点选某一点并列出经过该点的活动；
- 提供若干配色方案并持久化选择；
- 保证基本性能（索引构建、渲染与交互流畅）。

## 详细目标

1. 线路热力化

   - 所有活动的路线都在地图上渲染。
   - 同一段路被经过次数越多，线条颜色越“热”（更亮/更暖，可略微加粗）。
   - 效果整体接近 Strava 的个人 Heatmap 感觉。

2. 地图点选 → 活动列表

   - 点击地图任意点，若附近有路线则弹出包含经过该点的活动列表（名称、类型、日期）。
   - 列表项可点击跳转到对应 Strava 活动页（`https://www.strava.com/activities/{id}`）。
   - 若附近无活动，显示 “No activities near this point” 或不弹窗。

3. 基础配色方案

   - 提供若干预设配色（示例：Warm / Cool / Fire / Blue / Mono）。
   - 切换配色即时生效，热度映射保持一致（仅风格变更）。
   - 当前配色保存在 `localStorage`（key: `re.heatColor`），刷新后保留。

4. 性能与稳定性（目标值）

   - 对于典型数据量（个人账号活动数），索引构建时间应在可接受范围（示例 < 500ms，期望 50–300ms）。
   - 地图缩放 / 拖动流畅，无明显卡顿，控制台无新增错误。

---

## 实现步骤（概要）

### A. 数据结构与算法

- 统一前端 `Activity` 类型，包含 `points: LatLng[]`（解码后的 polyline 点序列）。
- 实现 `buildSegmentIndex(activities)`：将相邻点对作为线段，量化后用 Map 累加 `count` 与 `activityIds`，并按中点映射到粗网格 `grid` 用于快速查询。
- 实现 `queryActivitiesAtPoint(point, index, toleranceMeters)`：在周边格子中筛候选线段，计算点到线段距离并返回命中的活动集合。
- 实现热度到颜色映射（normalize + color schemes + 可选线宽挂钩）。

### B. 前端集成（Map）

- 在 Map 组件中使用 `useMemo` 缓存 `segmentIndex`（activities 变化时重算）。
- 提供 `colorScheme` 状态并保存到 `localStorage`（`re.heatColor`）。
- 用 `useMapEvents` 捕获点击，调用 `queryActivitiesAtPoint` 并在地图上显示 `CircleMarker` + 在地图上方展示活动弹窗列表（支持跳转）。
- 用 `Polyline` 渲染每条 segment（color & weight 与热度关联）。

### C. 优化与注意点

- 对高密度轨迹先做简化或下采样以加速索引与渲染。
- 可选用 Canvas 批量渲染或将热力线分层渲染以提升性能。
- 索引构建可放到 Web Worker / requestIdleCallback 异步执行，避免阻塞主线程。

---

## 验收清单（自测）

### 1. 功能行为

- 热力线正确反映经过次数：常跑主干更亮、更粗；偶发路线更淡。
- 点击地图弹出正确的活动列表，点击条目可在新标签打开 Strava 活动页。
- 切换配色即时生效并持久化到 `localStorage`。

### 2. 与过滤联动

- 按年/类型过滤后，热力与点选结果基于当前过滤集合。

### 3. 性能与稳定性

- 索引构建时间在预期范围内（记录 `console.time('buildIndex')`）。
- 地图交互流畅，无明显卡顿或控制台报错。

---

交付物：代码实现、简单使用说明、以及一组自测步骤（见上）以便评估并演示 Phase 1 完成度。
