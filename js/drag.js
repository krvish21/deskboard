// ─── Interaction Constants ───
const RESIZE_HANDLE = 'resize-handle';
let rotateState = null;

function shouldBlockDrag(noteType, target) {
    if (target.closest('.note-controls') || target.closest('.pin')) return true;
    if (target.closest('.note-resize-handle')) return true;
    if (target.isContentEditable) return true;
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT') return true;
    
    if (noteType === 'timer' && target.closest('.timer-widget')) {
        return true;
    }
    
    if (noteType === 'checklist' && target.closest('.checklist-container')) {
        return true;
    }
    
    return false;
}

function getEventCoords(e) {
    if (e.touches && e.touches.length > 0) {
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
}

function startDrag(e, id) {
    const coords = getEventCoords(e);
    const mockEvent = { target: e.target, clientX: coords.clientX, clientY: coords.clientY };
    
    const note = notes.find(n => n.id === id);
    if (!note) return;
    
    if (note.type === 'reminder' && note.reminderState?.isBlinking) {
        e.preventDefault();
        e.stopPropagation();
        acknowledgeReminder(id);
        return;
    }
    
    if (shouldBlockDrag(note.type, mockEvent.target)) return;

    e.preventDefault();
    
    note.zIndex = ++highestZ;
    const el = document.getElementById(id);
    if (!el) return;
    
    el.style.zIndex = note.zIndex;

    document.querySelectorAll('.note.selected').forEach(n => n.classList.remove('selected'));
    el.classList.add('selected');
    selectedNoteId = id;

    const rect = getBoardRect();
    dragState = {
        id,
        startMouseX: coords.clientX - rect.left,
        startMouseY: coords.clientY - rect.top,
        startNoteX: note.x,
        startNoteY: note.y,
        el
    };

    el.classList.add('dragging');
    
    if (e.touches) {
        document.addEventListener('touchmove', onTouchDragMove, { passive: false });
        document.addEventListener('touchend', onTouchDragEnd);
    } else {
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
    }
}

function onTouchDragMove(e) {
    if (!dragState || !e.touches || e.touches.length === 0) return;
    e.preventDefault();
    
    const rect = getBoardRect();
    const mouseX = e.touches[0].clientX - rect.left;
    const mouseY = e.touches[0].clientY - rect.top;
    const dx = mouseX - dragState.startMouseX;
    const dy = mouseY - dragState.startMouseY;
    const newX = Math.max(0, Math.min(rect.width - 100, dragState.startNoteX + dx));
    const newY = Math.max(0, Math.min(rect.height - 50, dragState.startNoteY + dy));

    dragState.el.style.left = `${newX}px`;
    dragState.el.style.top = `${newY}px`;

    const rot = notes.find(n => n.id === dragState.id)?.rotation || 0;
    dragState.el.style.transform = `rotate(${rot}deg) scale(1.03)`;

    checkBinHover(e.touches[0].clientX, e.touches[0].clientY);
}

function onTouchDragEnd(e) {
    if (!dragState) return;
    
    cleanupDragListeners();

    const isOverBin = dragState.el.classList.contains('drag-over');
    recycleBin.classList.remove('drag-over');

    const note = notes.find(n => n.id === dragState.id);

    if (isOverBin && note) {
        dragState.el.style.transition = 'all 0.2s ease';
        dragState.el.style.transform = 'scale(0.1)';
        dragState.el.style.opacity = '0';

        setTimeout(() => {
            moveToBin(note);
            notes = notes.filter(n => n.id !== dragState.id);
            if (dragState.el) dragState.el.remove();
            updateEmptyHint();
            playDeleteSound();
            showToast('Moved to bin');
        }, 200);
    } else if (note) {
        note.x = Math.max(0, note.x);
        note.y = Math.max(0, note.y);
        saveToStorage();
    }

    if (dragState.el) {
        dragState.el.classList.remove('dragging');
        if (!isOverBin && note) {
            dragState.el.style.transform = `rotate(${note?.rotation || 0}deg)`;
        }
    }

    dragState = null;
}

function onDragMove(e) {
    if (!dragState) return;

    const rect = getBoardRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const dx = mouseX - dragState.startMouseX;
    const dy = mouseY - dragState.startMouseY;
    const newX = Math.max(0, Math.min(rect.width - 100, dragState.startNoteX + dx));
    const newY = Math.max(0, Math.min(rect.height - 50, dragState.startNoteY + dy));

    dragState.el.style.left = `${newX}px`;
    dragState.el.style.top = `${newY}px`;

    const rot = notes.find(n => n.id === dragState.id)?.rotation || 0;
    dragState.el.style.transform = `rotate(${rot}deg) scale(1.03)`;

    checkBinHover(e.clientX, e.clientY);
}

function onDragEnd(e) {
    if (!dragState) return;

    const currentDrag = dragState;
    const isOverBin = checkBinHover(e.clientX, e.clientY);
    recycleBin.classList.remove('drag-over');

    const note = notes.find(n => n.id === currentDrag.id);

    if (isOverBin && note) {
        currentDrag.el.style.transition = 'all 0.2s ease';
        currentDrag.el.style.transform = 'scale(0.1)';
        currentDrag.el.style.opacity = '0';

        setTimeout(() => {
            moveToBin(note);
            notes = notes.filter(n => n.id !== currentDrag.id);
            if (currentDrag.el) currentDrag.el.remove();
            updateEmptyHint();
            playDeleteSound();
            showToast('Moved to bin');
        }, 200);
    } else if (note) {
        const rect = getBoardRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const dx = mouseX - currentDrag.startMouseX;
        const dy = mouseY - currentDrag.startMouseY;

        note.x = Math.max(0, Math.min(rect.width - note.width, currentDrag.startNoteX + dx));
        note.y = Math.max(0, Math.min(rect.height - note.height, currentDrag.startNoteY + dy));
        saveToStorage();
    }

    if (currentDrag.el) {
        currentDrag.el.classList.remove('dragging');
        if (!isOverBin && note) {
            currentDrag.el.style.transform = `rotate(${note?.rotation || 0}deg)`;
        }
    }

    dragState = null;
    cleanupDragListeners();
}

function startResize(e) {
    const handle = e.target.closest('.note-resize-handle');
    if (!handle) return;
    
    const noteId = handle.dataset.noteId;
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const el = document.getElementById(noteId);
    if (!el) return;
    
    note.zIndex = ++highestZ;
    el.style.zIndex = note.zIndex;
    
    const coords = getEventCoords(e);
    
    resizeState = {
        id: noteId,
        startMouseX: coords.clientX,
        startMouseY: coords.clientY,
        startWidth: note.width,
        startHeight: note.height,
        el
    };
    
    if (e.touches) {
        document.addEventListener('touchmove', onTouchResizeMove, { passive: false });
        document.addEventListener('touchend', onTouchResizeEnd);
    } else {
        document.addEventListener('mousemove', onResizeMove);
        document.addEventListener('mouseup', onResizeEnd);
    }
}

function onTouchResizeMove(e) {
    if (!resizeState || !e.touches || e.touches.length === 0) return;
    e.preventDefault();
    
    const dx = e.touches[0].clientX - resizeState.startMouseX;
    const dy = e.touches[0].clientY - resizeState.startMouseY;
    
    const newWidth = Math.max(150, Math.min(600, resizeState.startWidth + dx));
    const newHeight = Math.max(100, Math.min(800, resizeState.startHeight + dy));
    
    const note = notes.find(n => n.id === resizeState.id);
    if (note) {
        note.width = newWidth;
        note.height = newHeight;
    }
    
    resizeState.el.style.width = `${newWidth}px`;
    resizeState.el.style.height = `${newHeight}px`;
    
    if (resizeSaveTimeout) clearTimeout(resizeSaveTimeout);
    resizeSaveTimeout = setTimeout(() => {
        if (resizeState) saveToStorage();
    }, 300);
}

function onTouchResizeEnd() {
    if (!resizeState) return;
    
    cleanupResizeListeners();
    saveToStorage();
    resizeState = null;
}

let resizeSaveTimeout = null;

function onResizeMove(e) {
    if (!resizeState) return;
    
    const dx = e.clientX - resizeState.startMouseX;
    const dy = e.clientY - resizeState.startMouseY;
    
    const newWidth = Math.max(150, Math.min(600, resizeState.startWidth + dx));
    const newHeight = Math.max(100, Math.min(800, resizeState.startHeight + dy));
    
    const note = notes.find(n => n.id === resizeState.id);
    if (note) {
        note.width = newWidth;
        note.height = newHeight;
    }
    
    resizeState.el.style.width = `${newWidth}px`;
    resizeState.el.style.height = `${newHeight}px`;
    
    if (resizeSaveTimeout) clearTimeout(resizeSaveTimeout);
    resizeSaveTimeout = setTimeout(() => {
        if (resizeState) saveToStorage();
    }, 300);
}

function onResizeEnd() {
    if (!resizeState) return;
    
    saveToStorage();
    resizeState = null;
    cleanupResizeListeners();
}

function cleanupDragListeners() {
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchmove', onTouchDragMove);
    document.removeEventListener('touchend', onTouchDragEnd);
}

function cleanupResizeListeners() {
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
    document.removeEventListener('touchmove', onTouchResizeMove);
    document.removeEventListener('touchend', onTouchResizeEnd);
}

function startRotate(e) {
    const handle = e.target.closest('.note-rotate-handle');
    if (!handle) return;

    const noteId = handle.dataset.noteId;
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    e.preventDefault();
    e.stopPropagation();

    const el = document.getElementById(noteId);
    if (!el) return;

    el.classList.add('rotating');

    const coords = getEventCoords(e);
    const rect = getBoardRect();
    const centerX = note.x + note.width / 2;
    const centerY = note.y + note.height / 2;

    rotateState = {
        id: noteId,
        startMouseX: coords.clientX,
        startMouseY: coords.clientY,
        startRotation: note.rotation,
        el,
        note,
        centerX,
        centerY
    };

    if (e.touches) {
        document.addEventListener('touchmove', onTouchRotateMove, { passive: false });
        document.addEventListener('touchend', onTouchRotateEnd);
    } else {
        document.addEventListener('mousemove', onRotateMove);
        document.addEventListener('mouseup', onRotateEnd);
    }
}

function onRotateMove(e) {
    if (!rotateState) return;

    const dx = e.clientX - rotateState.centerX;
    const dy = e.clientY - rotateState.centerY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

    rotateState.el.style.transform = `rotate(${angle}deg)`;
}

function onRotateEnd(e) {
    if (!rotateState) return;

    const dx = e.clientX - rotateState.centerX;
    const dy = e.clientY - rotateState.centerY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

    rotateState.note.rotation = angle;
    rotateState.el.style.transform = `rotate(${angle}deg)`;
    rotateState.el.style.setProperty('--rot', `${angle}deg`);
    rotateState.el.classList.remove('rotating');

    saveToStorage();
    cleanupRotateListeners();
    rotateState = null;
}

function onTouchRotateMove(e) {
    if (!rotateState || !e.touches || e.touches.length === 0) return;
    e.preventDefault();

    const dx = e.touches[0].clientX - rotateState.centerX;
    const dy = e.touches[0].clientY - rotateState.centerY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

    rotateState.el.style.transform = `rotate(${angle}deg)`;
}

function onTouchRotateEnd() {
    if (!rotateState) return;

    rotateState.note.rotation = rotateState.note.rotation;
    rotateState.el.style.setProperty('--rot', `${rotateState.note.rotation}deg`);
    rotateState.el.classList.remove('rotating');

    saveToStorage();
    cleanupRotateListeners();
    rotateState = null;
}

function cleanupRotateListeners() {
    document.removeEventListener('mousemove', onRotateMove);
    document.removeEventListener('mouseup', onRotateEnd);
    document.removeEventListener('touchmove', onTouchRotateMove);
    document.removeEventListener('touchend', onTouchRotateEnd);
}
