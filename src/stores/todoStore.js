import { defineStore } from 'pinia'

export const useTodoStore = defineStore('todos', {
  state: () => ({
    userName: '',
    todos: [],
    tags: [],
    completedCount: 0,
    trees: []
  }),
  
  getters: {
    inProgressTodos: (state) => state.todos.filter(t => t.inProgress && !t.completed),
    priorityTodos: (state) => state.todos.filter(t => t.priority && !t.inProgress && !t.completed),
    remainingTodos: (state) => state.todos.filter(t => !t.priority && !t.inProgress && !t.completed),
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
        dueDate: null,
        inProgress: false
      })
      this.saveToLocalStorage()
    },

    toggleTodo(id) {
      const todo = this.todos.find(t => t.id === id)
      if (todo) {
        todo.completed = !todo.completed
        if (todo.completed) {
          this.completedCount++
          this.createTree(id)
        } else {
          this.completedCount--
          this.removeTree(id)
        }
        this.saveToLocalStorage()
      }
    },

    createTree(todoId) {
      // Check if tree already exists for this todo
      if (!this.trees.find(t => t.todoId === todoId)) {
        let x = 0
        let y = 0
        
        if (this.trees.length > 0) {
          // Place adjacent to existing trees in random isometric direction
          const existingTree = this.trees[this.trees.length - 1]
            // Build a set of occupied positions for quick lookup
            const occupied = new Set(this.trees.map(t => `${t.x},${t.y}`))

            // Default position
            let x = 0
            let y = 0

            if (this.trees.length > 0) {
              // Start from the most recently planted tree and try adjacent spots
              const existingTree = this.trees[this.trees.length - 1]
              const directions = [
                { dx: 80, dy: 0 },    // Right
                { dx: 40, dy: -40 },  // Upper-right
                { dx: -40, dy: -40 }, // Upper-left
                { dx: -80, dy: 0 },   // Left
                { dx: -40, dy: 40 },  // Lower-left
                { dx: 40, dy: 40 }    // Lower-right
              ]

              // Shuffle directions to randomize growth
              for (let i = directions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                ;[directions[i], directions[j]] = [directions[j], directions[i]]
              }

              // Try immediate neighbors first
              let found = false
              for (const d of directions) {
                const nx = existingTree.x + d.dx
                const ny = existingTree.y + d.dy
                if (!occupied.has(`${nx},${ny}`)) {
                  x = nx
                  y = ny
                  found = true
                  break
                }
              }

              // If all adjacent spots are occupied, expand outward along directions
              if (!found) {
                for (let radius = 2; radius <= 8 && !found; radius++) {
                  for (const d of directions) {
                    const nx = existingTree.x + d.dx * radius
                    const ny = existingTree.y + d.dy * radius
                    if (!occupied.has(`${nx},${ny}`)) {
                      x = nx
                      y = ny
                      found = true
                      break
                    }
                  }
                }
              }

              // If still not found (extremely unlikely), fall back to scanning for any free grid cell
              if (!found) {
                const scanRange = 12
                outer: for (let rx = -scanRange; rx <= scanRange; rx++) {
                  for (let ry = -scanRange; ry <= scanRange; ry++) {
                    const nx = existingTree.x + rx * 40
                    const ny = existingTree.y + ry * 40
                    if (!occupied.has(`${nx},${ny}`)) {
                      x = nx
                      y = ny
                      found = true
                      break outer
                    }
                  }
                }
              }
            }

            this.trees.push({
              id: Date.now(),
              todoId,
              x,
              y,
              dateCompleted: new Date().toLocaleDateString()
            })
          y = existingTree.y + randomDir.dy
        }
        
        this.trees.push({
          id: Date.now(),
          todoId,
          x,
          y,
          dateCompleted: new Date().toLocaleDateString()
        })
      }
    },

    removeTree(todoId) {
      this.trees = this.trees.filter(t => t.todoId !== todoId)
    },

    resetForest() {
      // Remove all trees and mark todos as not completed
      this.trees = []
      this.todos = this.todos.map(t => ({ ...t, completed: false }))
      this.completedCount = 0
      this.saveToLocalStorage()
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

    toggleInProgress(id) {
      const todo = this.todos.find(t => t.id === id)
      if (todo) {
        todo.inProgress = !todo.inProgress
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
        completedCount: this.completedCount,
        trees: this.trees
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
        this.trees = data.trees || []
      }
    }
  }
})
