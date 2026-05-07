// ─── Global State ───
let notes = [];
let deletedNotes = [];
let highestZ = 10;
let selectedNoteId = null;
let dragState = null;
let resizeState = null;
let autoSaveInterval;
let timerIntervals = {};
let reminderCheckInterval;

// ─── Undo/Redo History ───
const MAX_HISTORY = 50;
let undoStack = [];
let redoStack = [];

function pushHistory() {
    const snapshot = JSON.stringify({ notes, deletedNotes, highestZ });
    undoStack.push(snapshot);
    if (undoStack.length > MAX_HISTORY) {
        undoStack.shift();
    }
    redoStack = [];
}

function undo() {
    if (undoStack.length === 0) return false;
    const current = JSON.stringify({ notes, deletedNotes, highestZ });
    redoStack.push(current);
    const previous = JSON.parse(undoStack.pop());
    notes = previous.notes;
    deletedNotes = previous.deletedNotes;
    highestZ = previous.highestZ;
    renderAllNotes();
    saveToStorage();
    showToast('Undo');
    return true;
}

function redo() {
    if (redoStack.length === 0) return false;
    const current = JSON.stringify({ notes, deletedNotes, highestZ });
    undoStack.push(current);
    const next = JSON.parse(redoStack.pop());
    notes = next.notes;
    deletedNotes = next.deletedNotes;
    highestZ = next.highestZ;
    renderAllNotes();
    saveToStorage();
    showToast('Redo');
    return true;
}

// ─── Dark Mode ───
function isDarkMode() {
    return localStorage.getItem('deskboard-darkmode') === 'true';
}

function toggleDarkMode() {
    const isDark = !isDarkMode();
    localStorage.setItem('deskboard-darkmode', isDark);
    applyDarkMode(isDark);
    showToast(isDark ? 'Dark mode on' : 'Dark mode off');
}

function applyDarkMode(isDark) {
    document.documentElement.classList.toggle('dark-mode', isDark);
    const btn = document.querySelector('.dark-mode-btn');
    if (btn) {
        btn.innerHTML = isDark 
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
}

// ─── Constants ───
const STICKY_COLORS = ['#fef3c7', '#dbeafe', '#fce7f3', '#dcfce7', '#ffedd5', '#f3e8ff'];

const QUOTES = [
    "The only way to do great work is to love what you do.",
    "Stay hungry, stay foolish.",
    "Done is better than perfect.",
    "Simplicity is the ultimate sophistication.",
    "Creativity is intelligence having fun.",
    "Focus on being productive instead of busy.",
    "Your future is created by what you do today."
];

const TIMER_PRESETS = [
    { label: '25m', seconds: 25 * 60 },
    { label: '15m', seconds: 15 * 60 },
    { label: '5m', seconds: 5 * 60 },
    { label: '1m', seconds: 60 }
];

const REMINDER_PRESETS = [
    { label: '💧 Water (30m)', minutes: 30, icon: '💧' },
    { label: '👁️ Eyes (20m)', minutes: 20, icon: '👁️' },
    { label: '🚶 Stretch (45m)', minutes: 45, icon: '🚶' },
    { label: '🍎 Snack (2h)', minutes: 120, icon: '🍎' },
    { label: '☕ Break (1h)', minutes: 60, icon: '☕' }
];
