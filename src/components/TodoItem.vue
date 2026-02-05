<template>
  <div 
    draggable="true"
    @dragstart="handleDragStart"
    class="relative flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-gray-50 group cursor-move"
  >
    <input
      type="checkbox"
      :checked="todo.completed"
      @change="store.toggleTodo(todo.id)"
      @click.stop
      class="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
    />
    <span 
      @click.stop="openModal"
      :class="{ 'line-through text-gray-400': todo.completed }"
      class="flex-1 text-lg cursor-pointer"
    >
      {{ todo.text }}
    </span>
    <span v-if="todo.dueDate" class="text-sm text-gray-500">
      {{ formatDate(todo.dueDate) }}
    </span>
    <button
      @click.stop="store.deleteTodo(todo.id)"
      class="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 px-2"
    >
      ✕
    </button>

    <!-- Modal Popup -->
    <div 
      v-if="showModal"
      @click="showModal = false"
      class="fixed inset-0 z-40"
    />
    <div 
      v-if="showModal"
      class="fixed bg-white rounded-2xl shadow-xl p-6 w-80 border-2 border-gray-200 z-50"
      :style="{ 
        top: popupPosition.top + 'px',
        left: popupPosition.left + 'px',
        transform: 'translateY(-50%)'
      }"
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
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useTodoStore } from '../stores/todoStore'

const props = defineProps({
  todo: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['dragStart'])

const store = useTodoStore()
const showModal = ref(false)
const editedText = ref('')
const editedDueDate = ref('')
const popupPosition = ref({ top: 0, left: 0 })

async function openModal() {
  showModal.value = true
  await nextTick()
  // Position popup to the left of the task item
  const itemRect = event?.target?.closest('.relative')?.getBoundingClientRect?.()
  if (itemRect) {
    popupPosition.value = {
      top: itemRect.top + itemRect.height / 2,
      left: itemRect.left - 350
    }
  }
}

watch(() => props.todo, (newTodo) => {
  if (newTodo) {
    editedText.value = newTodo.text
    editedDueDate.value = newTodo.dueDate || ''
  }
}, { immediate: true })

function handleDragStart(e) {
  emit('dragStart', props.todo)
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function updateTask() {
  if (props.todo && editedText.value.trim()) {
    store.updateTodo(props.todo.id, {
      text: editedText.value.trim(),
      dueDate: editedDueDate.value || null
    })
  }
}
</script>