/**
 * Storage Module - Handles all localStorage operations
 */
const Storage = (function() {
  const STORAGE_KEY = 'weekly-todo-app';

  // Default data structure
  const defaultData = {
    todos: [],
    weeklyStatus: {
      weekId: null,
      checked: []
    },
    settings: {
      resetDay: 1 // Monday
    }
  };

  /**
   * Get all data from localStorage
   */
  // Default starter todos for first-time users
  const starterTodos = [
    {
      id: 'default-1',
      text: 'Message a friend',
      linkType: 'whatsapp',
      linkData: { phone: '', message: 'Hey! How are you?' },
      order: 0
    },
    {
      id: 'default-2',
      text: 'Check weekly schedule',
      linkType: 'calendar',
      linkData: {},
      order: 1
    },
    {
      id: 'default-3',
      text: 'Go for a walk',
      linkType: 'none',
      linkData: {},
      order: 2
    }
  ];

  function getData() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return { ...defaultData, ...JSON.parse(data) };
      }
    } catch (e) {
      console.error('Error reading from localStorage:', e);
    }
    // First time: seed with starter todos
    const initial = { ...defaultData, todos: [...starterTodos] };
    saveData(initial);
    return initial;
  }

  /**
   * Save all data to localStorage
   */
  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Error saving to localStorage:', e);
      return false;
    }
  }

  /**
   * Generate a unique ID
   */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get ISO week string (e.g., "2026-W05")
   */
  function getISOWeek(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  }

  /**
   * Get just the week number
   */
  function getWeekNumber(date = new Date()) {
    const week = getISOWeek(date);
    return parseInt(week.split('-W')[1], 10);
  }

  // ============ TODO OPERATIONS ============

  /**
   * Get all todos
   */
  function getTodos() {
    const data = getData();
    return data.todos.sort((a, b) => a.order - b.order);
  }

  /**
   * Add a new todo
   */
  function addTodo(todo) {
    const data = getData();
    const newTodo = {
      id: generateId(),
      text: todo.text,
      linkType: todo.linkType || 'none',
      linkData: todo.linkData || {},
      order: data.todos.length
    };
    data.todos.push(newTodo);
    saveData(data);
    return newTodo;
  }

  /**
   * Update an existing todo
   */
  function updateTodo(id, updates) {
    const data = getData();
    const index = data.todos.findIndex(t => t.id === id);
    if (index !== -1) {
      data.todos[index] = { ...data.todos[index], ...updates };
      saveData(data);
      return data.todos[index];
    }
    return null;
  }

  /**
   * Delete a todo
   */
  function deleteTodo(id) {
    const data = getData();
    data.todos = data.todos.filter(t => t.id !== id);
    // Also remove from checked list
    data.weeklyStatus.checked = data.weeklyStatus.checked.filter(cid => cid !== id);
    // Reorder remaining todos
    data.todos.forEach((todo, index) => {
      todo.order = index;
    });
    saveData(data);
  }

  /**
   * Reorder todos
   */
  function reorderTodos(orderedIds) {
    const data = getData();
    orderedIds.forEach((id, index) => {
      const todo = data.todos.find(t => t.id === id);
      if (todo) {
        todo.order = index;
      }
    });
    saveData(data);
  }

  // ============ WEEKLY STATUS ============

  /**
   * Get checked status for all todos
   */
  function getCheckedTodos() {
    const data = getData();
    return data.weeklyStatus.checked || [];
  }

  /**
   * Toggle checked status for a todo
   */
  function toggleChecked(id) {
    const data = getData();
    const checked = data.weeklyStatus.checked || [];
    const index = checked.indexOf(id);

    if (index === -1) {
      checked.push(id);
    } else {
      checked.splice(index, 1);
    }

    data.weeklyStatus.checked = checked;
    saveData(data);
    return index === -1; // Returns new checked state
  }

  /**
   * Check if week has changed and reset if needed
   */
  function checkWeeklyReset() {
    const data = getData();
    const currentWeek = getISOWeek();

    if (data.weeklyStatus.weekId !== currentWeek) {
      // New week! Reset checkmarks
      data.weeklyStatus = {
        weekId: currentWeek,
        checked: []
      };
      saveData(data);
      return true; // Week was reset
    }
    return false;
  }

  /**
   * Manually reset the week
   */
  function manualReset() {
    const data = getData();
    data.weeklyStatus = {
      weekId: getISOWeek(),
      checked: []
    };
    saveData(data);
  }

  // ============ SETTINGS ============

  /**
   * Get settings
   */
  function getSettings() {
    const data = getData();
    return data.settings;
  }

  /**
   * Update settings
   */
  function updateSettings(updates) {
    const data = getData();
    data.settings = { ...data.settings, ...updates };
    saveData(data);
    return data.settings;
  }

  // ============ IMPORT/EXPORT ============

  /**
   * Export all data as JSON string
   */
  function exportData() {
    const data = getData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from JSON string
   */
  function importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      // Validate structure
      if (!data.todos || !Array.isArray(data.todos)) {
        throw new Error('Invalid data structure');
      }
      saveData({ ...defaultData, ...data });
      return true;
    } catch (e) {
      console.error('Error importing data:', e);
      return false;
    }
  }

  // Public API
  return {
    getTodos,
    addTodo,
    updateTodo,
    deleteTodo,
    reorderTodos,
    getCheckedTodos,
    toggleChecked,
    checkWeeklyReset,
    manualReset,
    getSettings,
    updateSettings,
    exportData,
    importData,
    getWeekNumber,
    getISOWeek
  };
})();
