function createNoteElement(note) {
    const el = document.createElement('div');
    el.className = `note note-type-${note.type} ${note.isNew ? 'note-new' : ''}`;
    el.id = note.id;
    el.style.left = `${note.x}px`;
    el.style.top = `${note.y}px`;
    el.style.width = `${note.width}px`;
    el.style.height = `${note.height}px`;
    el.style.zIndex = note.zIndex;
    el.style.setProperty('--rot', `${note.rotation}deg`);
    el.style.transform = `rotate(${note.rotation}deg)`;

    if (note.type === 'reminder' && note.reminderState?.isBlinking) {
        el.classList.add('blinking');
    }

    const pinColor = note.type === 'sticky'
        ? 'pin-red'
        : note.type === 'checklist'
            ? 'pin-blue'
            : note.type === 'timer'
                ? 'pin-orange'
                : note.type === 'reminder'
                    ? 'pin-purple'
                    : 'pin-green';

    let contentHTML = '';

    if (note.type === 'photo' && note.image) {
        contentHTML = `
            <div class="note-photo-wrapper">
                <img src="${note.image}" class="note-photo" alt="Pinned photo" draggable="false">
            </div>
        `;
    } else if (note.type === 'timer') {
        const state = getTimerState(note);
        const circumference = 2 * Math.PI * 70;

        contentHTML = `
            <div class="timer-widget">
                <div class="timer-label">Focus Timer</div>
                <div class="timer-display-ring">
                    <svg class="timer-svg" viewBox="0 0 160 160">
                        <circle class="timer-bg-circle" cx="80" cy="80" r="70"/>
                        <circle class="timer-progress-circle" cx="80" cy="80" r="70"
                            stroke-dasharray="${circumference}"
                            stroke-dashoffset="${circumference * (1 - (state.remainingSeconds / state.totalSeconds))}"/>
                    </svg>
                    <div class="timer-time-text">${formatTime(state.remainingSeconds)}</div>
                </div>
                <div class="timer-controls">
                    <button class="timer-btn" onclick="resetTimer('${note.id}')" title="Reset">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    </button>
                    <button class="timer-btn primary timer-play-btn" onclick="startTimer('${note.id}')" title="Start/Pause">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </button>
                </div>
                <div class="timer-presets">
                    ${TIMER_PRESETS.map(preset => `
                        <button class="timer-preset ${state.totalSeconds === preset.seconds && !state.isRunning && !state.isPaused ? 'active' : ''}"
                            onclick="setTimerPreset('${note.id}', ${preset.seconds})">${preset.label}</button>
                    `).join('')}
                </div>
                <div class="timer-status">Ready</div>
            </div>
        `;
    } else if (note.type === 'reminder') {
        const state = getReminderState(note);
        const isConfigured = state.intervalMinutes > 0 && state.nextTrigger > Date.now() - 86400000;

        if (!isConfigured) {
            contentHTML = `
                <div class="reminder-config">
                    <label>What to remind?</label>
                    <input type="text" id="reminder-title-${note.id}" placeholder="e.g. Drink Water">
                    <label>Every how often?</label>
                    <select id="reminder-interval-${note.id}" onchange="handleReminderIntervalChange(this, '${note.id}')">
                        <option value="5">Every 5 minutes</option>
                        <option value="10">Every 10 minutes</option>
                        <option value="15">Every 15 minutes</option>
                        <option value="20">Every 20 minutes</option>
                        <option value="30" selected>Every 30 minutes</option>
                        <option value="45">Every 45 minutes</option>
                        <option value="60">Every hour</option>
                        <option value="120">Every 2 hours</option>
                        <option value="custom">Custom...</option>
                    </select>
                    <input type="number" id="reminder-custom-${note.id}" class="reminder-custom-input" min="1" max="1440" placeholder="Minutes (1-1440)">
                    <button onclick="configureReminder('${note.id}')">Set Reminder</button>
                </div>
            `;
        } else {
            const nextIn = Math.max(0, Math.ceil((state.nextTrigger - Date.now()) / 60000));
            const triggerCount = (state.acknowledgeHistory || []).length;
            const history = (state.acknowledgeHistory || []).slice(-5).reverse();
            const historyHTML = history.length > 0
                ? `<div class="reminder-history">
                    <div class="reminder-history-header">Triggered ${triggerCount}x</div>
                    ${history.map(ts => {
                        const time = new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                        return `<div>✓ ${time}</div>`;
                    }).join('')}
                   </div>`
                : `<div class="reminder-history">Triggered ${triggerCount}x</div>`;

            const reminderTitle = state.title && state.title.trim() ? state.title.trim() : 'Reminder';
            contentHTML = `
                <div class="reminder-display">
                    <div class="reminder-title">${escapeHtml(reminderTitle)}</div>
                    <div class="reminder-next">Next in ~${nextIn} min</div>
                    <div class="reminder-icon">${state.isBlinking ? '🔔' : '⏰'}</div>
                    ${state.isBlinking
                        ? `<button class="reminder-ack" onclick="acknowledgeReminder('${note.id}')" role="button" aria-label="Acknowledge ${escapeHtml(state.title)}">Acknowledge ✓</button>`
                        : `<div class="reminder-interval" aria-live="polite">Every ${state.intervalMinutes} min</div>`
                    }
                    ${historyHTML}
                </div>
            `;
        }
    } else if (note.type === 'checklist') {
        contentHTML = `
            <div class="note-content" style="font-family: var(--font-body);">
                <div class="checklist-title">${escapeHtml(note.content)}</div>
                <div class="checklist-container">
                    ${(note.items || []).map((item, i) => `
                        <div class="checklist-item ${item.checked ? 'checked' : ''}" data-index="${i}">
                            <div class="checklist-checkbox">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <div class="checklist-text">${escapeHtml(item.text)}</div>
                            <div class="checklist-delete" onclick="deleteChecklistItem('${note.id}', ${i})" title="Delete">×</div>
                        </div>
                    `).join('')}
                    <input type="text" class="checklist-input" placeholder="+ Add item..." onkeydown="handleChecklistAdd(event, '${note.id}')">
                </div>
            </div>
        `;
    } else if (note.type === 'quote') {
        contentHTML = `
            <div class="note-content">
                <div class="quote-mark">"</div>
                <div class="quote-text">${escapeHtml(note.content)}</div>
                <div class="quote-attribution">- Daily Inspiration</div>
            </div>
        `;
    } else {
        contentHTML = `<div class="note-content" ${note.type !== 'photo' ? 'contenteditable="false"' : ''}>${escapeHtml(note.content || '')}</div>`;
    }

    const showTape = note.type !== 'sticky';
    const tapeHTML = note.type === 'photo'
        ? '<div class="tape tape-photo"></div>'
        : note.type === 'reminder'
            ? '<div class="tape tape-reminder"></div>'
            : showTape
                ? '<div class="tape"></div>'
                : '';

    el.innerHTML = `
        <div class="note-inner">
            ${tapeHTML}
            <div class="pin ${pinColor} ${note.isNew ? 'pin-animate' : ''}" onclick="togglePin('${note.id}', event)"></div>
            <div class="note-paper" style="background-color: ${note.color || '#fff'};"></div>
            ${contentHTML}
            <div class="note-controls">
                <button class="control-btn" onclick="startEdit('${note.id}', event); event.stopPropagation();" title="Edit">✎</button>
                <button class="control-btn delete" onclick="deleteNote('${note.id}', event)" title="Delete">×</button>
            </div>
            <div class="note-resize-handle" data-note-id="${note.id}"></div>
        </div>
    `;

    el.addEventListener('mousedown', e => startDrag(e, note.id));
    el.addEventListener('touchstart', e => {
        if (e.touches && e.touches.length === 1) {
            startDrag(e, note.id);
        }
    }, { passive: false });
    
    const resizeHandle = el.querySelector('.note-resize-handle');
    if (resizeHandle) {
        resizeHandle.addEventListener('mousedown', e => startResize(e));
        resizeHandle.addEventListener('touchstart', e => {
            if (e.touches && e.touches.length === 1) {
                startResize(e);
            }
        }, { passive: false });
    }

    if (note.type !== 'photo' && note.type !== 'timer' && note.type !== 'reminder') {
        const contentDiv = el.querySelector('.note-content, .checklist-container');
        if (contentDiv) {
            contentDiv.addEventListener('dblclick', e => {
                e.stopPropagation();
                if (note.type === 'checklist') {
                    const titleDiv = el.querySelector('.note-content');
                    if (titleDiv) startEdit(note.id, e);
                } else {
                    startEdit(note.id, e);
                }
            });
        }
    }

    if (note.type === 'checklist') {
        el.querySelectorAll('.checklist-item').forEach(item => {
            item.addEventListener('click', e => {
                if (e.target.closest('.checklist-delete') || e.target.closest('.checklist-checkbox')) {
                    e.stopPropagation();
                    const idx = parseInt(item.dataset.index, 10);
                    toggleChecklistItem(note.id, idx);
                    return;
                }
                if (e.target.closest('.checklist-text')) {
                    e.stopPropagation();
                    const idx = parseInt(item.dataset.index, 10);
                    startEditChecklistItem(note.id, idx, e.target.closest('.checklist-text'));
                    return;
                }
            });
        });

        const titleEl = el.querySelector('.checklist-title');
        if (titleEl) {
            titleEl.addEventListener('click', e => {
                e.stopPropagation();
                startEditChecklistTitle(note.id, titleEl);
            });
        }
    }

    return el;
}

function renderAllNotes() {
    Object.values(timerIntervals).forEach(clearInterval);
    timerIntervals = {};

    board.querySelectorAll('.note').forEach(el => el.remove());
    notes.forEach(note => {
        board.appendChild(createNoteElement(note));
    });
    updateEmptyHint();
}

function renderNote(note) {
    const existing = document.getElementById(note.id);
    if (existing) {
        existing.replaceWith(createNoteElement(note));
    } else {
        board.appendChild(createNoteElement(note));
    }
    updateEmptyHint();
}

function updateEmptyHint() {
    emptyHint.style.display = notes.length === 0 ? 'block' : 'none';
}
