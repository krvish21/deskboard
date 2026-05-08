function scatterNotes() {
    const rect = getBoardRect();
    notes.forEach(note => {
        note.x = Math.random() * (rect.width - note.width - 50) + 25;
        note.y = Math.random() * (rect.height - note.height - 50) + 25;
        note.rotation = (Math.random() * 10) - 5;
    });
    renderAllNotes();
    saveToStorage();
    showToast('Notes scattered!');
}

function clearAll() {
    if (!confirm('Clear entire board? Items will be moved to recycle bin.')) return;

    pushHistory();
    [...notes].forEach(note => moveToBin(note));
    Object.values(timerIntervals).forEach(clearInterval);
    timerIntervals = {};

    notes = [];
    highestZ = 10;
    renderAllNotes();
    updateBinUI();
    saveToStorage();
    showToast('All items moved to bin');
}

function openBoardModal() {
    renderBoardModal();
    document.getElementById('boardModalOverlay').classList.add('show');
}

function closeBoardModal(event) {
    if (!event || event.target === document.getElementById('boardModalOverlay')) {
        document.getElementById('boardModalOverlay').classList.remove('show');
    }
}

function renderBoardModal() {
    const body = document.getElementById('boardModalBody');
    const list = getBoardList();
    const currentId = getCurrentBoardId();

    body.innerHTML = list.map(id => `
        <div class="board-item ${id === currentId ? 'active' : ''}" onclick="switchBoard('${id}')">
            <span class="board-item-name">${id}</span>
            ${list.length > 1 ? `<span class="board-item-delete" onclick="event.stopPropagation(); deleteBoardAndSwitch('${id}')">×</span>` : ''}
        </div>
    `).join('');
}

function switchBoard(boardId) {
    saveBoard(getCurrentBoardId());
    closeBoardModal();
    loadBoard(boardId);
    renderAllNotes();
}

function createNewBoard() {
    const name = prompt('New board name:');
    if (!name || !name.trim()) return;
    
    const list = getBoardList();
    if (list.includes(name.trim())) {
        showToast('Board already exists');
        return;
    }
    
    list.push(name.trim());
    saveBoardList(list);
    closeBoardModal();
    loadBoard(name.trim());
}

function deleteBoardAndSwitch(boardId) {
    if (!confirm(`Delete board "${boardId}"? This cannot be undone.`)) return;
    
    deleteBoard(boardId);
    closeBoardModal();
    renderBoardModal();
}

function exportBoard() {
    const boardId = getCurrentBoardId();
    const data = {
        version: 1,
        boardId,
        notes,
        deletedNotes,
        highestZ,
        exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deskboard-${boardId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Board exported');
}

function importBoard(file) {
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.notes || !Array.isArray(data.notes)) {
                throw new Error('Invalid format');
            }
            
            const boardId = data.boardId || `imported-${Date.now()}`;
            const list = getBoardList();
            if (!list.includes(boardId)) {
                list.push(boardId);
                saveBoardList(list);
            }
            
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
                }
            });
            
            setCurrentBoardId(boardId);
            saveToStorage();
            renderAllNotes();
            showToast(`Imported board: ${boardId}`);
        } catch (err) {
            showToast('Failed to import: Invalid file format');
        }
    };
    reader.readAsText(file);
}

function exportBoardAsImage() {
    showToast('Tip: Use browser screenshot (Cmd/Ctrl+Shift+4) for best quality');
}

const SHORTCUTS = [
    { key: 'N', desc: 'New sticky note' },
    { key: 'T', desc: 'New timer' },
    { key: 'R', desc: 'New reminder' },
    { key: 'C', desc: 'New checklist' },
    { key: 'Q', desc: 'New quote' },
    { key: '/ or Ctrl+F', desc: 'Focus search' },
    { key: 'Enter', desc: 'Acknowledge reminder' },
    { key: 'Delete', desc: 'Delete selected note' },
    { key: 'Escape', desc: 'Deselect / close modal' },
{ key: 'Ctrl+Z', desc: 'Undo' },
    { key: 'Ctrl+Shift+Z / Y', desc: 'Redo' },
    { key: 'Ctrl+?', desc: 'Show shortcuts' }
];

