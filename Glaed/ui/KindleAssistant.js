class KindleAssistant {
    constructor(container, cueList, paletteManager) {
        this.container = container;
        this.cueList = cueList;
        this.paletteManager = paletteManager;

        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="kindle-header"><h3>Kindle Assistant</h3></div>
            <textarea id="kindle-prompt" placeholder="Describe your scene (e.g., 'warm intro, energetic chorus')" style="width:100%;height:70px;"></textarea>
            <div style="display:flex;gap:8px;margin-top:8px;">
                <button id="kindle-generate">Generate Cue</button>
                <button id="kindle-clear">Clear</button>
            </div>
            <div id="kindle-status" style="margin-top:8px;color:#ffb400;"></div>
        `;

        this.promptEl = this.container.querySelector('#kindle-prompt');
        this.statusEl = this.container.querySelector('#kindle-status');

        this.container.querySelector('#kindle-generate').addEventListener('click', () => this.generateCue());
        this.container.querySelector('#kindle-clear').addEventListener('click', () => {
            this.promptEl.value = '';
            this.setStatus('');
        });
    }

    setStatus(text) {
        this.statusEl.textContent = text;
    }

    generateCue() {
        const prompt = this.promptEl.value.trim();
        if (!prompt) {
            this.setStatus('Enter a prompt first.');
            return;
        }

        this.setStatus('Generating cue...');

        const palette = this.paletteManager.getAllColorPalettes()[0];
        const cueId = `cue-${String(this.cueList.cues.length + 1).padStart(3, '0')}`;
        const intensity = prompt.toLowerCase().includes('dim') ? 140 : 220;

        const valueKey = palette ? { colorPalette: palette.id } : { color: { r: 255, g: 120, b: 70 } };

        const cue = {
            id: cueId,
            name: `AI: ${prompt.slice(0, 20)}...`,
            fadeIn: 1.5,
            fadeOut: 0,
            delay: 0,
            follow: false,
            data: {
                'wash-1': { intensity, ...valueKey },
                'wash-2': { intensity, ...valueKey }
            }
        };

        this.cueList.addCue(cue);
        this.setStatus(`Generated cue: ${cue.name}`);
        if (this.onCueGenerated) this.onCueGenerated(cue);
    }
}
