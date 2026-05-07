function saveToStorage() {
    const boardId = getCurrentBoardId();
    const data = { notes, deletedNotes, highestZ, timestamp: Date.now() };
    try {
        localStorage.setItem(`deskboard-data-${boardId}`, JSON.stringify(data));
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_FILE_CORRUPTED') {
            showToast('Storage full! Clear some notes or bin.');
            console.error('Storage quota exceeded:', e);
        } else {
            showToast('Failed to save. Check console.');
            console.error('Storage error:', e);
        }
    }
}

function loadFromStorage() {
    const boardId = getCurrentBoardId();
    const saved = localStorage.getItem(`deskboard-data-${boardId}`);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.notes && Array.isArray(data.notes)) {
                notes = data.notes;
                deletedNotes = data.deletedNotes || [];
                highestZ = data.highestZ || 10;

                notes.forEach(note => {
                    if (note.type === 'timer' && note.timerState) {
                        note.timerState.isRunning = false;
                        note.timerState.isPaused = false;
                    }

                    if (note.type === 'reminder' && note.reminderState) {
                        note.reminderState.isBlinking = false;
                        const now = Date.now();
                        if (note.reminderState.nextTrigger < now) {
                            note.reminderState.nextTrigger = now + 5000;
                        }
                    }
                });

                renderAllNotes();
                updateBinUI();
                showToast(`Restored ${notes.length} notes`);
                return;
            }
        } catch (e) {
            console.error('Failed to load from storage:', e);
        }
    }
    
    initDefaultNotes();
}

function initDefaultNotes() {
    addNote('sticky', {
        x: 100,
        y: 80,
        content: "Welcome to DeskBoard! 🎯\n\nDouble-click any note to edit.\nDrag to move around.\nPress N for sticky, T for timer, R for reminder.\n\nKeep this open while you work!"
    });
    addNote('reminder', { x: 420, y: 100 });
    addNote('timer', { x: 720, y: 100 });
    addNote('checklist', {
        x: 1050,
        y: 100,
        content: 'This Week',
        items: [
            { text: 'Deploy to production', checked: true },
            { text: 'Write documentation', checked: false },
            { text: 'Team standup prep', checked: false },
            { text: 'Code review backlog', checked: false }
        ]
    });
    addNote('quote', { x: 200, y: 420 });
}

function isStorageAvailable() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

if (!isStorageAvailable()) {
    showToast('Warning: localStorage unavailable. Data won\'t persist.');
}

function getBoardList() {
    try {
        const list = localStorage.getItem('deskboard-boards');
        return list ? JSON.parse(list) : ['default'];
    } catch {
        return ['default'];
    }
}

function saveBoardList(list) {
    localStorage.setItem('deskboard-boards', JSON.stringify(list));
}

function getCurrentBoardId() {
    return localStorage.getItem('deskboard-current-board') || 'default';
}

function setCurrentBoardId(id) {
    localStorage.setItem('deskboard-current-board', id);
}

function loadBoard(boardId) {
    setCurrentBoardId(boardId);
    notes = [];
    deletedNotes = [];
    undoStack = [];
    redoStack = [];
    highestZ = 10;
    selectedNoteId = null;
    
    const saved = localStorage.getItem(`deskboard-data-${boardId}`);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.notes) {
                notes = data.notes;
                deletedNotes = data.deletedNotes || [];
                highestZ = data.highestZ || 10;

                notes.forEach(note => {
                    if (note.type === 'timer' && note.timerState) {
                        note.timerState.isRunning = false;
                        note.timerState.isPaused = false;
                    }

                    if (note.type === 'reminder' && note.reminderState) {
                        note.reminderState.isBlinking = false;
                        const now = Date.now();
                        if (note.reminderState.nextTrigger < now) {
                            note.reminderState.nextTrigger = now + 5000;
                        }
                    }
                });

                renderAllNotes();
                updateBinUI();
                showToast(`Loaded board: ${boardId}`);
                return;
            }
        } catch (e) {
            console.error('Failed to load board:', e);
        }
    }
    
    initDefaultNotes();
}

function saveBoard(boardId) {
    const data = { notes, deletedNotes, highestZ, timestamp: Date.now() };
    try {
        localStorage.setItem(`deskboard-data-${boardId}`, JSON.stringify(data));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            showToast('Storage full! Clear some notes or bin.');
        }
    }
}

function renameBoard(oldId, newId) {
    const list = getBoardList();
    const idx = list.indexOf(oldId);
    if (idx !== -1) {
        list[idx] = newId;
        saveBoardList(list);
        
        const data = localStorage.getItem(`deskboard-data-${oldId}`);
        if (data) {
            localStorage.removeItem(`deskboard-data-${oldId}`);
            localStorage.setItem(`deskboard-data-${newId}`, data);
        }
        
        if (getCurrentBoardId() === oldId) {
            setCurrentBoardId(newId);
        }
    }
}

function deleteBoard(boardId) {
    const list = getBoardList();
    if (list.length <= 1) {
        showToast('Cannot delete the last board');
        return;
    }
    
    list.splice(list.indexOf(boardId), 1);
    saveBoardList(list);
    localStorage.removeItem(`deskboard-data-${boardId}`);
    
    if (getCurrentBoardId() === boardId) {
        loadBoard(list[0]);
    }
}
