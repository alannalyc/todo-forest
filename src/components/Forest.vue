<template>
  <div class="w-full h-full bg-cyan-200 overflow-hidden relative py-4">
    <Header />
    <!-- SVG Canvas for isometric rendering -->
    <svg
      ref="svgCanvas"
      class="w-full h-full cursor-grab bg-green-300 active:cursor-grabbing"
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
        <!-- Trunks & hit areas (emit hover events) -->
        <g>
          <g
            v-for="tree in store.trees"
            :key="`trunk-${tree.id}`"
            class="cursor-pointer"
          >
            <g :transform="`translate(${tree.x + 40}, ${tree.y + 40})`">
              <g v-if="tree.stage === 'sapling'">
                <!-- Sapling trunk only (leaves minimal) -->
                <rect x="-4" y="-12" width="8" height="20" fill="#8B6F47" stroke="#654321" stroke-width="0.6" rx="1"/>
              </g>
              <g v-else>
                <!-- Tree trunk (brown cube) -->
                <polygon points="0,-20 9,-10 5,10 0,15, -5,10 -9,-10" fill="#8B6F47" stroke="#654321" stroke-width="1"/>
              </g>
            </g>
          </g>
        </g>

        <!-- Features (bunnies + lakes) rendered above trunks but below foliage -->
        <g>
          <!-- Lakes -->
          <g v-for="f in lakes" :key="`lake-${f.id}`">
            <g :transform="`translate(${f.x + 40}, ${f.y + 40})`">
              <ellipse cx="0" cy="0" rx="40" ry="20" fill="#60A5FA" opacity="0.9" />
              <ellipse cx="-6" cy="-3" rx="14" ry="6" fill="#93C5FD" opacity="0.5" />
            </g>
          </g>

          <!-- Bunnies -->
          <g v-for="f in bunnies" :key="`bunny-${f.id}`">
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

        <!-- Foliage and tooltips (drawn last to appear above bunnies) -->
        <g>
          <g v-for="tree in store.trees" :key="`foliage-${tree.id}`"
            @mouseenter="hoveredTreeId = tree.id"
            @mouseleave="hoveredTreeId = null"
          >
            <!-- Expanded hover hitbox covering tree + tooltip -->
            <rect
              :x="tree.x - 120"
              :y="tree.y - 100"
              width="240"
              height="140"
              fill="transparent"
              pointer-events="all"
            />
            <g :transform="`translate(${tree.x + 40}, ${tree.y + 40})`" v-if="tree.stage !== 'sapling'">
              <!-- Tree foliage (green circles in isometric arrangement) -->
              <circle cx="0" cy="-25" r="12" fill="#22C55E" opacity="0.8"/>
              <circle cx="12" cy="-15" r="12" fill="#16A34A" opacity="0.8"/>
              <circle cx="-12" cy="-15" r="12" fill="#16A34A" opacity="0.8"/>
              <!-- Highlight -->
              <circle cx="0" cy="-25" r="3" fill="#FFF" opacity="0.4"/>
            </g>
            <g v-else :transform="`translate(${tree.x + 40}, ${tree.y + 40})`">
              <!-- sapling branches + leaves (kept above trunk) -->
              <path d="M0,-8 C-10,-14 -14,-20 -10,-22" stroke="#4C7A2A" stroke-width="1.2" fill="none" stroke-linecap="round"/>
              <path d="M0,-8 C10,-14 14,-20 10,-22" stroke="#4C7A2A" stroke-width="1.2" fill="none" stroke-linecap="round"/>
              <circle cx="-8" cy="-22" r="4" fill="#22C55E"/>
              <circle cx="8" cy="-22" r="4" fill="#22C55E"/>
            </g>

            <!-- Tooltip on hover (drawn outside inner group so coordinates align with tree.x/tree.y) -->
            <g v-if="hoveredTreeId === tree.id" pointer-events="none">
              <rect
                :x="tree.x - 110"
                :y="tree.y - 85"
                width="220"
                height="90"
                rx="6"
                fill="#000"
                opacity="0.95"
              />
              <!-- Task label -->
              <text
                :x="tree.x - 100"
                :y="tree.y - 65"
                fill="#FFF"
                font-size="10"
                font-weight="bold"
                class="pointer-events-none"
              >
                Task:
              </text>
              <!-- Task text (truncated if too long) -->
              <text
                :x="tree.x - 100"
                :y="tree.y - 52"
                fill="#CCC"
                font-size="10"
                class="pointer-events-none"
                style="word-wrap: break-word; max-width: 200px"
              >
                {{ getTodoText(tree.todoId).substring(0, 30) }}{{ getTodoText(tree.todoId).length > 30 ? '...' : '' }}
              </text>
              <!-- Completed label -->
              <text
                :x="tree.x - 100"
                :y="tree.y - 35"
                fill="#FFF"
                font-size="10"
                font-weight="bold"
                class="pointer-events-none"
              >
                Completed:
              </text>
              <!-- Date and time -->
              <text
                :x="tree.x - 100"
                :y="tree.y - 22"
                fill="#CCC"
                font-size="9"
                class="pointer-events-none"
              >
                {{ formatCompletedDateTime(tree.dateCompleted) }}
              </text>
              <!-- Undo button -->
              <foreignObject
                :x="tree.x - 100"
                :y="tree.y - 10"
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

const store = useTodoStore()

const pan = ref({ x: 0, y: 0 })
const scale = ref(1)
const hoveredTreeId = ref(null)
const svgCanvas = ref(null)
const centeredInitially = ref(false)
const lakes = computed(() => (store.features || []).filter(f => f && f.type === 'lake'))
const bunnies = computed(() => (store.features || []).filter(f => f && f.type === 'bunny'))

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
  for (const f of store.features) {
    if (f.type !== 'lake') continue
    const cx = f.x + 40
    const cy = f.y + 40
    const dx = px - cx
    const dy = py - cy
    if ((dx * dx) / (40 * 40) + (dy * dy) / (20 * 20) <= 1) return true
  }
  return false
}

function pickTargetFor(feature) {
  // Try to find a random nearby target not inside foliage
  const maxAttempts = 16
  for (let i = 0; i < maxAttempts; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = 20 + Math.random() * 160
    const tx = feature.x + Math.cos(angle) * dist
    const ty = feature.y + Math.sin(angle) * dist
    if (!isInFoliage(tx + 40, ty + 40) && !isInLake(tx + 40, ty + 40)) {
      feature.tx = tx
      feature.ty = ty
      return
    }
  }
  // fallback to staying in place
  feature.tx = feature.x
  feature.ty = feature.y
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
      if (!isInFoliage(nx + 40, ny + 40)) {
        f.px = nx
        f.py = ny
      } else {
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
</script>