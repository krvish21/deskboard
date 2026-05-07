function getTimerState(note) {
    return note.timerState || {
        totalSeconds: 25 * 60,
        remainingSeconds: 25 * 60,
        isRunning: false,
        isPaused: false,
        isFinished: false
    };
}

function updateTimerDisplay(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note || note.type !== 'timer') return;

    const state = getTimerState(note);
    const el = document.getElementById(noteId);
    if (!el) return;

    const timeText = el.querySelector('.timer-time-text');
    const circle = el.querySelector('.timer-progress-circle');
    const status = el.querySelector('.timer-status');
    const widget = el.querySelector('.timer-widget');

    if (timeText) timeText.textContent = formatTime(state.remainingSeconds);

    if (circle) {
        const circumference = 2 * Math.PI * 70;
        const progress = state.totalSeconds > 0 ? (state.remainingSeconds / state.totalSeconds) : 0;
        circle.style.strokeDashoffset = circumference * (1 - progress);
    }

    if (widget) {
        widget.classList.remove('timer-running', 'timer-paused', 'timer-finished');
        if (state.isFinished) widget.classList.add('timer-finished');
        else if (state.isRunning) widget.classList.add('timer-running');
        else if (state.isPaused) widget.classList.add('timer-paused');
    }

    if (status) {
        if (state.isFinished) status.textContent = "Time's up!";
        else if (state.isRunning) status.textContent = 'Focusing...';
        else if (state.isPaused) status.textContent = 'Paused';
        else status.textContent = 'Ready';
    }

    const playBtn = el.querySelector('.timer-play-btn');
    if (playBtn) {
        playBtn.innerHTML = state.isRunning
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    }
}

function startTimer(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note || note.type !== 'timer') return;

    const state = getTimerState(note);

    if (state.isFinished) {
        state.remainingSeconds = state.totalSeconds;
        state.isFinished = false;
    }

    if (state.isRunning) {
        state.isRunning = false;
        state.isPaused = true;
        clearInterval(timerIntervals[noteId]);
        delete timerIntervals[noteId];
    } else {
        state.isRunning = true;
        state.isPaused = false;

        timerIntervals[noteId] = setInterval(() => {
            const currentNote = notes.find(n => n.id === noteId);
            if (!currentNote) return;

            const currentState = getTimerState(currentNote);
            currentState.remainingSeconds--;

            if (currentState.remainingSeconds <= 0) {
                currentState.remainingSeconds = 0;
                currentState.isRunning = false;
                currentState.isFinished = true;
                clearInterval(timerIntervals[noteId]);
                delete timerIntervals[noteId];
                playTimerCompleteSound();
                showToast('⏰ Timer finished! Click to reset.');
                
                const el = document.getElementById(noteId);
                if (el) {
                    el.classList.add('timer-finished');
                    note.zIndex = ++highestZ;
                    el.style.zIndex = note.zIndex;
                }
            }

            currentNote.timerState = currentState;
            updateTimerDisplay(noteId);
            saveToStorage();
        }, 1000);
    }

    note.timerState = state;
    updateTimerDisplay(noteId);
    saveToStorage();
}

function resetTimer(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note || note.type !== 'timer') return;

    clearInterval(timerIntervals[noteId]);
    delete timerIntervals[noteId];

    const state = getTimerState(note);
    state.remainingSeconds = state.totalSeconds;
    state.isRunning = false;
    state.isPaused = false;
    state.isFinished = false;

    note.timerState = state;
    updateTimerDisplay(noteId);
    saveToStorage();
}

function setTimerPreset(noteId, seconds) {
    const note = notes.find(n => n.id === noteId);
    if (!note || note.type !== 'timer') return;

    clearInterval(timerIntervals[noteId]);
    delete timerIntervals[noteId];

    note.timerState = {
        totalSeconds: seconds,
        remainingSeconds: seconds,
        isRunning: false,
        isPaused: false,
        isFinished: false
    };

    updateTimerDisplay(noteId);
    saveToStorage();
}
