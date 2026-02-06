<template>
  <div class="w-full h-full bg-green-600 overflow-hidden relative py-4">
    <Header />
    <!-- SVG Canvas for isometric rendering -->
    <svg
      ref="svgCanvas"
      class="w-full h-full cursor-grab bg-emerald-600 active:cursor-grabbing"
      @mousedown="startPan"
      @mousemove="handlePan"
      @mouseup="endPan"
      @mouseleave="endPan"
      @wheel.prevent="handleZoom"
    >
      <!-- Grid background -->
      <defs>
        <pattern id="isometricGrid" x="80" y="80" patternUnits="userSpaceOnUse">
          <path d="M80,0 L0,80 M0,0 L80,80" stroke="#d4d4d4" stroke-width="1" opacity="0.3"/>
        </pattern>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#isometricGrid)" :transform="`translate(${pan.x}, ${pan.y}) scale(${scale})`"/>
      
      <!-- Trees / Features: trunks first, features (bunnies/lakes) next, then foliage -->
      <g :transform="`translate(${pan.x}, ${pan.y}) scale(${scale})`">
        <!-- Organic land blob for the forest cluster -->
        <g>
          <path
            v-if="landPath"
            :d="landPath"
            fill="#ABFF87"
            stroke="none"
          />
        </g>

        <!-- Lakes (rendered behind trees) -->
        <g>
          <g v-for="f in renderLakes" :key="`lake-${f.id}`">
            <g :transform="`translate(${f.centerX}, ${f.centerY})`">
              <!-- Lake blob (outer) -->
              <path
                v-if="lakeBlobPaths.find(lp => lp.id === f.id)"
                :d="lakeBlobPaths.find(lp => lp.id === f.id).path"
                fill="#60A5FA"
                opacity="0.9"
              />
              <!-- Lake highlight (inner) -->
              <path
                v-if="lakeBlobPaths.find(lp => lp.id === f.id)"
                :d="lakeBlobPaths.find(lp => lp.id === f.id).path"
                fill="#93C5FD"
                opacity="0.4"
                transform="scale(0.65)"
              />
            </g>
          </g>
        </g>

        <!-- Bunnies behind trees -->
        <g>
          <g v-for="f in bunnyLayers.back" :key="`bunny-back-${f.id}`">
            <g :transform="`translate(${f.px + 40}, ${f.py + 40})`">
              <ellipse cx="0" cy="4" rx="8" ry="6" fill="#F3E4D8" stroke="#D6C3AD" stroke-width="0.6" />
              <circle cx="-8" cy="0" r="5" fill="#F3E4D8" stroke="#D6C3AD" stroke-width="0.6" />
              <path d="M-9,-6 Q-9,-12 -6,-8" stroke="#F3E4D8" stroke-width="1.2" fill="none" stroke-linecap="round" />
              <path d="M-6,-6 Q-6,-12 -3,-8" stroke="#F3E4D8" stroke-width="1.2" fill="none" stroke-linecap="round" />
            </g>
          </g>
        </g>

        <!-- Trees with sprites -->
        <g>
          <g
            v-for="tree in renderTrees"
            :key="`tree-${tree.id}`"
            class="cursor-pointer"
          >
            <g :transform="`translate(${tree.renderX}, ${tree.renderY})`">
              <g v-if="tree.stage === 'sapling'">
                <!-- Sapling: small trunk with minimal leaves -->
                <g :transform="`translate(40, 40)`">
                  <rect x="-4" y="-12" width="8" height="20" fill="#8B6F47" stroke="#654321" stroke-width="0.6" rx="1"/>
                  <path d="M0,-8 C-10,-14 -14,-20 -10,-22" stroke="#4C7A2A" stroke-width="1.2" fill="none" stroke-linecap="round"/>
                  <path d="M0,-8 C10,-14 14,-20 10,-22" stroke="#4C7A2A" stroke-width="1.2" fill="none" stroke-linecap="round"/>
                  <circle cx="-8" cy="-22" r="4" fill="#22C55E"/>
                  <circle cx="8" cy="-22" r="4" fill="#22C55E"/>
                </g>
              </g>
              <g v-else>
                <!-- Grown tree: oak sprite -->
                <image
                  :href="getTreeSpritePath(tree.treeSprite)"
                  width="80"
                  height="80"
                  x="0"
                  y="0"
                />
                <!-- Fruit overlay -->
                <image
                  :href="getFruitSpritePath(tree.fruitSprite)"
                  width="80"
                  height="80"
                  x="0"
                  y="0"
                />
              </g>
            </g>
          </g>
        </g>

        <!-- Bunnies in front of trees -->
        <g>
          <g v-for="f in bunnyLayers.front" :key="`bunny-front-${f.id}`">
            <g :transform="`translate(${f.px + 40}, ${f.py + 40})`">
              <!-- body -->
              <ellipse cx="0" cy="4" rx="8" ry="6" fill="#F3E4D8" stroke="#D6C3AD" stroke-width="0.6" />
              <!-- head -->
              <circle cx="-8" cy="0" r="5" fill="#F3E4D8" stroke="#D6C3AD" stroke-width="0.6" />
              <!-- ears -->
              <path d="M-9,-6 Q-9,-12 -6,-8" stroke="#F3E4D8" stroke-width="1.2" fill="none" stroke-linecap="round" />
              <path d="M-6,-6 Q-6,-12 -3,-8" stroke="#F3E4D8" stroke-width="1.2" fill="none" stroke-linecap="round" />
            </g>
          </g>
        </g>

        <!-- Tooltips (drawn last to appear above everything) -->
        <g>
          <g v-for="tree in renderTrees" :key="`tooltip-${tree.id}`"
            @mouseenter="hoveredTreeId = tree.id"
            @mouseleave="hoveredTreeId = null"
          >
            <!-- Expanded hover hitbox covering tree + tooltip -->
            <rect
              :x="tree.renderX - 120"
              :y="tree.renderY - 100"
              width="240"
              height="140"
              fill="transparent"
              pointer-events="all"
            />

            <!-- Tooltip on hover (drawn outside inner group so coordinates align with tree.x/tree.y) -->
            <g v-if="hoveredTreeId === tree.id" pointer-events="none">
              <rect
                :x="tree.renderX - 110"
                :y="tree.renderY - 85"
                width="220"
                height="90"
                rx="6"
                fill="#000"
                opacity="0.95"
              />
              <!-- Task label -->
              <text
                :x="tree.renderX - 100"
                :y="tree.renderY - 65"
                fill="#FFF"
                font-size="10"
                font-weight="bold"
                class="pointer-events-none"
              >
                Task:
              </text>
              <!-- Task text (truncated if too long) -->
              <text
                :x="tree.renderX - 100"
                :y="tree.renderY - 52"
                fill="#CCC"
                font-size="10"
                class="pointer-events-none"
                style="word-wrap: break-word; max-width: 200px"
              >
                {{ getTodoText(tree.todoId).substring(0, 30) }}{{ getTodoText(tree.todoId).length > 30 ? '...' : '' }}
              </text>
              <!-- Completed label -->
              <text
                :x="tree.renderX - 100"
                :y="tree.renderY - 35"
                fill="#FFF"
                font-size="10"
                font-weight="bold"
                class="pointer-events-none"
              >
                Completed:
              </text>
              <!-- Date and time -->
              <text
                :x="tree.renderX - 100"
                :y="tree.renderY - 22"
                fill="#CCC"
                font-size="9"
                class="pointer-events-none"
              >
                {{ formatCompletedDateTime(tree.dateCompleted) }}
              </text>
              <!-- Undo button -->
              <foreignObject
                :x="tree.renderX - 100"
                :y="tree.renderY - 10"
                width="200"
                height="35"
                style="pointer-events: auto"
              >
                <button
                  @click="undoTree(tree.id)"
                  class="w-full h-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded px-3 py-2 transition-colors"
                >
                  ↺ Undo
                </button>
              </foreignObject>
            </g>
          </g>
        </g>
      </g>
    </svg>
    
    <!-- Zoom controls -->
    <div class="absolute bottom-6 right-6 flex flex-col gap-2">
      <button
        @click="scale = Math.min(scale + 0.2, 3)"
        class="bg-white rounded-lg p-2 shadow-lg hover:bg-gray-50 w-10 h-10 flex items-center justify-center font-bold"
        title="Zoom in"
      >
        +
      </button>
      <button
        @click="scale = Math.max(scale - 0.2, 0.3)"
        class="bg-white rounded-lg p-2 shadow-lg hover:bg-gray-50 w-10 h-10 flex items-center justify-center font-bold"
        title="Zoom out"
      >
        −
      </button>
      <button
        @click="resetView"
        class="bg-white rounded-lg p-2 shadow-lg hover:bg-gray-50 w-10 h-10 flex items-center justify-center text-sm"
        title="Reset view"
      >
        ⊙
      </button>
    </div>

    <!-- Info text -->
    <div class="absolute top-20 left-6 bg-white rounded-lg p-4 my-4 shadow-lg max-w-xs">
      <p class="text-sm text-gray-700">
        <span class="font-bold">{{ store.completedCount }}</span> trees planted
      </p>
      <p class="text-xs text-gray-500 mt-1">Drag to pan • Scroll to zoom • Hover to see tasks</p>
      <div class="mt-3 flex gap-2">
        <button
          @click="onResetForest"
          class="text-sm bg-red-50 text-red-600 px-3 py-1 rounded-md hover:bg-red-100"
          title="Reset forest"
        >
          Reset forest
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue'
import { useTodoStore } from '../stores/todoStore'
import Header from './Header.vue'

