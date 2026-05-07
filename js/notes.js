function addNote(type, overrides = {}) {
    pushHistory();
    const id = generateId();
    const rect = getBoardRect();
    const defaultX = Math.max(50, (rect.width / 2) - 125 + (Math.random() * 100 - 50));
    const defaultY = Math.max(50, (rect.height / 2) - 125 + (Math.random() * 100 - 50));

    const note = {
        id,
        type,
        x: overrides.x ?? defaultX,
        y: overrides.y ?? defaultY,
        rotation: (Math.random() * 6) - 3,
        zIndex: ++highestZ,
        content: overrides.content ?? (type === 'quote' ? QUOTES[Math.floor(Math.random() * QUOTES.length)] : 'New Note'),
        color: type === 'sticky' ? STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)] : '#ffffff',
        width: type === 'photo' ? 320 : (type === 'quote' ? 260 : (type === 'timer' ? 260 : 240)),
        height: type === 'photo' ? 320 : (type === 'quote' ? 180 : (type === 'timer' ? 320 : (type === 'reminder' ? 220 : 240))),
        isPinned: true,
        createdAt: Date.now(),
        isNew: true,
        ...overrides
    };

    if (type === 'checklist' && !overrides.items) {
        note.items = [{ text: 'First task', checked: false }];
    }

    if (type === 'timer' && !overrides.timerState) {
        note.timerState = {
            totalSeconds: 25 * 60,
            remainingSeconds: 25 * 60,
            isRunning: false,
            isPaused: false,
            isFinished: false
        };
    }

    if (type === 'reminder' && !overrides.reminderState) {
        note.reminderState = {
            title: '',
            intervalMinutes: 0,
            lastAcknowledged: Date.now(),
            isBlinking: false,
            nextTrigger: Date.now() + 365 * 24 * 60 * 60 * 1000
        };
    }

    notes.push(note);
    renderNote(note);
    playPinSound();

    setTimeout(() => {
        note.isNew = false;
        const el = document.getElementById(id);
        if (el) el.classList.remove('note-new');
    }, 500);

    saveToStorage();
    return note;
}

function deleteNote(id, event) {
    if (event) event.stopPropagation();

    const note = notes.find(n => n.id === id);
    if (!note) return;

    pushHistory();

    if (note.type === 'timer' && timerIntervals[id]) {
        clearInterval(timerIntervals[id]);
        delete timerIntervals[id];
    }

    const el = document.getElementById(id);
    if (el) {
        el.style.transition = 'all 0.3s ease';
        el.style.transform = `${el.style.transform} scale(0)`;
        el.style.opacity = '0';
    }

    setTimeout(() => {
        moveToBin(note);
        notes = notes.filter(n => n.id !== id);
        if (el) el.remove();
        updateEmptyHint();
        playDeleteSound();
    }, 300);
}

function togglePin(id, event) {
    if (event) event.stopPropagation();

    const note = notes.find(n => n.id === id);
    if (!note) return;

    note.isPinned = !note.isPinned;
    const el = document.getElementById(id);
    const pin = el?.querySelector('.pin');

    if (note.isPinned) {
        pin?.classList.add('pin-animate');
        playPinSound();
    } else {
        pin?.classList.remove('pin-animate');
        playDeleteSound();
    }

    saveToStorage();
}

function startEdit(id, event) {
    if (event) event.stopPropagation();

    const note = notes.find(n => n.id === id);
    if (!note || note.type === 'photo' || note.type === 'timer' || note.type === 'reminder' || note.type === 'checklist') return;

    const el = document.getElementById(id);
    if (!el) return;

    const content = el.querySelector('.note-content');
    if (!content) return;

    document.querySelectorAll('.note.selected').forEach(n => n.classList.remove('selected'));
    document.querySelectorAll('.note.editing').forEach(n => n.classList.remove('editing'));
    el.classList.add('selected', 'editing');
    selectedNoteId = id;

    content.contentEditable = 'true';
    content.focus();

    const range = document.createRange();
    range.selectNodeContents(content);
    range.collapse(false);

    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    function onBlur() {
        content.contentEditable = 'false';
        note.content = content.innerText;
        el.classList.remove('editing');
        saveToStorage();
        content.removeEventListener('blur', onBlur);
        content.removeEventListener('keydown', onKeydown);
    }

    function onKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey && note.type !== 'paper') {
            e.preventDefault();
            content.blur();
        }
    }

    content.addEventListener('blur', onBlur);
    content.addEventListener('keydown', onKeydown);
}

