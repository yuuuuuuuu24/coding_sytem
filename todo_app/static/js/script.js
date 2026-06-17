// State Management
let tasks = [];
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const taskList = document.getElementById('task-list');
const taskForm = document.getElementById('task-form');
const editForm = document.getElementById('edit-form');
const editModal = document.getElementById('edit-modal');
const closeEditModalBtn = document.getElementById('close-modal');
const cancelEditBtn = document.getElementById('cancel-edit');
const searchInput = document.getElementById('task-search');
const filterTabs = document.querySelectorAll('.filter-tab');

// Progress Elements
const progressPercentage = document.getElementById('progress-percentage');
const progressBar = document.getElementById('progress-bar');
const countAll = document.getElementById('count-all');
const countActive = document.getElementById('count-active');
const countCompleted = document.getElementById('count-completed');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchTasks();
    
    // Add Task Event
    taskForm.addEventListener('submit', handleAddTask);
    
    // Edit Task Event
    editForm.addEventListener('submit', handleUpdateTask);
    
    // Modal Close Events
    closeEditModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);
    window.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditModal();
    });
    
    // Filter Event
    filterTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            filterTabs.forEach(t => t.classList.remove('active'));
            const clickedTab = e.currentTarget;
            clickedTab.classList.add('active');
            currentFilter = clickedTab.dataset.filter;
            renderTasks();
        });
    });
    
    // Search Event
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderTasks();
    });
});

// API Calls
async function fetchTasks() {
    try {
        const response = await fetch('/api/tasks');
        tasks = await response.json();
        renderTasks();
    } catch (error) {
        console.error('Failed to fetch tasks:', error);
        taskList.innerHTML = `<div class="empty-state"><p>エラーが発生しました。タスクを読み込めません。</p></div>`;
    }
}

async function handleAddTask(e) {
    e.preventDefault();
    
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const priority = document.getElementById('task-priority').value;
    const due_date = document.getElementById('task-due-date').value;
    
    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, priority, due_date })
        });
        
        if (response.ok) {
            taskForm.reset();
            fetchTasks(); // Refresh list
        } else {
            const err = await response.json();
            alert(err.error || 'タスクの追加に失敗しました。');
        }
    } catch (error) {
        console.error('Error adding task:', error);
    }
}

async function handleToggleTask(taskId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}/toggle`, {
            method: 'POST'
        });
        if (response.ok) {
            fetchTasks();
        }
    } catch (error) {
        console.error('Error toggling task:', error);
    }
}

async function handleDeleteTask(taskId) {
    if (!confirm('このタスクを削除してもよろしいですか？')) return;
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            fetchTasks();
        }
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

function openEditModal(task) {
    document.getElementById('edit-task-id').value = task.id;
    document.getElementById('edit-title').value = task.title;
    document.getElementById('edit-description').value = task.description;
    document.getElementById('edit-priority').value = task.priority;
    document.getElementById('edit-due-date').value = task.due_date;
    
    editModal.classList.add('active');
}

function closeEditModal() {
    editModal.classList.remove('active');
    editForm.reset();
}

async function handleUpdateTask(e) {
    e.preventDefault();
    
    const id = document.getElementById('edit-task-id').value;
    const title = document.getElementById('edit-title').value;
    const description = document.getElementById('edit-description').value;
    const priority = document.getElementById('edit-priority').value;
    const due_date = document.getElementById('edit-due-date').value;
    
    try {
        const response = await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, priority, due_date })
        });
        
        if (response.ok) {
            closeEditModal();
            fetchTasks();
        } else {
            const err = await response.json();
            alert(err.error || 'タスクの更新に失敗しました。');
        }
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

// Render Logic
function renderTasks() {
    // 1. Calculate and update stats badges
    const totalCount = tasks.length;
    const completedCount = tasks.filter(t => t.is_completed).length;
    const activeCount = totalCount - completedCount;
    
    countAll.textContent = totalCount;
    countActive.textContent = activeCount;
    countCompleted.textContent = completedCount;
    
    // Update progress bar
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    progressPercentage.textContent = `${progress}%`;
    progressBar.style.width = `${progress}%`;
    
    // 2. Filter tasks
    let filteredTasks = tasks;
    
    // Filter status
    if (currentFilter === 'active') {
        filteredTasks = tasks.filter(t => !t.is_completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = tasks.filter(t => t.is_completed);
    }
    
    // Filter search query
    if (searchQuery) {
        filteredTasks = filteredTasks.filter(t => 
            t.title.toLowerCase().includes(searchQuery) || 
            t.description.toLowerCase().includes(searchQuery)
        );
    }
    
    // 3. Render DOM
    if (filteredTasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-clipboard-question" style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--text-muted);"></i>
                <p>${searchQuery ? '条件に一致するタスクが見つかりません。' : 'タスクがありません。新しく作成しましょう！'}</p>
            </div>`;
        return;
    }
    
    taskList.innerHTML = '';
    const todayStr = new Date().toISOString().split('T')[0];
    
    filteredTasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card priority-${task.priority} ${task.is_completed ? 'completed' : ''}`;
        
        // Overdue Check
        const isOverdue = task.due_date && task.due_date < todayStr && !task.is_completed;
        const formattedDate = task.due_date ? formatDate(task.due_date) : '';
        
        card.innerHTML = `
            <label class="checkbox-container">
                <input type="checkbox" ${task.is_completed ? 'checked' : ''} onchange="handleToggleTask(${task.id})">
                <span class="checkmark"></span>
            </label>
            
            <div class="task-content">
                <div class="task-title">${escapeHTML(task.title)}</div>
                ${task.description ? `<div class="task-description">${escapeHTML(task.description)}</div>` : ''}
                <div class="task-meta">
                    <span class="prio-badge ${task.priority}">
                        <i class="fa-solid fa-circle"></i> ${priorityName(task.priority)}
                    </span>
                    ${task.due_date ? `
                        <span class="date-pill ${isOverdue ? 'overdue' : ''}">
                            <i class="fa-solid ${isOverdue ? 'fa-triangle-exclamation' : 'fa-calendar-days'}"></i>
                            ${formattedDate} ${isOverdue ? '(期限切れ)' : ''}
                        </span>
                    ` : ''}
                </div>
            </div>
            
            <div class="task-actions">
                <button class="action-btn" onclick="triggerEdit(${task.id})" title="編集">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="action-btn delete" onclick="handleDeleteTask(${task.id})" title="削除">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
        
        taskList.appendChild(card);
    });
}

// Helpers
function triggerEdit(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        openEditModal(task);
    }
}

function formatDate(dateStr) {
    // YYYY-MM-DD to YYYY年MM月DD日
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;
    }
    return dateStr;
}

function priorityName(prio) {
    const names = {
        'High': '🔥 いそぎ！',
        'Medium': '🎀 ふつう',
        'Low': '🌱 まったり'
    };
    return names[prio] || prio;
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