// Import tree sprites
import oak1Img from '../assets/treesprites/oak1.png'
import oak2Img from '../assets/treesprites/oak2.png'
import appleImg from '../assets/fruitsprites/apple.png'
import orangeImg from '../assets/fruitsprites/orange.png'

const store = useTodoStore()

const pan = ref({ x: 0, y: 0 })
const scale = ref(1)
const hoveredTreeId = ref(null)
const svgCanvas = ref(null)
const centeredInitially = ref(false)
const lakes = computed(() => (store.features || []).filter(f => f && f.type === 'lake'))
const bunnies = computed(() => (store.features || []).filter(f => f && f.type === 'bunny'))

// Sort trees by y-value for proper z-ordering (trees further back render first)
const sortedTrees = computed(() => [...store.trees].sort((a, b) => a.y - b.y))

const GRID_SPACING_X = 120
const GRID_SPACING_Y = 35
const LAKE_RHOMBUS_WIDTH = GRID_SPACING_X * 2
const LAKE_RHOMBUS_HEIGHT = GRID_SPACING_Y * 2

function snapToGridPoint(x, y) {
  const row = Math.round(y / GRID_SPACING_Y)
  const rowOffset = row % 2 === 0 ? 0 : GRID_SPACING_X / 2
  const col = Math.round((x - rowOffset) / GRID_SPACING_X)
  return {
    x: col * GRID_SPACING_X + rowOffset,
    y: row * GRID_SPACING_Y
  }
}

