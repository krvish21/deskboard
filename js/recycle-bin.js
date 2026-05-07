function updateBinUI() {
    const count = deletedNotes.length;
    binCount.textContent = count > 0 ? `${count}` : '';
    recycleBin.style.opacity = count > 0 ? '1' : '0.7';
}

function moveToBin(note) {
    const noteWithMeta = {
        ...note,
        deletedAt: Date.now(),
        originalId: note.id
    };
    deletedNotes.unshift(noteWithMeta);
    updateBinUI();
    saveToStorage();
}

function restoreFromBin(index) {
    const note = deletedNotes[index];
    if (!note) return;

    pushHistory();

    note.id = generateId();
    note.zIndex = ++highestZ;
    note.x = Math.max(50, note.x);
    note.y = Math.max(50, note.y);
    note.isNew = true;

    if (note.type === 'timer') {
        note.timerState = {
            totalSeconds: note.timerState?.totalSeconds || 25 * 60,
            remainingSeconds: note.timerState?.totalSeconds || 25 * 60,
            isRunning: false,
            isPaused: false,
            isFinished: false
        };
    }

    if (note.type === 'reminder') {
        note.reminderState = {
            ...note.reminderState,
            isBlinking: false,
            lastAcknowledged: Date.now()
        };
    }

    deletedNotes.splice(index, 1);
    notes.push(note);
    renderNote(note);
    updateBinUI();
    saveToStorage();
    showToast('Note restored!');
    playPinSound();

    setTimeout(() => {
        note.isNew = false;
        const el = document.getElementById(note.id);
        if (el) el.classList.remove('note-new');
    }, 500);
}

function permanentlyDelete(index) {
    deletedNotes.splice(index, 1);
    updateBinUI();
    saveToStorage();
    renderBinModal();
}

function emptyBin() {
    if (!confirm(`Permanently delete all ${deletedNotes.length} items? This cannot be undone.`)) return;

    deletedNotes = [];
    updateBinUI();
    saveToStorage();
    renderBinModal();
    showToast('Bin emptied');
}

function openBinModal() {
    renderBinModal();
    document.getElementById('binModalOverlay').classList.add('show');
}

function closeBinModal(event) {
    if (!event || event.target === document.getElementById('binModalOverlay')) {
        document.getElementById('binModalOverlay').classList.remove('show');
    }
}

function renderBinModal() {
    const body = document.getElementById('binModalBody');
    const total = document.getElementById('binTotal');
    const emptyBtn = document.getElementById('binEmptyBtn');

    total.textContent = `${deletedNotes.length} item${deletedNotes.length !== 1 ? 's' : ''}`;
    emptyBtn.style.display = deletedNotes.length > 0 ? 'block' : 'none';

    if (deletedNotes.length === 0) {
        body.innerHTML = '<div class="bin-empty">No deleted items</div>';
        return;
    }

    body.innerHTML = deletedNotes.map((note, index) => {
        const typeIcons = {
            sticky: '📝',
            paper: '📄',
            checklist: '☑️',
            timer: '⏱️',
            reminder: '⏰',
            quote: '💬',
            photo: '🖼️'
        };
        const preview = note.type === 'photo' ? '🖼️' : (note.content || 'No content').substring(0, 30);
        const timeAgo = getTimeAgo(note.deletedAt);

        return `
            <div class="bin-item">
                <div class="bin-item-preview">${typeIcons[note.type] || '📌'}</div>
                <div class="bin-item-info">
                    <div class="bin-item-type">${note.type} · ${timeAgo}</div>
                    <div class="bin-item-content">${preview}</div>
                </div>
                <div class="bin-item-actions">
                    <button class="bin-item-btn restore" onclick="restoreFromBin(${index})">Restore</button>
                    <button class="bin-item-btn perm-delete" onclick="permanentlyDelete(${index})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function checkBinHover(x, y) {
    const binRect = recycleBin.getBoundingClientRect();
    const isOver = x >= binRect.left && x <= binRect.right
        && y >= binRect.top && y <= binRect.bottom;

    recycleBin.classList.toggle('drag-over', isOver);
    return isOver;
}
