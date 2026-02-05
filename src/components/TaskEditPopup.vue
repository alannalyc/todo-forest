<template>
  <div 
    class="absolute bg-white rounded-2xl shadow-xl p-6 w-80 border-2 border-gray-200 z-50 -right-96 top-1/2 -translate-y-1/2"
    @click.stop
  >
    <!-- Arrow pointing right to the task -->
    <div 
      class="absolute -right-3 w-6 h-6 bg-white border-r-2 border-t-2 border-gray-200 transform rotate-45"
      :style="{ top: 'calc(50% - 12px)' }"
    ></div>
    
    <div class="space-y-4 relative z-10">
      <!-- Task Name -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Task</label>
        <input
          v-model="editedText"
          @blur="updateTask"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
        />
      </div>

      <!-- Due Date -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
        <input
          v-model="editedDueDate"
          @change="updateTask"
          type="date"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
        />
      </div>

      <!-- Tags Placeholder -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tags</label>
        <div class="flex gap-2 flex-wrap p-3 border border-gray-300 rounded-lg min-h-12 bg-gray-50">
          <span class="text-gray-400 text-sm">Tags coming soon...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useTodoStore } from '../stores/todoStore'

const props = defineProps({
  todo: Object
})

const emit = defineEmits(['close'])

const store = useTodoStore()
const editedText = ref('')
const editedDueDate = ref('')

watch(() => props.todo, (newTodo) => {
  if (newTodo) {
    editedText.value = newTodo.text
    editedDueDate.value = newTodo.dueDate || ''
  }
}, { immediate: true })

function updateTask() {
  if (props.todo && editedText.value.trim()) {
    store.updateTodo(props.todo.id, {
      text: editedText.value.trim(),
      dueDate: editedDueDate.value || null
    })
  }
}
</script>