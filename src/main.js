import * as chrono from 'chrono-node';

// DOM Elements
const taskInput = document.getElementById('task-input');
const categorySelect = document.getElementById('category-select');
const prioritySelect = document.getElementById('priority-select');
const addTaskBtn = document.getElementById('add-task');
const tasksList = document.getElementById('tasks-list');
const filterBtns = document.querySelectorAll('.filter-btn');
const themeToggle = document.getElementById('theme-toggle');
const datetimeDisplay = document.getElementById('datetime');
const voiceBtn = document.getElementById('voice-input');

// Voice Recognition
let recognition = null;
if ('webkitSpeechRecognition' in window) {
    recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        voiceBtn.classList.add('listening');
    };
    recognition.onend = () => {
        voiceBtn.classList.remove('listening');
    };
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        taskInput.value = transcript;
        addTask();
    };
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        voiceBtn.classList.remove('listening');
    };
    voiceBtn.addEventListener('click', () => {
        if (voiceBtn.classList.contains('listening')) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });
} else {
    voiceBtn.style.display = 'none';
    console.log('Speech recognition not supported in this browser');
}

// Date and Time
function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    datetimeDisplay.textContent = now.toLocaleDateString('en-US', options);
}
setInterval(updateDateTime, 1000);
updateDateTime();

// State Management
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all';
let isDarkMode = localStorage.getItem('theme') === 'dark';

// Theme
function updateThemeIcon() {
    const isDark = document.body.classList.contains('dark-mode');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}
document.body.classList.toggle('dark-mode', isDarkMode);
updateThemeIcon();

themeToggle.addEventListener('click', toggleTheme);
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    updateThemeIcon();
}

addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTasks();
    });
});

document.querySelectorAll('.check-all').forEach(btn => {
    btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        checkAllTasks(category);
    });
});
document.querySelectorAll('.delete-all').forEach(btn => {
    btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        deleteAllTasks(category);
    });
});

// Modal Elements
const editModal = document.getElementById('edit-modal');
const confirmModal = document.getElementById('confirm-modal');
const editTaskInput = document.getElementById('edit-task-input');
const editCategorySelect = document.getElementById('edit-category-select');
const editPrioritySelect = document.getElementById('edit-priority-select');
const confirmMessage = document.getElementById('confirm-message');

function showModal(modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}
function hideModal(modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
}
function showConfirmModal(message, onConfirm) {
    confirmMessage.textContent = message;
    showModal(confirmModal);
    const confirmBtn = confirmModal.querySelector('.confirm-btn');
    const cancelBtn = confirmModal.querySelector('.cancel-btn');
    const closeBtn = confirmModal.querySelector('.close-modal');
    const handleConfirm = () => {
        onConfirm();
        hideModal(confirmModal);
        cleanup();
    };
    const handleCancel = () => {
        hideModal(confirmModal);
        cleanup();
    };
    const cleanup = () => {
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        closeBtn.removeEventListener('click', handleCancel);
    };
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    closeBtn.addEventListener('click', handleCancel);
}

// Add Task with Chrono due date parsing
function addTask() {
    const originalText = taskInput.value.trim();
    if (!originalText) return;
    // Parse due date using chrono
    let parsedDate = null;
    let trimmedText = originalText;
    try {
        const results = chrono.parse(originalText);
        if (results && results.length > 0 && results[0].start) {
            parsedDate = results[0].start.date();
            // Remove the date phrase from the task text
            const { index, text } = results[0];
            trimmedText = (originalText.slice(0, index) + originalText.slice(index + text.length)).trim();
            if (!trimmedText) trimmedText = originalText;
        }
    } catch (e) {
        console.warn('Chrono parse error:', e);
        parsedDate = null;
    }
    const task = {
        id: Date.now(),
        text: trimmedText,
        category: categorySelect.value,
        priority: prioritySelect.value,
        completed: false,
        createdAt: new Date(),
        dueDate: parsedDate || null
    };
    tasks.unshift(task);
    saveTasks();
    renderTasks();
    taskInput.value = '';
}

function deleteTask(index) {
    showConfirmModal('Are you sure you want to delete this task?', () => {
        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
    });
}