function toggleChecklistItem(noteId, itemIndex) {
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.items) return;

    note.items[itemIndex].checked = !note.items[itemIndex].checked;
    saveToStorage();
    renderNote(note);
    playPinSound();
}

function deleteChecklistItem(noteId, itemIndex) {
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.items) return;

    note.items.splice(itemIndex, 1);
    saveToStorage();
    renderNote(note);
    playDeleteSound();
}

function startEditChecklistTitle(noteId, titleEl) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    titleEl.classList.add('editing');
    titleEl.contentEditable = 'true';
    titleEl.focus();

    const range = document.createRange();
    range.selectNodeContents(titleEl);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    function onBlur() {
        titleEl.contentEditable = 'false';
        note.content = titleEl.innerText.trim() || 'Checklist';
        titleEl.classList.remove('editing');
        saveToStorage();
        titleEl.removeEventListener('blur', onBlur);
        titleEl.removeEventListener('keydown', onKeydown);
    }

    function onKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            titleEl.blur();
        }
        if (e.key === 'Escape') {
            titleEl.innerText = note.content;
            titleEl.blur();
        }
    }

    titleEl.addEventListener('blur', onBlur);
    titleEl.addEventListener('keydown', onKeydown);
}

function startEditChecklistItem(noteId, itemIndex, textEl) {
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.items || !note.items[itemIndex]) return;

    const item = note.items[itemIndex];
    const parentItem = textEl.closest('.checklist-item');
    if (!parentItem) return;

    parentItem.classList.add('editing');
    textEl.contentEditable = 'true';
    textEl.focus();

    const range = document.createRange();
    range.selectNodeContents(textEl);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    function onBlur() {
        textEl.contentEditable = 'false';
        item.text = textEl.innerText.trim() || item.text;
        parentItem.classList.remove('editing');
        saveToStorage();
        textEl.removeEventListener('blur', onBlur);
        textEl.removeEventListener('keydown', onKeydown);
    }

    function onKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            textEl.blur();
        }
        if (e.key === 'Escape') {
            textEl.innerText = item.text;
            textEl.blur();
        }
    }

    textEl.addEventListener('blur', onBlur);
    textEl.addEventListener('keydown', onKeydown);
}

function handleChecklistAdd(event, noteId) {
    if (event.key === 'Enter' && event.target.value.trim()) {
        const note = notes.find(n => n.id === noteId);
        if (!note) return;

        note.items = note.items || [];
        note.items.push({ text: event.target.value.trim(), checked: false });
        event.target.value = '';
        saveToStorage();
        renderNote(note);
        playPinSound();

        setTimeout(() => {
            const el = document.getElementById(noteId);
            const input = el?.querySelector('.checklist-input');
            if (input) input.focus();
        }, 50);
    }
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            const maxDim = 320;
            let w = img.naturalWidth;
            let h = img.naturalHeight;

            if (w > maxDim || h > maxDim) {
                if (w > h) {
                    h = (h / w) * maxDim;
                    w = maxDim;
                } else {
                    w = (w / h) * maxDim;
                    h = maxDim;
                }
            }

            addNote('photo', {
                image: e.target.result,
                width: Math.round(w),
                height: Math.round(h)
            });
        };
        img.src = e.target.result;
    };
    reader.onerror = () => {
        showToast('Failed to load image');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}
