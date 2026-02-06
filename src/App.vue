<template>
  <div class="min-h-screen bg-black/0 flex">
    <!-- Left side - Forest -->
    <div class="flex-1 flex flex-col">
      <Forest />
    </div>
    
    <!-- Right side - Todo List (full height) -->
    <TodoList />
  </div>
</template>

<script setup>
import TodoList from './components/TodoList.vue'
import Forest from './components/Forest.vue'
import { useTodoStore } from './stores/todoStore'
import { onMounted } from 'vue'

const store = useTodoStore()

onMounted(() => {
  store.loadFromLocalStorage()
})
</script>