const renderTrees = computed(() => {
  return sortedTrees.value.map(tree => {
    const base = tree.baseX != null && tree.baseY != null
      ? { x: tree.baseX, y: tree.baseY }
      : snapToGridPoint(tree.x + 40, tree.y + 80)
    return {
      ...tree,
      baseX: base.x,
      baseY: base.y,
      renderX: tree.x,
      renderY: tree.y
    }
  })
})

const renderLakes = computed(() => {
  return lakes.value.map(lake => {
    const base = snapToGridPoint(lake.x + 40, lake.y + 40)
    return {
      ...lake,
      centerX: base.x,
      centerY: base.y
    }
  })
})

function generateLakeBlobPoints(lakeCenterId, numPoints = 12) {
  const rhombusHalfW = 97.2
  const rhombusHalfH = 28.35
  
  // Seeded random function based on lake ID (convert to string first)
  const idStr = String(lakeCenterId)
  const seededRandom = ((seed) => {
    return () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
  })(idStr.charCodeAt(0) || 42)
  
  const points = []
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2
    // Add variation to radius (75% to 100% of max distance from center)
    const radiusVariation = 0.75 + seededRandom() * 0.25
    const t = radiusVariation
    const x = Math.cos(angle) * rhombusHalfW * t
    const y = Math.sin(angle) * rhombusHalfH * t
    points.push({ x, y })
  }
  
  return points
}

const lakeBlobPaths = computed(() => {
  try {
    return renderLakes.value.map(lake => {
      const blobPoints = generateLakeBlobPoints(lake.id)
      const smoothed = chaikinSmooth(blobPoints, 2)
      const path = buildSmoothPath(smoothed)
      return { id: lake.id, path }
    })
  } catch (e) {
    console.error('Error generating lake blob paths:', e)
    return []
  }
})

