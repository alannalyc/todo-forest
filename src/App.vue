<template>
  <div class="min-h-screen bg-green-50 flex">
    <!-- Left side - Forest with Header inside -->
    <div class="flex-1 bg-sky-300 p-8 flex flex-col">
      
      <div class="flex-1 bg-green-300 rounded-2xl p-4">
        <Header />
        <p class="text-gray-500 text-center">Forest will go here</p>
      </div>
    </div>
    
    <!-- Right side - Todo List (full height) -->
    <TodoList />
  </div>
</template>

<script setup>
import Header from './components/Header.vue'
import TodoList from './components/TodoList.vue'
import { useTodoStore } from './stores/todoStore'
import { onMounted } from 'vue'

const store = useTodoStore()

onMounted(() => {
  store.loadFromLocalStorage()
})
</script>