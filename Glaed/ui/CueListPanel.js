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
            this.cueList.playing = false; // manual go behaves like newer cue selection
            if (this.onGo) this.onGo(this.cueList.getCurrentCue());
            this.render();
        });

        this.container.querySelector('#cue-back-btn').addEventListener('click', () => {
            this.cueList.back();
            this.cueList.playing = false;
            if (this.onBack) this.onBack(this.cueList.getCurrentCue());
            this.render();
        });

        const playButton = document.createElement('button');
        playButton.id = 'cue-play-btn';
        playButton.textContent = 'PLAY';
        playButton.addEventListener('click', () => {
            this.cueList.play();
            if (this.onGo) this.onGo(this.cueList.getCurrentCue());
            this.render();
        });

        const pauseButton = document.createElement('button');
        pauseButton.id = 'cue-pause-btn';
        pauseButton.textContent = 'PAUSE';
        pauseButton.addEventListener('click', () => {
            this.cueList.pause();
            if (this.onBack) this.onBack(this.cueList.getCurrentCue());
            this.render();
        });

        const stopButton = document.createElement('button');
        stopButton.id = 'cue-stop-btn';
        stopButton.textContent = 'STOP';
        stopButton.addEventListener('click', () => {
            this.cueList.stop();
            if (this.onBack) this.onBack(this.cueList.getCurrentCue());
            this.render();
        });

        const timelineToggle = document.createElement('button');
        timelineToggle.id = 'timeline-toggle-btn';
        timelineToggle.textContent = 'Timeline Mode: OFF';
        timelineToggle.addEventListener('click', () => {
            this.cueList.setTimelineMode(!this.cueList.timelineMode);
            timelineToggle.textContent = `Timeline Mode: ${this.cueList.timelineMode ? 'ON' : 'OFF'}`;
        });

        const controlsDiv = this.container.querySelector('.cue-panel-controls');
        controlsDiv.appendChild(playButton);
        controlsDiv.appendChild(pauseButton);
        controlsDiv.appendChild(stopButton);
        controlsDiv.appendChild(timelineToggle);

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
            const followLabel = cue.follow ? `• follow ${cue.followTime || 0}s` : '';
            const start = cue.startTime !== undefined ? cue.startTime : (index * 4);
            const duration = cue.duration !== undefined ? cue.duration : (cue.fadeIn || 1);
            row.innerHTML = `
                <span>${String(index + 1).padStart(3,'0')} ${cue.name || cue.id}</span>
                <small class="cue-meta">start ${start.toFixed(2)}s dur ${duration.toFixed(2)}s fade ${cue.fadeIn || 0}s delay ${cue.delay || 0}s ${followLabel}</small>
            `;
            row.addEventListener('click', () => {
                this.cueList.go(index);
                if (this.onGo) this.onGo(this.cueList.getCurrentCue());
                this.render();
            });
            this.listDiv.appendChild(row);
        });
    }
}
