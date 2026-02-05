<template>
  <div class="min-h-screen bg-green-300 flex">
    <!-- Left side - Forest -->
    <div class="flex-1 flex flex-col">
      <div class="p-4 bg-white shadow-sm">
        <Header />
      </div>
      <Forest />
    </div>
    
    <!-- Right side - Todo List (full height) -->
    <TodoList />
  </div>
</template>

<script setup>
import Header from './components/Header.vue'
import TodoList from './components/TodoList.vue'
import Forest from './components/Forest.vue'
import { useTodoStore } from './stores/todoStore'
import { onMounted } from 'vue'

const store = useTodoStore()

onMounted(() => {
  store.loadFromLocalStorage()
})
</script>