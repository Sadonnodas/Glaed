class CueListPanel {
    constructor(container, cueList) {
        this.container = container;
        this.cueList = cueList;

        this.onGo = null;
        this.onBack = null;

        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="cue-panel-header">
                <h3>Cue List</h3>
                <div class="cue-panel-controls">
                    <button id="cue-back-btn">BACK</button>
                    <button id="cue-go-btn">GO</button>
                </div>
            </div>
            <div id="cue-items" class="cue-items"></div>
        `;

        this.listDiv = this.container.querySelector('#cue-items');

        this.container.querySelector('#cue-go-btn').addEventListener('click', () => {
            this.cueList.go();
            if (this.onGo) this.onGo(this.cueList.getCurrentCue());
            this.render();
        });

        this.container.querySelector('#cue-back-btn').addEventListener('click', () => {
            this.cueList.back();
            if (this.onBack) this.onBack(this.cueList.getCurrentCue());
            this.render();
        });

        this.cueList.onCueChange = (cue) => {
            this.render();
        };

        this.render();
    }

    render() {
        const cues = this.cueList.cues;
        const selectedIndex = this.cueList.currentIndex;

        this.listDiv.innerHTML = '';

        if (cues.length === 0) {
            this.listDiv.innerHTML = '<p>No cues available.</p>';
            return;
        }

        cues.forEach((cue, index) => {
            const row = document.createElement('div');
            row.className = `cue-item ${index === selectedIndex ? 'active' : ''}`;
            row.innerHTML = `<span>${String(index + 1).padStart(3,'0')} ${cue.name || cue.id}</span>`;
            row.addEventListener('click', () => {
                this.cueList.go(index);
                if (this.onGo) this.onGo(this.cueList.getCurrentCue());
                this.render();
            });
            this.listDiv.appendChild(row);
        });
    }
}
