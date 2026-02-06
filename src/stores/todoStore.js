import { defineStore } from 'pinia'

export const useTodoStore = defineStore('todos', {
  state: () => ({
    userName: '',
    todos: [],
    tags: [],
      completedCount: 0,
      trees: [],
      features: [] // animals/lakes placed on the map
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
          // create or upgrade to a grown tree
          this.createTree(id, 'grown')
          // Every 5 completed tasks, add a feature: two bunnies then a lake
          if (this.completedCount % 5 === 0) {
            const block = Math.floor(this.completedCount / 5) % 3 // 1->bunny,2->bunny,0->lake
            if (block === 0) {
              this.createFeature('lake')
            } else {
              this.createFeature('bunny')
            }
          }
        } else {
          this.completedCount--
          // remove any tree associated with this todo
          this.removeTree(id)
        }
        this.saveToLocalStorage()
      }
    },

    createFeature(type) {
      // place features using similar placement strategy to trees
      let x = 0
      let y = 0
      let baseX = 0
      let baseY = 0
      const occupied = new Set([...this.trees.map(t => `${t.baseX ?? t.x},${t.baseY ?? t.y}`), ...this.features.map(f => `${f.x},${f.y}`)])

      const lakeHalfW = 120
      const lakeHalfH = 35
      // helper to check lakes (rounded rhombus-like area)
      const isInLake = (px, py) => this.features.some(f => {
        if (f.type !== 'lake') return false
        const cx = f.x + 40
        const cy = f.y + 40
        const dx = Math.abs(px - cx)
        const dy = Math.abs(py - cy)
        return (dx / lakeHalfW) + (dy / lakeHalfH) <= 1
      })

      if (this.trees.length > 0) {
        // choose a random existing tree so placement is more organic
        const existingTree = this.trees[Math.floor(Math.random() * this.trees.length)]
        baseX = existingTree.baseX ?? existingTree.x
        baseY = existingTree.baseY ?? existingTree.y
        const directions = [
          { dx: 100, dy: 0 },
          { dx: 50, dy: -50 },
          { dx: -50, dy: -50 },
          { dx: -100, dy: 0 },
          { dx: -50, dy: 50 },
          { dx: 50, dy: 50 }
        ]
        let found = false
        for (const d of directions) {
          const nx = baseX + d.dx
          const ny = baseY + d.dy
          if (!occupied.has(`${nx},${ny}`) && !isInLake(nx + 40, ny + 40)) {
            x = nx
            y = ny
            found = true
            break
          }
        }

        if (!found) {
          for (let radius = 2; radius <= 8 && !found; radius++) {
            for (const d of directions) {
              const nx = baseX + d.dx * radius
              const ny = baseY + d.dy * radius
              if (!occupied.has(`${nx},${ny}`) && !isInLake(nx + 40, ny + 40)) {
                x = nx
                y = ny
                found = true
                break
              }
            }
          }
        }
      }

      const isOnTree = (px, py) => this.trees.some(t => {
        const cx = t.baseX ?? t.x
        const cy = t.baseY ?? t.y
        const dx = Math.abs(px - cx)
        const dy = Math.abs(py - cy)
        return (dx / lakeHalfW) + (dy / lakeHalfH) <= 1
      })

      if (type === 'lake') {
        let attempts = 0
        while ((occupied.has(`${x},${y}`) || isInLake(x + 40, y + 40) || isOnTree(x, y)) && attempts < 24) {
          const angle = Math.random() * Math.PI * 2
          const dist = 60 + Math.floor(Math.random() * 3) * 60
          x = (baseX || 0) + Math.round(Math.cos(angle) * dist)
          y = (baseY || 0) + Math.round(Math.sin(angle) * dist)
          attempts++
        }
      }

      const feature = {
        id: Date.now(),
        type,
        x,
        y,
        // for bunnies track a sub-position (floating point) and target
        px: x,
        py: y,
        tx: x,
        ty: y,
        speed: type === 'bunny' ? 0.4 + Math.random() * 0.6 : 0
      }

      // ensure bunnies don't spawn on top of trees or lakes: if occupied or in lake, try offsets
      if (type === 'bunny') {
        let attempts = 0
        while ((occupied.has(`${feature.x},${feature.y}`) || isInLake(feature.x + 40, feature.y + 40)) && attempts < 24) {
          // random nearby jitter
          const angle = Math.random() * Math.PI * 2
          const dist = 30 + Math.floor(Math.random() * 3) * 30
            feature.x = (baseX || 0) + Math.round(Math.cos(angle) * dist)
            feature.y = (baseY || 0) + Math.round(Math.sin(angle) * dist)
          attempts++
        }
        // keep bunny motion state aligned to final spawn position
        feature.px = feature.x
        feature.py = feature.y
        feature.tx = feature.x
        feature.ty = feature.y
        // Start newly spawned bunnies in a moving state for 2 seconds
        feature.state = 'moving'
        feature.stateTimer = 0
        feature.stateTarget = 2000 // ms - move for 2 seconds straight on spawn
      }

      this.features.push(feature)
      this.saveToLocalStorage()
    },

    createTree(todoId, stage = 'grown') {
      // Avoid duplicating trees for the same todo
      const existing = this.trees.find(t => t.todoId === todoId)
      if (existing) {
        // upgrade or update stage/date
        existing.stage = stage
        if (stage === 'grown') existing.dateCompleted = new Date().toISOString()
        this.saveToLocalStorage()
        return
      }

      // Helper: check if (x, y) is inside any lake
      const isInLake = (px, py) => {
        return this.features.some(f => {
          if (f.type !== 'lake') return false
          const dx = px - (f.x + 40)
          const dy = py - (f.y + 40)
          // lake ellipse: rx=60, ry=28
          return (dx * dx) / (60 * 60) + (dy * dy) / (28 * 28) <= 1
        })
      }

      let x = 0
      let y = 0

      if (this.trees.length > 0) {
        // Place adjacent to a random existing tree to prevent linear growth
        const existingTree = this.trees[Math.floor(Math.random() * this.trees.length)]
        const occupied = new Set(this.trees.map(t => `${t.baseX ?? t.x},${t.baseY ?? t.y}`))
        const baseX = existingTree.baseX ?? existingTree.x
        const baseY = existingTree.baseY ?? existingTree.y

        const directions = [
          { dx: 120, dy: 0 },    // Right
          { dx: 60, dy: -35 },  // Upper-right
          { dx: -60, dy: -35 }, // Upper-left
          { dx: -120, dy: 0 },   // Left
          { dx: -60, dy: 35 },  // Lower-left
          { dx: 60, dy: 35 }    // Lower-right
        ]

        // Shuffle directions to randomize growth
        for (let i = directions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[directions[i], directions[j]] = [directions[j], directions[i]]
        }

        // Try immediate neighbors first
        let found = false
        for (const d of directions) {
          const nx = baseX + d.dx
          const ny = baseY + d.dy
          if (!occupied.has(`${nx},${ny}`) && !isInLake(nx + 40, ny + 40)) {
            x = nx
            y = ny
            found = true
            break
          }
        }

        // If adjacent are occupied, expand outward along directions
        if (!found) {
          for (let radius = 2; radius <= 8 && !found; radius++) {
            for (const d of directions) {
              const nx = baseX + d.dx * radius
              const ny = baseY + d.dy * radius
              if (!occupied.has(`${nx},${ny}`) && !isInLake(nx + 40, ny + 40)) {
                x = nx
                y = ny
                found = true
                break
              }
            }
          }
        }

        // Final fallback: scan grid around existing tree
        if (!found) {
          const scanRange = 8
          outer: for (let rx = -scanRange; rx <= scanRange; rx++) {
            for (let ry = -scanRange; ry <= scanRange; ry++) {
              const nx = baseX + rx * 40
              const ny = baseY + ry * 40
              if (!occupied.has(`${nx},${ny}`) && !isInLake(nx + 40, ny + 40)) {
                x = nx
                y = ny
                break outer
              }
            }
          }
        }
      }

      // Randomly select tree and fruit sprites
      const treeSprite = Math.random() < 0.5 ? 'oak1' : 'oak2'
      const fruitSprite = Math.random() < 0.5 ? 'apple' : 'orange'

      // Add a small random spawn radius so trees don't stack perfectly
      const jitterRadius = 5
      const minSpawnDistance = jitterRadius * 2
      const jitter = () => (Math.random() * 2 - 1) * jitterRadius
      const isTooClose = (px, py) => this.trees.some(t => {
        const cx = t.baseX ?? t.x
        const cy = t.baseY ?? t.y
        const dx = px - cx
        const dy = py - cy
        return dx * dx + dy * dy < minSpawnDistance * minSpawnDistance
      })

      let spawnX = x
      let spawnY = y
      let attempts = 0
      while (attempts < 12) {
        const candidateX = x + jitter()
        const candidateY = y + jitter()
        if (!isInLake(candidateX + 40, candidateY + 40) && !isTooClose(candidateX, candidateY)) {
          spawnX = candidateX
          spawnY = candidateY
          break
        }
        attempts++
      }

      this.trees.push({
        id: Date.now(),
        todoId,
        x: spawnX,
        y: spawnY,
        baseX: x,
        baseY: y,
        stage,
        dateCompleted: stage === 'grown' ? new Date().toISOString() : null,
        treeSprite,
        fruitSprite
      })
      this.saveToLocalStorage()
    },

    removeTree(todoId) {
      this.trees = this.trees.filter(t => t.todoId !== todoId)
    },

    resetForest() {
      // Remove all trees, features (bunnies/lakes), and mark todos as not completed/in-progress
      this.trees = []
      this.features = []
      this.todos = this.todos.map(t => ({ ...t, completed: false, inProgress: false }))
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
        const newState = !todo.inProgress
        todo.inProgress = newState
        // If marking in-progress and not already completed, create a sapling
        if (newState && !todo.completed) {
          this.createTree(id, 'sapling')
        } else if (!newState && !todo.completed) {
          // removing in-progress and not completed => remove sapling
          this.removeTree(id)
        }
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
        trees: this.trees,
        features: this.features
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
        this.features = data.features || []
        
        // Migrate existing trees to have sprite properties
        this.trees.forEach(tree => {
          if (!tree.treeSprite) {
            tree.treeSprite = Math.random() < 0.5 ? 'oak1' : 'oak2'
          }
          if (!tree.fruitSprite) {
            tree.fruitSprite = Math.random() < 0.5 ? 'apple' : 'orange'
          }
          if (tree.baseX == null) {
            tree.baseX = tree.x
          }
          if (tree.baseY == null) {
            tree.baseY = tree.y
          }
        })
        
        // Save the migrated data
        if (this.trees.length > 0) {
          this.saveToLocalStorage()
        }
      }
    }
  }
})