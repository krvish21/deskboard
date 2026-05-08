function getReminderState(note) {
    if (!note.reminderState) {
        return {
            title: '',
            intervalMinutes: 0,
            lastAcknowledged: Date.now(),
            isBlinking: false,
            nextTrigger: Date.now() + 365 * 24 * 60 * 60 * 1000,
            acknowledgeHistory: []
        };
    }
    
    return note.reminderState;
}

function configureReminder(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note || note.type !== 'reminder') return;

    const titleInput = document.getElementById(`reminder-title-${noteId}`);
    const intervalInput = document.getElementById(`reminder-interval-${noteId}`);
    const customInput = document.getElementById(`reminder-custom-${noteId}`);
    const rawTitle = titleInput?.value?.trim();
    const title = rawTitle ? rawTitle : 'Reminder';
    let minutes = parseInt(intervalInput?.value, 10) || 30;
    
    if (intervalInput?.value === 'custom') {
        minutes = parseInt(customInput?.value, 10) || 30;
    }
    
    const now = Date.now();

    note.reminderState = {
        title: title,
        intervalMinutes: minutes,
        lastAcknowledged: now,
        isBlinking: false,
        nextTrigger: now + minutes * 60 * 1000,
        acknowledgeHistory: [now]
    };

    note.content = title;
    note.color = '#fef3c7';

    saveToStorage();
    renderNote(note);
    showToast(`Reminder set: every ${minutes} min`);
    playPinSound();
}

function acknowledgeReminder(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note || note.type !== 'reminder') return;

    const now = Date.now();
    const history = note.reminderState?.acknowledgeHistory || [];
    const triggerCount = history.length;
    const intervalMinutes = note.reminderState?.intervalMinutes || 30;
    const title = note.reminderState?.title || 'Reminder';

    note.reminderState = {
        title: title,
        intervalMinutes: intervalMinutes,
        lastAcknowledged: now,
        isBlinking: false,
        nextTrigger: now + intervalMinutes * 60 * 1000,
        acknowledgeHistory: [...history, now]
    };

    const el = document.getElementById(noteId);
    if (el) {
        el.classList.remove('blinking');
    }

    saveToStorage();
    renderNote(note);
    showToast(`Reminder acknowledged ✓ (triggered ${triggerCount + 1}x)`);
    playPinSound();
}

function checkReminders() {
    const now = Date.now();

    notes.forEach(note => {
        if (note.type !== 'reminder') return;

        const state = getReminderState(note);
        if (state.intervalMinutes === 0 || state.isBlinking) return;

        if (now >= state.nextTrigger) {
            const history = note.reminderState?.acknowledgeHistory || [];
            
            note.reminderState = {
                title: state.title,
                intervalMinutes: state.intervalMinutes,
                lastAcknowledged: now,
                isBlinking: true,
                nextTrigger: now,
                acknowledgeHistory: [...history]
            };

            const el = document.getElementById(note.id);
            if (el) {
                el.classList.add('blinking');
                note.zIndex = ++highestZ;
                el.style.zIndex = note.zIndex;
            }

            playReminderAlertSound();
            showToast(`🔔 ${state.title}! Click to acknowledge.`);
            saveToStorage();
        }
    });
}

document.addEventListener('change', e => {
    if (e.target.id && e.target.id.startsWith('reminder-interval-')) {
        const noteId = e.target.id.replace('reminder-interval-', '');
        handleReminderIntervalChange(e.target, noteId);
    }
});

function handleReminderIntervalChange(selectEl, noteId) {
    const customInput = document.getElementById(`reminder-custom-${noteId}`);
    if (customInput) {
        if (selectEl.value === 'custom') {
            customInput.style.setProperty('display', 'block', 'important');
            customInput.focus();
        } else {
            customInput.style.display = 'none';
        }
    }
}