function toggleTask(id) {
    tasks = tasks.map(task => {
        if (task.id === id) {
            return { ...task, completed: !task.completed };
        }
        return task;
    });
    saveTasks();
    renderTasks();
}

function editTask(index) {
    const task = tasks[index];
    editTaskInput.value = task.text;
    editCategorySelect.value = task.category;
    editPrioritySelect.value = task.priority;
    showModal(editModal);
    const saveBtn = editModal.querySelector('.save-btn');
    const cancelBtn = editModal.querySelector('.cancel-btn');
    const closeBtn = editModal.querySelector('.close-modal');
    const handleSave = () => {
        const newText = editTaskInput.value.trim();
        if (newText) {
            tasks[index].text = newText;
            tasks[index].category = editCategorySelect.value;
            tasks[index].priority = editPrioritySelect.value;
            saveTasks();
            renderTasks();
            hideModal(editModal);
        }
        cleanup();
    };
    const handleCancel = () => {
        hideModal(editModal);
        cleanup();
    };
    const cleanup = () => {
        saveBtn.removeEventListener('click', handleSave);
        cancelBtn.removeEventListener('click', handleCancel);
        closeBtn.removeEventListener('click', handleCancel);
    };
    saveBtn.addEventListener('click', handleSave);
    cancelBtn.addEventListener('click', handleCancel);
    closeBtn.addEventListener('click', handleCancel);
}

function renderTasks() {
    const filteredTasks = currentFilter === 'all'
        ? tasks
        : tasks.filter(task => task.category === currentFilter);

    tasksList.innerHTML = filteredTasks.map((task) => {
        let dueDateSpan = '';
        if (task.dueDate) {
            const dateObj = new Date(task.dueDate);
            if (!isNaN(dateObj.getTime())) {
                const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                const dd = String(dateObj.getDate()).padStart(2, '0');
                const yyyy = dateObj.getFullYear();
                dueDateSpan = `<span class="due-date">Due: ${dd}/${mm}/${yyyy}</span>`;
            }
        }
        return `
        <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
            <div class="task-content">
                <input type="checkbox" 
                       class="task-checkbox" 
                       ${task.completed ? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
                ${dueDateSpan}
                <span class="task-category">${task.category}</span>
                <span class="task-priority priority-${task.priority}">${task.priority}</span>
            </div>
            <div class="task-actions">
                <button class="edit-btn" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        `;
    }).join('');

    // Attach event listeners for edit, delete, and complete
    document.querySelectorAll('.task-item').forEach((item) => {
        const taskId = Number(item.getAttribute('data-task-id'));
        item.querySelector('.task-checkbox').addEventListener('change', () => {
            toggleTask(taskId);
        });
        item.querySelector('.edit-btn').addEventListener('click', () => {
            const index = tasks.findIndex(t => t.id === taskId);
            editTask(index);
        });
        item.querySelector('.delete-btn').addEventListener('click', () => {
            const index = tasks.findIndex(t => t.id === taskId);
            deleteTask(index);
        });
    });
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function checkAllTasks(category) {
    const tasksToUpdate = category === 'all' 
        ? tasks 
        : tasks.filter(task => task.category === category);
    if (tasksToUpdate.length === 0) {
        showConfirmModal('No tasks found in this category.', () => {});
        return;
    }
    showConfirmModal(
        `Are you sure you want to mark all ${category} tasks as complete?`,
        () => {
            tasksToUpdate.forEach(task => {
                task.completed = true;
            });
            saveTasks();
            renderTasks();
        }
    );
}

function deleteAllTasks(category) {
    const tasksToDelete = category === 'all' 
        ? tasks 
        : tasks.filter(task => task.category === category);
    if (tasksToDelete.length === 0) {
        showConfirmModal('No tasks found in this category.', () => {});
        return;
    }
    showConfirmModal(
        `Are you sure you want to delete all ${category} tasks?`,
        () => {
            if (category === 'all') {
                tasks.length = 0;
            } else {
                tasks = tasks.filter(task => task.category !== category);
            }
            saveTasks();
            renderTasks();
        }
    );
}

renderTasks();
