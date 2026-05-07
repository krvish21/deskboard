// ─── Unit Tests ───
// Run with: Open browser console and call runTests()

const testResults = { passed: 0, failed: 0 };

function assert(condition, message) {
    if (condition) {
        testResults.passed++;
        console.log(`✓ ${message}`);
    } else {
        testResults.failed++;
        console.error(`✗ ${message}`);
    }
}

function assertEqual(actual, expected, message) {
    const pass = actual === expected;
    if (pass) {
        testResults.passed++;
        console.log(`✓ ${message}`);
    } else {
        testResults.failed++;
        console.error(`✗ ${message}: expected ${expected}, got ${actual}`);
    }
}

function runTests() {
    testResults.passed = 0;
    testResults.failed = 0;
    console.clear();
    console.log('=== Running Unit Tests ===\n');

    testEscapeHtml();
    testGenerateId();
    testGetReminderState();
    testConfigureReminder();
    testEscapeHtmlXSS();
    testChecklistFunctions();
    testStorageAvailable();

    console.log(`\n=== Results: ${testResults.passed} passed, ${testResults.failed} failed ===`);
    return testResults.failed === 0;
}

function testEscapeHtml() {
    console.log('--- escapeHtml ---');
    assertEqual(escapeHtml('<script>'), '&lt;script&gt;', 'Escapes script tags');
    assertEqual(escapeHtml('Hello & World'), 'Hello &amp; World', 'Escapes ampersands');
    assertEqual(escapeHtml('"Quote"'), '&quot;Quote&quot;', 'Escapes quotes');
    assertEqual(escapeHtml('Normal text'), 'Normal text', 'Leaves normal text unchanged');
    assertEqual(escapeHtml(''), '', 'Handles empty string');
}

function testEscapeHtmlXSS() {
    console.log('--- escapeHtml XSS Prevention ---');
    const malicious = '<img src=x onerror=alert(1)>';
    const escaped = escapeHtml(malicious);
    assert(!escaped.includes('<img'), 'Prevents img tag injection');
    assert(!escaped.includes('onerror'), 'Prevents onerror attribute');
}

function testGenerateId() {
    console.log('--- generateId ---');
    const id1 = generateId();
    const id2 = generateId();
    assert(id1.length > 0, 'Generates non-empty ID');
    assert(id1 !== id2, 'Generates unique IDs');
    assert(id1.startsWith('note-'), 'ID has correct prefix');
}

function testGetReminderState() {
    console.log('--- getReminderState ---');
    
    const noteWithState = {
        reminderState: {
            title: 'Test Reminder',
            intervalMinutes: 30,
            isBlinking: false,
            nextTrigger: Date.now() + 60000,
            acknowledgeHistory: [Date.now()]
        }
    };
    
    const state = getReminderState(noteWithState);
    assertEqual(state.title, 'Test Reminder', 'Returns correct title');
    assertEqual(state.intervalMinutes, 30, 'Returns correct interval');
    assert(!state.isBlinking, 'Returns correct blinking state');
    
    const noteWithoutState = { id: 'test', type: 'reminder' };
    const defaultState = getReminderState(noteWithoutState);
    assertEqual(defaultState.intervalMinutes, 0, 'Returns default intervalMinutes when missing');
    assertEqual(defaultState.title, '', 'Returns default title when missing');
}

function testConfigureReminder() {
    console.log('--- configureReminder ---');
    
    const testNote = {
        id: 'test-' + Date.now(),
        type: 'reminder',
        content: '',
        reminderState: null
    };
    notes.push(testNote);
    
    document.body.innerHTML += `
        <div id="${testNote.id}">
            <input id="reminder-title-${testNote.id}" value="Test Title">
            <select id="reminder-interval-${testNote.id}">
                <option value="15">15</option>
            </select>
        </div>
    `;
    
    const initialCount = notes.length;
    configureReminder(testNote.id);
    
    const updatedNote = notes.find(n => n.id === testNote.id);
    assertEqual(updatedNote.reminderState.title, 'Test Title', 'Sets correct title');
    assertEqual(updatedNote.reminderState.intervalMinutes, 15, 'Sets correct interval');
    assert(updatedNote.reminderState.nextTrigger > Date.now(), 'Sets future nextTrigger');
    assert(updatedNote.reminderState.acknowledgeHistory.length > 0, 'Initializes acknowledge history');
    
    notes = notes.filter(n => n.id !== testNote.id);
    document.getElementById(testNote.id)?.remove();
}

function testChecklistFunctions() {
    console.log('--- Checklist Functions ---');
    
    const noteId = 'checklist-test-' + Date.now();
    const testNote = {
        id: noteId,
        type: 'checklist',
        content: 'Test List',
        items: [
            { text: 'Item 1', checked: false },
            { text: 'Item 2', checked: true }
        ]
    };
    notes.push(testNote);
    
    toggleChecklistItem(noteId, 0);
    const toggledNote = notes.find(n => n.id === noteId);
    assert(toggledNote.items[0].checked, 'toggleChecklistItem toggles item');
    
    deleteChecklistItem(noteId, 0);
    const deletedNote = notes.find(n => n.id === noteId);
    assertEqual(deletedNote.items.length, 1, 'deleteChecklistItem removes item');
    
    notes = notes.filter(n => n.id !== noteId);
}

function testStorageAvailable() {
    console.log('--- isStorageAvailable ---');
    assert(typeof isStorageAvailable === 'function', 'isStorageAvailable function exists');
}

function testDragInteraction() {
    console.log('--- shouldBlockDrag ---');
    
    const mockNote = { type: 'sticky' };
    
    const mockTarget = document.createElement('div');
    assert(shouldBlockDrag(mockNote.type, mockTarget) === false, 'Allows dragging by default');
    
    const button = document.createElement('button');
    assert(shouldBlockDrag(mockNote.type, button) === true, 'Blocks button clicks');
    
    const input = document.createElement('input');
    assert(shouldBlockDrag(mockNote.type, input) === true, 'Blocks input fields');
    
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    assert(shouldBlockDrag(mockNote.type, editable) === true, 'Blocks contenteditable');
}

window.runTests = runTests;
window.testResults = testResults;
