<template>
  <div class="bg-gray-50 p-6 w-96 h-screen overflow-y-auto relative">
    <h2 class="text-2xl font-bold text-gray-800 mb-4">Task Log</h2>
    
    <TodoInput />
    
    <!-- In Progress Section -->
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-green-600 mb-2 uppercase tracking-wide">🌱 In Progress</h3>
      <div 
        @drop="handleDrop($event, null)"
        @dragover.prevent
        @dragenter.prevent
        class="space-y-2 min-h-20 p-2 rounded-lg border-2 border-dashed border-transparent hover:border-green-200 transition-colors"
        :class="{ 'border-green-300 bg-green-50': isDraggingOver === 'inProgress' }"
        @dragenter="isDraggingOver = 'inProgress'"
        @dragleave="isDraggingOver = null"
      >
        <TodoItem 
          v-for="todo in store.inProgressTodos" 
          :key="todo.id"
          :todo="todo"
          @dragStart="startDrag"
        />
        <div v-if="store.inProgressTodos.length === 0" class="text-center text-gray-400 py-4 text-sm">
          No tasks in progress
        </div>
      </div>
    </div>
    
    <!-- Priority Section -->
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-red-400 mb-2 uppercase tracking-wide">Priority</h3>
      <div 
        @drop="handleDrop($event, true)"
        @dragover.prevent
        @dragenter.prevent
        class="space-y-2 min-h-20 p-2 rounded-lg border-2 border-dashed border-transparent hover:border-red-200 transition-colors"
        :class="{ 'border-red-300 bg-red-50': isDraggingOver === 'priority' }"
        @dragenter="isDraggingOver = 'priority'"
        @dragleave="isDraggingOver = null"
      >
        <TodoItem 
          v-for="todo in store.priorityTodos" 
          :key="todo.id"
          :todo="todo"

          @dragStart="startDrag"
        />
        <div v-if="store.priorityTodos.length === 0" class="text-center text-gray-400 py-4 text-sm">
          Drag tasks here to prioritize
        </div>
      </div>
    </div>

    <!-- Remaining Section -->
    <div>
      <h3 class="text-sm font-semibold text-yellow-400 mb-2 uppercase tracking-wide">Remaining</h3>
      <div 
        @drop="handleDrop($event, false)"
        @dragover.prevent
        @dragenter.prevent
        class="space-y-2 min-h-20 p-2 rounded-lg border-2 border-dashed border-transparent hover:border-yellow-200 transition-colors"
        :class="{ 'border-yellow-300 bg-yellow-50': isDraggingOver === 'remaining' }"
        @dragenter="isDraggingOver = 'remaining'"
        @dragleave="isDraggingOver = null"
      >
        <TodoItem 
          v-for="todo in store.remainingTodos" 
          :key="todo.id"
          :todo="todo"

          @dragStart="startDrag"
        />
        <div v-if="store.remainingTodos.length === 0" class="text-center text-gray-400 py-4 text-sm">
          No remaining tasks
        </div>
      </div>
    </div>


  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useTodoStore } from '../stores/todoStore'
import TodoInput from './TodoInput.vue'
import TodoItem from './TodoItem.vue'

const store = useTodoStore()
const draggedTodo = ref(null)
const isDraggingOver = ref(null)

function startDrag(todo) {
  draggedTodo.value = todo
}

function handleDrop(e, isPriority) {
  e.preventDefault()
  if (draggedTodo.value) {
    if (isPriority === null) {
      store.toggleInProgress(draggedTodo.value.id)
      store.setPriority(draggedTodo.value.id, false)
    } else {
      store.setPriority(draggedTodo.value.id, isPriority)
      if (draggedTodo.value.inProgress) {
        store.toggleInProgress(draggedTodo.value.id)
      }
    }
    draggedTodo.value = null
    isDraggingOver.value = null
  }
}
</script>