const bunnyLayers = computed(() => {
  const back = []
  const front = []
  const trees = renderTrees.value

  bunnies.value.forEach(bunny => {
    const bx = bunny.px + 40
    const by = bunny.py + 80
    let behindTree = false

    for (const tree of trees) {
      const tx = tree.renderX + 40
      const ty = tree.renderY + 80
      if (Math.abs(bx - tx) < 40 && by < ty) {
        behindTree = true
        break
      }
    }

    if (behindTree) back.push(bunny)
    else front.push(bunny)
  })

  return { back, front }
})

const LAND_PADDING = 140
const MIN_LAND_PADDING = 10
const landBounds = computed(() => {
  const points = []

  renderTrees.value.forEach(tree => {
    points.push({ x: tree.renderX + 40, y: tree.renderY + 80 })
  })

  renderLakes.value.forEach(lake => {
    points.push({ x: lake.centerX, y: lake.centerY })
  })

  if (points.length === 0) {
    return { polygon: [], circle: null, capsule: null }
  }

  const hull = getConvexHull(points)
  const effectivePadding = Math.max(MIN_LAND_PADDING, LAND_PADDING)

  if (hull.length === 1) {
    const p = hull[0]
    return { polygon: [], circle: { x: p.x, y: p.y, r: effectivePadding }, capsule: null }
  }

  if (hull.length === 2) {
    return {
      polygon: [],
      circle: null,
      capsule: {
        a: hull[0],
        b: hull[1],
        r: effectivePadding
      }
    }
  }

  const padded = expandHull(hull, effectivePadding)
  const smoothed = chaikinSmooth(padded, 2)
  const reexpanded = expandHull(smoothed, MIN_LAND_PADDING)
  return { polygon: reexpanded, circle: null, capsule: null }
})

const landPath = computed(() => {
  if (landBounds.value.circle) {
    const { x, y, r } = landBounds.value.circle
    return buildCirclePath(x, y, r)
  }

  if (landBounds.value.capsule) {
    const { a, b, r } = landBounds.value.capsule
    return buildCapsulePath(a, b, r)
  }

  if (landBounds.value.polygon.length === 0) return ''
  return buildSmoothPath(landBounds.value.polygon)
})

function getConvexHull(points) {
  const sorted = [...points].sort((a, b) => (a.x - b.x) || (a.y - b.y))
  if (sorted.length <= 1) return sorted

  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lower = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }

  const upper = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }

  upper.pop()
  lower.pop()
  return lower.concat(upper)
}

function expandHull(points, padding) {
  const centroid = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  centroid.x /= points.length
  centroid.y /= points.length

  return points.map(p => {
    const dx = p.x - centroid.x
    const dy = p.y - centroid.y
    const len = Math.hypot(dx, dy) || 1
    return {
      x: p.x + (dx / len) * padding,
      y: p.y + (dy / len) * padding
    }
  })
}

function buildSmoothPath(points) {
  if (points.length === 0) {
    return ''
  }
  
  if (points.length === 1) {
    const p = points[0]
    return `M ${p.x},${p.y} L ${p.x + 1},${p.y}`
  }

  if (points.length === 2) {
    const [a, b] = points
    return `M ${a.x},${a.y} L ${b.x},${b.y}`
  }

  const mid = (p1, p2) => ({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 })
  const pts = points.slice()
  const midPoints = pts.map((p, i) => mid(p, pts[(i + 1) % pts.length]))

  let d = `M ${midPoints[0].x},${midPoints[0].y}`
  for (let i = 0; i < pts.length; i++) {
    const control = pts[(i + 1) % pts.length]
    const nextMid = midPoints[(i + 1) % pts.length]
    d += ` Q ${control.x},${control.y} ${nextMid.x},${nextMid.y}`
  }
  d += ' Z'
  return d
}

function chaikinSmooth(points, iterations) {
  let pts = points
  for (let i = 0; i < iterations; i++) {
    const next = []
    for (let j = 0; j < pts.length; j++) {
      const p0 = pts[j]
      const p1 = pts[(j + 1) % pts.length]
      const q = {
        x: 0.75 * p0.x + 0.25 * p1.x,
        y: 0.75 * p0.y + 0.25 * p1.y
      }
      const r = {
        x: 0.25 * p0.x + 0.75 * p1.x,
        y: 0.25 * p0.y + 0.75 * p1.y
      }
      next.push(q, r)
    }
    pts = next
  }
  return pts
}

function buildCirclePath(cx, cy, r) {
  return `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`
}

