<template>
  <div class="bg-green-100 rounded-xl p-3 shadow-sm inline-block ">
    <div v-if="!store.userName || isEditing" class="flex items-center gap-3">
      <input 
        v-model="nameInput"
        @keyup.enter="saveName"
        @blur="saveName"
        ref="nameInputField"
        type="text" 
        placeholder="What's your name?"
        class="border-b-2 border-gray-300 focus:border-green-500 outline-none px-2 py-1 text-4xl max-w-xs"
      />
      <h1 class="text-4xl font-bold text-green-700">Todo Forest ✓</h1>
    </div>
    
    <div v-else class="flex items-center gap-3">
      <h2 
        @click="editName"
        class="text-4xl italic text-green-600 cursor-pointer hover:text-green-700 hover:underline"
      >
        {{ store.userName }}'s
      </h2>
      <h1 class="text-4xl font-bold text-green-700">Todo Forest ✓</h1>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useTodoStore } from '../stores/todoStore'

const store = useTodoStore()
const nameInput = ref('')
const isEditing = ref(false)
const nameInputField = ref(null)

function saveName() {
  if (nameInput.value.trim()) {
    store.setUserName(nameInput.value.trim())
    isEditing.value = false
  }
}

function editName() {
  nameInput.value = store.userName
  isEditing.value = true
  nextTick(() => {
    nameInputField.value?.focus()
  })
}
</script>