const fs = require('fs');
const path = require('path');

const JS_DIR = path.join(__dirname, 'js');
const OUTPUT_FILE = path.join(__dirname, 'dist', 'deskboard.js');
const CSS_INPUT = path.join(__dirname, 'index.html');
const CSS_OUTPUT = path.join(__dirname, 'dist', 'styles.css');

const JS_FILES = [
    'state.js',
    'dom.js',
    'ui-utils.js',
    'audio.js',
    'clock.js',
    'timers.js',
    'reminders.js',
    'storage.js',
    'recycle-bin.js',
    'renderer.js',
    'notes.js',
    'drag.js',
    'app.js',
    'tests.js'
];

function minifyJS(code) {
    return code
        .replace(/\/\/[^\n]*\n/g, '\n')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{};,:])\s*/g, '$1')
        .replace(/;\}/g, '}')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*\]/g, ']')
        .trim();
}

function minifyCSS(css) {
    return css
        .replace(/\/\*[^\*]*\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{};:,>~+])\s*/g, '$1')
        .replace(/;\}/g, '}')
        .replace(/:\s*/g, ':')
        .replace(/\s*{\s*/g, '{')
        .replace(/\s*}\s*/g, '}')
        .trim();
}

function buildJS() {
    if (!fs.existsSync(path.join(__dirname, 'dist'))) {
        fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
    }
    
    let combined = '';
    
    JS_FILES.forEach(file => {
        const filePath = path.join(JS_DIR, file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            combined += minifyJS(content) + '\n';
        }
    });
    
    fs.writeFileSync(OUTPUT_FILE, combined);
    console.log(`Built JS: ${OUTPUT_FILE} (${combined.length} bytes)`);
}

function buildCSS() {
    const html = fs.readFileSync(CSS_INPUT, 'utf8');
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    
    if (styleMatch) {
        const css = minifyCSS(styleMatch[1]);
        fs.writeFileSync(CSS_OUTPUT, css);
        console.log(`Built CSS: ${CSS_OUTPUT} (${css.length} bytes)`);
    }
}

buildJS();
buildCSS();
console.log('Build complete!');
