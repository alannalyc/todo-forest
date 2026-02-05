import { defineStore } from 'pinia'

export const useTodoStore = defineStore('todos', {
  state: () => ({
    userName: '',
    todos: [],
    tags: [],
    completedCount: 0
  }),
  
  getters: {
    priorityTodos: (state) => state.todos.filter(t => t.priority && !t.completed),
    remainingTodos: (state) => state.todos.filter(t => !t.priority && !t.completed),
    completedTodos: (state) => state.todos.filter(t => t.completed)
  },
  
  actions: {
    setUserName(name) {
      this.userName = name
      this.saveToLocalStorage()
    },

    addTodo(text, priority = false) {
      this.todos.push({
        id: Date.now(),
        text,
        completed: false,
        priority,
        tags: [],
        dueDate: null
      })
      this.saveToLocalStorage()
    },

    toggleTodo(id) {
      const todo = this.todos.find(t => t.id === id)
      if (todo) {
        todo.completed = !todo.completed
        if (todo.completed) {
          this.completedCount++
        } else {
          this.completedCount--
        }
        this.saveToLocalStorage()
      }
    },

    deleteTodo(id) {
      const todo = this.todos.find(t => t.id === id)
      if (todo && todo.completed) {
        this.completedCount--
      }
      this.todos = this.todos.filter(t => t.id !== id)
      this.saveToLocalStorage()
    },

    setPriority(id, isPriority) {
      const todo = this.todos.find(t => t.id === id)
      if (todo) {
        todo.priority = isPriority
        this.saveToLocalStorage()
      }
    },

    updateTodo(id, updates) {
      const todo = this.todos.find(t => t.id === id)
      if (todo) {
        Object.assign(todo, updates)
        this.saveToLocalStorage()
      }
    },

    saveToLocalStorage() {
      localStorage.setItem('todoForest', JSON.stringify({
        userName: this.userName,
        todos: this.todos,
        tags: this.tags,
        completedCount: this.completedCount
      }))
    },

    loadFromLocalStorage() {
      const saved = localStorage.getItem('todoForest')
      if (saved) {
        const data = JSON.parse(saved)
        this.userName = data.userName || ''
        this.todos = data.todos || []
        this.tags = data.tags || []
        this.completedCount = data.completedCount || 0
      }
    }
  }
})