function buildCapsulePath(a, b, r) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const px = -uy
  const py = ux

  const a1 = { x: a.x + px * r, y: a.y + py * r }
  const a2 = { x: a.x - px * r, y: a.y - py * r }
  const b1 = { x: b.x + px * r, y: b.y + py * r }
  const b2 = { x: b.x - px * r, y: b.y - py * r }

  return [
    `M ${a1.x},${a1.y}`,
    `L ${b1.x},${b1.y}`,
    `A ${r},${r} 0 0,1 ${b2.x},${b2.y}`,
    `L ${a2.x},${a2.y}`,
    `A ${r},${r} 0 0,1 ${a1.x},${a1.y}`,
    'Z'
  ].join(' ')
}

function isInLand(px, py) {
  const { polygon, circle } = landBounds.value
  const { capsule } = landBounds.value
  if (!circle && !capsule && (!polygon || polygon.length < 3)) return false
  if (circle) {
    const dx = px - circle.x
    const dy = py - circle.y
    return dx * dx + dy * dy <= circle.r * circle.r
  }
  if (capsule) {
    return isInCapsule(px, py, capsule.a, capsule.b, capsule.r)
  }
  if (!polygon || polygon.length < 3) return false
  return isPointInPolygon({ x: px, y: py }, polygon)
}

function clampToLand(px, py) {
  const { polygon, circle } = landBounds.value
  const { capsule } = landBounds.value
  if (circle) {
    const dx = px - circle.x
    const dy = py - circle.y
    const len = Math.hypot(dx, dy) || 1
    const clampedLen = Math.min(len, circle.r)
    return { x: circle.x + (dx / len) * clampedLen, y: circle.y + (dy / len) * clampedLen }
  }

  if (capsule) {
    const dx = capsule.b.x - capsule.a.x
    const dy = capsule.b.y - capsule.a.y
    const len2 = dx * dx + dy * dy || 1
    let t = ((px - capsule.a.x) * dx + (py - capsule.a.y) * dy) / len2
    t = Math.max(0, Math.min(1, t))
    const cx = capsule.a.x + t * dx
    const cy = capsule.a.y + t * dy
    const ddx = px - cx
    const ddy = py - cy
    const len = Math.hypot(ddx, ddy) || 1
    const clampedLen = Math.min(len, capsule.r)
    return { x: cx + (ddx / len) * clampedLen, y: cy + (ddy / len) * clampedLen }
  }

  if (!polygon || polygon.length < 3) return { x: px, y: py }
  if (isPointInPolygon({ x: px, y: py }, polygon)) return { x: px, y: py }

  const centroid = polygon.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  centroid.x /= polygon.length
  centroid.y /= polygon.length

  let cx = px
  let cy = py
  for (let i = 0; i < 12; i++) {
    cx = (cx + centroid.x) / 2
    cy = (cy + centroid.y) / 2
    if (isPointInPolygon({ x: cx, y: cy }, polygon)) break
  }

  return { x: cx, y: cy }
}

function isInCapsule(px, py, a, b, r) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy || 1
  let t = ((px - a.x) * dx + (py - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const cx = a.x + t * dx
  const cy = a.y + t * dy
  const ddx = px - cx
  const ddy = py - cy
  return ddx * ddx + ddy * ddy <= r * r
}

function isPointInPolygon(point, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })
function startPan(e) {
  isPanning.value = true
  panStart.value = { x: e.clientX - pan.value.x, y: e.clientY - pan.value.y }
}

function handlePan(e) {
  if (!isPanning.value) return
  pan.value.x = e.clientX - panStart.value.x
  pan.value.y = e.clientY - panStart.value.y
}

function endPan() {
  isPanning.value = false
}

function handleZoom(e) {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  scale.value = Math.max(0.3, Math.min(scale.value + delta, 3))
}