function showShortcutsModal() {
    const overlay = document.createElement('div');
    overlay.className = 'bin-modal-overlay show';
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
    
    const shortcutsList = SHORTCUTS.map(s => `
        <div class="shortcut-item">
            <span>${s.desc}</span>
            <span class="shortcut-key">${s.key}</span>
        </div>
    `).join('');
    
    overlay.innerHTML = `
        <div class="bin-modal shortcuts-modal" onclick="event.stopPropagation()">
            <div class="bin-modal-header">
                <h2>Keyboard Shortcuts</h2>
                <button class="close-btn" onclick="this.closest('.bin-modal-overlay').remove()">×</button>
            </div>
            <div class="bin-modal-body">${shortcutsList}</div>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

function initApp() {
    recycleBin.addEventListener('dragenter', e => e.preventDefault());
    recycleBin.addEventListener('dragover', e => e.preventDefault());

    searchInput.addEventListener('input', e => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.note').forEach(el => {
            const note = notes.find(n => n.id === el.id);
            if (!note) return;

            const match = !query 
                || note.content.toLowerCase().includes(query)
                || (note.items && note.items.some(i => i.text.toLowerCase().includes(query)))
                || (note.reminderState && note.reminderState.title.toLowerCase().includes(query))
                || (note.title && note.title.toLowerCase().includes(query));

            el.classList.toggle('search-hidden', !!query && !match);
        });
    });

    document.addEventListener('keydown', e => {
        if ((e.key === '/' || (e.key === 'f' && (e.metaKey || e.ctrlKey))) 
            && !e.target.isContentEditable 
            && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            searchInput.focus();
            return;
        }

        if (e.key === 'Escape' && document.activeElement === searchInput) {
            searchInput.value = '';
            searchInput.blur();
            document.querySelectorAll('.note.search-hidden').forEach(el => {
                el.classList.remove('search-hidden');
            });
        }

        if (e.key === 'n' && !e.target.isContentEditable && !e.metaKey && !e.ctrlKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
            e.preventDefault();
            addNote('sticky');
        }

        if (e.key === 't' && !e.target.isContentEditable && !e.metaKey && !e.ctrlKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
            e.preventDefault();
            addNote('timer');
        }

        if (e.key === 'r' && !e.target.isContentEditable && !e.metaKey && !e.ctrlKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
            e.preventDefault();
            addNote('reminder');
        }

        if ((e.metaKey || e.ctrlKey) && e.key === '/' && !e.target.isContentEditable) {
            e.preventDefault();
            showShortcutsModal();
        }
    });

    board.addEventListener('mousedown', e => {
        if (e.target === board || e.target.classList.contains('empty-hint')) {
            document.querySelectorAll('.note.selected').forEach(n => n.classList.remove('selected'));
            selectedNoteId = null;
        }
    });

    autoSaveInterval = setInterval(() => {
        if (notes.length > 0 || deletedNotes.length > 0) saveToStorage();
    }, 30000);

    reminderCheckInterval = setInterval(checkReminders, 10000);
    setInterval(updateClock, 1000);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) saveToStorage();
    });

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const rect = getBoardRect();
            notes.forEach(note => {
                note.x = Math.min(note.x, rect.width - note.width);
                note.y = Math.min(note.y, rect.height - note.height);
            });
            renderAllNotes();
        }, 250);
    });

    updateClock();
    loadFromStorage();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    if (isDarkMode()) {
        applyDarkMode(true);
    }

    applyBoardTexture(getBoardTexture());

    if (notes.length <= 5) {
        setTimeout(() => showToast('N=sticky, T=timer, R=reminder'), 1500);
    }
}
