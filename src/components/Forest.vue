<template>
  <div class="w-full h-full bg-green-300 overflow-hidden relative">
    <!-- SVG Canvas for isometric rendering -->
    <svg
      ref="svgCanvas"
      class="w-full h-full cursor-grab active:cursor-grabbing"
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
      
      <!-- Trees -->
      <g :transform="`translate(${pan.x}, ${pan.y}) scale(${scale})`">
        <g
          v-for="tree in store.trees"
          :key="tree.id"
          @mouseenter="hoveredTreeId = tree.id"
          @mouseleave="hoveredTreeId = null"
          class="cursor-pointer"
        >
          <!-- Isometric cube placeholder tree -->
          <g :transform="`translate(${tree.x + 40}, ${tree.y + 40})`">
            <!-- Tree trunk (brown cube) -->
            <polygon points="0,-20 15,-10 15,10 0,20 -15,10 -15,-10" fill="#8B6F47" stroke="#654321" stroke-width="1"/>
            
            <!-- Tree foliage (green circles in isometric arrangement) -->
            <circle cx="0" cy="-25" r="12" fill="#22C55E" opacity="0.8"/>
            <circle cx="12" cy="-15" r="12" fill="#16A34A" opacity="0.8"/>
            <circle cx="-12" cy="-15" r="12" fill="#16A34A" opacity="0.8"/>
            
            <!-- Highlight for better isometric effect -->
            <circle cx="0" cy="-25" r="3" fill="#FFF" opacity="0.4"/>
          </g>
          
          <!-- Tooltip on hover -->
          <g v-if="hoveredTreeId === tree.id">
            <rect
              :x="tree.x - 70"
              :y="tree.y - 55"
              width="140"
              height="50"
              rx="4"
              fill="#000"
              opacity="0.9"
            />
            <text
              :x="tree.x"
              :y="tree.y - 35"
              text-anchor="middle"
              fill="#FFF"
              font-size="11"
              font-weight="bold"
              class="pointer-events-none"
            >
              {{ getTodoText(tree.todoId) }}
            </text>
            <text
              :x="tree.x"
              :y="tree.y - 20"
              text-anchor="middle"
              fill="#CCC"
              font-size="9"
              class="pointer-events-none"
            >
              Completed: {{ tree.dateCompleted }}
            </text>
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
    <div class="absolute top-6 left-6 bg-white rounded-lg p-4 shadow-lg max-w-xs">
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
import { ref } from 'vue'
import { useTodoStore } from '../stores/todoStore'

const store = useTodoStore()

const pan = ref({ x: 0, y: 0 })
const scale = ref(1)
const hoveredTreeId = ref(null)

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
  pan.value = { x: 0, y: 0 }
  scale.value = 1
}

function getTodoText(todoId) {
  const todo = store.todos.find(t => t.id === todoId)
  return todo?.text || 'Unknown task'
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
