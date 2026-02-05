<template>
  <div class="mb-4">
    <div class="flex gap-2">
      <input
        v-model="newTodo"
        @keyup.enter="addTodo"
        type="text"
        placeholder="Add a new task..."
        class="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 outline-none"
      />
      <button
        @click="addTodo"
        class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
      >
        Add
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useTodoStore } from '../stores/todoStore'

const store = useTodoStore()
const newTodo = ref('')

function addTodo() {
  if (newTodo.value.trim()) {
    store.addTodo(newTodo.value.trim())
    newTodo.value = ''
  }
}
</script>