function resetView() {
  if (store.trees.length === 0) {
    // No trees, just reset to origin
    pan.value = { x: 0, y: 0 }
    scale.value = 1
    return
  }

  // Calculate bounding box of all trees
  let minX = store.trees[0].x
  let maxX = store.trees[0].x
  let minY = store.trees[0].y
  let maxY = store.trees[0].y

  for (const tree of store.trees) {
    minX = Math.min(minX, tree.x)
    maxX = Math.max(maxX, tree.x)
    minY = Math.min(minY, tree.y)
    maxY = Math.max(maxY, tree.y)
  }

  // Calculate center of tree cluster
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  // Get SVG canvas dimensions
  const canvas = svgCanvas.value
  const viewportWidth = canvas?.clientWidth || window.innerWidth
  const viewportHeight = canvas?.clientHeight || window.innerHeight

  // Calculate required scale to fit all trees with padding
  const clusterWidth = maxX - minX + 160 // Add padding
  const clusterHeight = maxY - minY + 160
  const scaleX = viewportWidth / clusterWidth
  const scaleY = viewportHeight / clusterHeight
  scale.value = Math.min(scaleX, scaleY, 1.5) // Cap scale to 1.5x for zoomed in view

  // Calculate pan to center the cluster
  pan.value.x = (viewportWidth / 2) - (centerX * scale.value)
  pan.value.y = (viewportHeight / 2) - (centerY * scale.value)
}

function centerOnTrees() {
  if (store.trees.length === 0) {
    pan.value = { x: 0, y: 0 }
    scale.value = 1
    return
  }

  let minX = store.trees[0].x
  let maxX = store.trees[0].x
  let minY = store.trees[0].y
  let maxY = store.trees[0].y

  for (const tree of store.trees) {
    minX = Math.min(minX, tree.x)
    maxX = Math.max(maxX, tree.x)
    minY = Math.min(minY, tree.y)
    maxY = Math.max(maxY, tree.y)
  }

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const canvas = svgCanvas.value || document.querySelector('svg')
  const viewportWidth = canvas?.clientWidth || window.innerWidth
  const viewportHeight = canvas?.clientHeight || window.innerHeight

  const clusterWidth = Math.max(160, maxX - minX + 160)
  const clusterHeight = Math.max(160, maxY - minY + 160)
  const scaleX = viewportWidth / clusterWidth
  const scaleY = viewportHeight / clusterHeight
  scale.value = Math.min(scaleX, scaleY, 1.5)

  pan.value.x = (viewportWidth / 2) - (centerX * scale.value)
  pan.value.y = (viewportHeight / 2) - (centerY * scale.value)
}

onMounted(() => {
  // delay slightly so SVG has layout
  setTimeout(() => {
    if (store.trees.length > 0 && !centeredInitially.value) {
      centerOnTrees()
      centeredInitially.value = true
    }
  }, 50)
})

watch(() => store.trees.length, (len) => {
  if (len > 0 && !centeredInitially.value) {
    centerOnTrees()
    centeredInitially.value = true
  }
})

function getTodoText(todoId) {
  const todo = store.todos.find(t => t.id === todoId)
  return todo?.text || 'Unknown task'
}

function formatCompletedDateTime(dateTimeStr) {
  if (!dateTimeStr) return 'Unknown'
  try {
    const date = new Date(dateTimeStr)
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } catch {
    return dateTimeStr
  }
}

// --- Bunny roaming / feature animation ---
function isInFoliage(px, py) {
  // Check against all grown-tree foliage areas (use same centers as drawn: tree.x+40, tree.y+40)
  for (const t of store.trees) {
    const cx = t.x + 40
    const cy = t.y + 40
    // approximate foliage radius
    const r = t.stage === 'sapling' ? 18 : 28
    const dx = px - cx
    const dy = py - cy
    if (dx * dx + dy * dy <= r * r) return true
  }
  return false
}

function isInLake(px, py) {
  const halfW = LAKE_RHOMBUS_WIDTH / 2
  const halfH = LAKE_RHOMBUS_HEIGHT / 2
  for (const f of renderLakes.value) {
    const dx = Math.abs(px - f.centerX)
    const dy = Math.abs(py - f.centerY)
    if ((dx / halfW) + (dy / halfH) <= 1) return true
  }
  return false
}

function pickTargetFor(feature) {
  // Try to find a random nearby target not inside foliage
  const maxAttempts = 32
  let bestTarget = null
  let bestScore = -Infinity
  for (let i = 0; i < maxAttempts; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = 20 + Math.random() * 160
    const tx = feature.x + Math.cos(angle) * dist
    const ty = feature.y + Math.sin(angle) * dist
    const landX = tx + 40
    const landY = ty + 80
    if (!isInFoliage(tx + 40, ty + 40) && !isInLake(tx + 40, ty + 40) && isInLand(landX, landY)) {
      const score = distanceToNearestTree(landX, landY)
      if (score > bestScore) {
        bestScore = score
        bestTarget = { tx, ty }
      }
    }
  }
  if (bestTarget) {
    feature.tx = bestTarget.tx
    feature.ty = bestTarget.ty
    return
  }
  // fallback to staying in place
  feature.tx = feature.x
  feature.ty = feature.y
}

