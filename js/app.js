/**
 * Weekly To-Do App - Main Application Logic
 */
(function() {
  'use strict';

  // ============ DOM Elements ============
  const elements = {
    weekIndicator: document.getElementById('weekIndicator'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    todoList: document.getElementById('todoList'),
    emptyState: document.getElementById('emptyState'),
    addBtn: document.getElementById('addBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    confetti: document.getElementById('confetti'),

    // Todo Modal
    todoModal: document.getElementById('todoModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalClose: document.getElementById('modalClose'),
    todoForm: document.getElementById('todoForm'),
    todoText: document.getElementById('todoText'),
    linkTypeGrid: document.getElementById('linkTypeGrid'),
    linkFields: document.getElementById('linkFields'),
    deleteBtn: document.getElementById('deleteBtn'),

    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    settingsClose: document.getElementById('settingsClose'),
    resetDay: document.getElementById('resetDay'),
    resetWeekBtn: document.getElementById('resetWeekBtn'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile')
  };

  // ============ State ============
  let currentEditId = null;
  let selectedLinkType = 'none';
  let draggedItem = null;
  let draggedIndex = -1;

  // ============ Initialization ============
  function init() {
    // Check for weekly reset
    const wasReset = Storage.checkWeeklyReset();
    if (wasReset) {
      showToast('New week! Checkmarks have been reset. 🎉');
    }

    // Load settings
    loadSettings();

    // Update week indicator
    updateWeekIndicator();

    // Render todos
    renderTodos();

    // Setup event listeners
    setupEventListeners();

    // Register service worker
    registerServiceWorker();
  }

  // ============ Event Listeners ============
  function setupEventListeners() {
    // Add button
    elements.addBtn.addEventListener('click', openAddModal);

    // Settings button
    elements.settingsBtn.addEventListener('click', openSettingsModal);

    // Modal close buttons
    elements.modalClose.addEventListener('click', closeTodoModal);
    elements.settingsClose.addEventListener('click', closeSettingsModal);

    // Modal overlays (close on backdrop click)
    elements.todoModal.addEventListener('click', (e) => {
      if (e.target === elements.todoModal) closeTodoModal();
    });
    elements.settingsModal.addEventListener('click', (e) => {
      if (e.target === elements.settingsModal) closeSettingsModal();
    });

    // Todo form submission
    elements.todoForm.addEventListener('submit', handleFormSubmit);

    // Link type selection
    elements.linkTypeGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.link-type-btn');
      if (btn) {
        selectLinkType(btn.dataset.type);
      }
    });

    // Delete button
    elements.deleteBtn.addEventListener('click', handleDelete);

    // Settings
    elements.resetDay.addEventListener('change', (e) => {
      Storage.updateSettings({ resetDay: parseInt(e.target.value, 10) });
    });

    elements.resetWeekBtn.addEventListener('click', handleManualReset);
    elements.exportBtn.addEventListener('click', handleExport);
    elements.importBtn.addEventListener('click', () => elements.importFile.click());
    elements.importFile.addEventListener('change', handleImport);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeTodoModal();
        closeSettingsModal();
      }
    });
  }

  // ============ Rendering ============
  function renderTodos() {
    const todos = Storage.getTodos();
    const checkedIds = Storage.getCheckedTodos();

    // Clear existing items (except empty state)
    const existingItems = elements.todoList.querySelectorAll('.todo-item');
    existingItems.forEach(item => item.remove());

    // Show/hide empty state
    elements.emptyState.classList.toggle('hidden', todos.length > 0);

    // Render each todo
    todos.forEach((todo, index) => {
      const isChecked = checkedIds.includes(todo.id);
      const item = createTodoElement(todo, isChecked, index);
      elements.todoList.appendChild(item);
    });

    // Update progress
    updateProgress(todos.length, checkedIds.length);
  }

  function createTodoElement(todo, isChecked, index) {
    const div = document.createElement('div');
    div.className = `todo-item${isChecked ? ' completed' : ''}`;
    div.dataset.id = todo.id;
    div.dataset.index = index;
    div.draggable = true;

    const linkInfo = Links.getLinkTypeInfo(todo.linkType);
    const hasLink = todo.linkType !== 'none';

    div.innerHTML = `
      <label class="todo-checkbox">
        <input type="checkbox" ${isChecked ? 'checked' : ''}>
        <span class="checkmark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
      </label>
      <div class="todo-content">
        <span class="todo-text">${escapeHtml(todo.text)}</span>
        ${hasLink ? `<span class="todo-link-icon" title="Open ${linkInfo.label}">${linkInfo.icon}</span>` : ''}
      </div>
      <div class="todo-actions">
        <button class="todo-edit-btn" aria-label="Edit">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      </div>
    `;

    // Event listeners
    const checkbox = div.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => handleToggle(todo.id));

    const linkIcon = div.querySelector('.todo-link-icon');
    if (linkIcon) {
      linkIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        handleLinkClick(todo);
      });
    }

    const editBtn = div.querySelector('.todo-edit-btn');
    editBtn.addEventListener('click', () => openEditModal(todo));

    // Drag events
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragend', handleDragEnd);
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('drop', handleDrop);

    return div;
  }

  function updateProgress(total, completed) {
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    elements.progressFill.style.width = `${percentage}%`;
    elements.progressText.textContent = `${completed} of ${total} done`;

    // Trigger confetti if all completed
    if (total > 0 && completed === total) {
      triggerConfetti();
    }
  }

  function updateWeekIndicator() {
    const weekNum = Storage.getWeekNumber();
    elements.weekIndicator.textContent = `Week ${weekNum}`;
  }

  // ============ Todo Actions ============
  function handleToggle(id) {
    const isNowChecked = Storage.toggleChecked(id);
    renderTodos();

    // Small haptic-like visual feedback
    const item = document.querySelector(`[data-id="${id}"]`);
    if (item && isNowChecked) {
      item.style.animation = 'none';
      item.offsetHeight; // Trigger reflow
      item.style.animation = null;
    }
  }

  function handleLinkClick(todo) {
    const url = Links.generateLink(todo.linkType, todo.linkData);
    if (url) {
      Links.openLink(url);
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault();

    const text = elements.todoText.value.trim();
    if (!text) return;

    const linkData = getLinkDataFromForm();

    if (currentEditId) {
      // Update existing
      Storage.updateTodo(currentEditId, {
        text,
        linkType: selectedLinkType,
        linkData
      });
    } else {
      // Add new
      Storage.addTodo({
        text,
        linkType: selectedLinkType,
        linkData
      });
    }

    closeTodoModal();
    renderTodos();
  }

  function handleDelete() {
    if (currentEditId && confirm('Delete this to-do?')) {
      Storage.deleteTodo(currentEditId);
      closeTodoModal();
      renderTodos();
    }
  }

  // ============ Modal Management ============
  function openAddModal() {
    currentEditId = null;
    elements.modalTitle.textContent = 'Add To-Do';
    elements.todoForm.reset();
    selectLinkType('none');
    elements.deleteBtn.classList.remove('visible');
    openModal(elements.todoModal);
    elements.todoText.focus();
  }

  function openEditModal(todo) {
    currentEditId = todo.id;
    elements.modalTitle.textContent = 'Edit To-Do';
    elements.todoText.value = todo.text;
    selectLinkType(todo.linkType);
    populateLinkFields(todo.linkData);
    elements.deleteBtn.classList.add('visible');
    openModal(elements.todoModal);
  }

  function openSettingsModal() {
    openModal(elements.settingsModal);
  }

  function closeTodoModal() {
    closeModal(elements.todoModal);
    currentEditId = null;
  }

  function closeSettingsModal() {
    closeModal(elements.settingsModal);
  }

  function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ============ Link Type Selection ============
  function selectLinkType(type) {
    selectedLinkType = type;

    // Update button states
    document.querySelectorAll('.link-type-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.type === type);
    });

    // Show/hide field groups
    document.querySelectorAll('.link-field-group').forEach(group => {
      group.classList.toggle('active', group.dataset.for === type);
    });
  }

  function getLinkDataFromForm() {
    const data = {};

    switch (selectedLinkType) {
      case 'whatsapp':
        data.phone = document.getElementById('waPhone').value.trim();
        data.message = document.getElementById('waMessage').value.trim();
        break;
      // calendar doesn't need additional data
    }

    return data;
  }

  function populateLinkFields(data) {
    if (!data) return;

    // WhatsApp
    document.getElementById('waPhone').value = data.phone || '';
    document.getElementById('waMessage').value = data.message || '';
  }

  // ============ Drag and Drop ============
  function handleDragStart(e) {
    draggedItem = e.target.closest('.todo-item');
    draggedIndex = parseInt(draggedItem.dataset.index, 10);
    draggedItem.classList.add('dragging');

    // Required for Firefox
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedItem.dataset.id);
  }

  function handleDragEnd(e) {
    if (draggedItem) {
      draggedItem.classList.remove('dragging');
    }
    draggedItem = null;
    draggedIndex = -1;

    // Remove any remaining placeholders
    document.querySelectorAll('.drag-placeholder').forEach(p => p.remove());
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const target = e.target.closest('.todo-item');
    if (!target || target === draggedItem) return;

    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    // Determine if we should insert before or after
    if (e.clientY < midY) {
      target.parentNode.insertBefore(draggedItem, target);
    } else {
      target.parentNode.insertBefore(draggedItem, target.nextSibling);
    }
  }

  function handleDrop(e) {
    e.preventDefault();

    // Get new order from DOM
    const items = elements.todoList.querySelectorAll('.todo-item');
    const orderedIds = Array.from(items).map(item => item.dataset.id);

    // Save new order
    Storage.reorderTodos(orderedIds);
  }

  // ============ Settings Actions ============
  function loadSettings() {
    const settings = Storage.getSettings();
    elements.resetDay.value = settings.resetDay;
  }

  function handleManualReset() {
    if (confirm('Reset all checkmarks for this week?')) {
      Storage.manualReset();
      renderTodos();
      closeSettingsModal();
      showToast('Week reset! Start fresh. 💪');
    }
  }

  function handleExport() {
    const data = Storage.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-todo-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Data exported! 📦');
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const success = Storage.importData(event.target.result);
      if (success) {
        loadSettings();
        updateWeekIndicator();
        renderTodos();
        closeSettingsModal();
        showToast('Data imported successfully! 🎉');
      } else {
        showToast('Failed to import data. Invalid file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  }

  // ============ Confetti ============
  function triggerConfetti() {
    const canvas = elements.confetti;
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#38ef7d', '#ffd93d'];

    // Create particles
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20 - 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10
      });
    }

    let frame = 0;
    const maxFrames = 120;

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5; // Gravity
        p.rotation += p.rotationSpeed;
        p.vx *= 0.99;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      frame++;
      if (frame < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    animate();
  }

  // ============ Toast Notifications ============
  function showToast(message) {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: calc(100px + env(safe-area-inset-bottom));
      left: 50%;
      transform: translateX(-50%);
      background: #2d3748;
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      font-size: 0.938rem;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 300;
      animation: toastIn 0.3s ease-out;
    `;

    // Add animation keyframes if not already added
    if (!document.querySelector('#toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to { opacity: 0; transform: translateX(-50%) translateY(20px); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease-out forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ============ Utilities ============
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============ Service Worker ============
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
          .then(registration => {
            console.log('SW registered:', registration.scope);
          })
          .catch(error => {
            console.log('SW registration failed:', error);
          });
      });
    }
  }

  // ============ Start App ============
  document.addEventListener('DOMContentLoaded', init);

})();