function distanceToNearestTree(x, y) {
  if (renderTrees.value.length === 0) return 0
  let minDist2 = Infinity
  for (const tree of renderTrees.value) {
    const cx = tree.renderX + 40
    const cy = tree.renderY + 80
    const dx = x - cx
    const dy = y - cy
    const d2 = dx * dx + dy * dy
    if (d2 < minDist2) minDist2 = d2
  }
  return Math.sqrt(minDist2)
}

let _animId = null
let _lastTime = performance.now()
function animateFeatures(now) {
  const dt = Math.max(0, now - _lastTime) / 16.666 // ~60fps baseline
  _lastTime = now

  for (const f of store.features) {
    if (f.type !== 'bunny') continue
    // ensure px/py exist
    if (f.px == null) { f.px = f.x; f.py = f.y }
    
    // initialize state for new bunnies
    if (!f.state) {
      f.state = 'idle'
      f.stateTimer = 0
      f.stateTarget = 5000 + Math.random() * 10000 // 5-15 seconds in idle
    }

    // if a bunny was created already in 'moving' state (spawn behavior),
    // ensure it has a movement target immediately so it moves for the spawn duration
    if (f.state === 'moving' && (f.tx == null || (Math.abs(f.tx - f.px) < 0.5 && Math.abs(f.ty - f.py) < 0.5))) {
      pickTargetFor(f)
    }

    // update state timer
    f.stateTimer += dt * 16.666 // convert back to ms

    // check if we should switch states
    if (f.stateTimer >= f.stateTarget) {
      if (f.state === 'idle') {
        // switch to moving
        f.state = 'moving'
        f.stateTimer = 0
        f.stateTarget = 3000 + Math.random() * 2000 // 3-5 seconds moving
        pickTargetFor(f)
      } else {
        // switch back to idle
        f.state = 'idle'
        f.stateTimer = 0
        f.stateTarget = 5000 + Math.random() * 10000 // 5-15 seconds idle
        f.tx = f.px
        f.ty = f.py
      }
    }

    // only move if in moving state
    if (f.state === 'moving') {
      const dx = f.tx - f.px
      const dy = f.ty - f.py
      const dist2 = dx * dx + dy * dy

      if (dist2 < 1) {
        pickTargetFor(f)
      }

      const dist = Math.sqrt(dist2) || 1
      const step = (f.speed || 0.6) * dt
      const nx = f.px + (dx / dist) * step
      const ny = f.py + (dy / dist) * step

      // avoid moving into foliage: if next step would collide, pick new target
      const landX = nx + 40
      const landY = ny + 80
      if (!isInFoliage(nx + 40, ny + 40) && isInLand(landX, landY)) {
        f.px = nx
        f.py = ny
      } else {
        const clamped = clampToLand(landX, landY)
        f.px = clamped.x - 40
        f.py = clamped.y - 80
        pickTargetFor(f)
      }
    }
  }

  _animId = requestAnimationFrame(animateFeatures)
}

onMounted(() => {
  // start bunny animation
  _lastTime = performance.now()
  _animId = requestAnimationFrame(animateFeatures)
})

onBeforeUnmount(() => {
  if (_animId) cancelAnimationFrame(_animId)
})

function undoTree(treeId) {
  // Find the tree and get its todoId
  const tree = store.trees.find(t => t.id === treeId)
  if (tree) {
    // Toggle the todo to mark it incomplete, which will remove the tree
    store.toggleTodo(tree.todoId)
    hoveredTreeId.value = null
  }
}

function onResetForest() {
  if (confirm('Reset forest? This will remove all trees and mark tasks incomplete.')) {
    store.resetForest()
    // clear any hovered state and reload to ensure UI is fully reset
    hoveredTreeId.value = null
    // reload will re-run loadFromLocalStorage and render the cleared forest
    window.location.reload()
  }
}

function getTreeSpritePath(sprite) {
  const sprites = {
    oak1: oak1Img,
    oak2: oak2Img
  }
  return sprites[sprite] || oak1Img
}

function getFruitSpritePath(sprite) {
  const sprites = {
    apple: appleImg,
    orange: orangeImg
  }
  return sprites[sprite] || appleImg
}
</script>