class TimelinePanel {
    constructor(container, cueList) {
        this.container = container;
        this.cueList = cueList;

        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="timeline-header"><h3>Timeline</h3></div>
            <div class="timeline-content" id="timeline-content"></div>
        `;

        this.content = this.container.querySelector('#timeline-content');
        this.render();

        this.cueList.onCueChange = () => this.render();
    }

    render() {
        const cues = this.cueList.cues;
        this.content.innerHTML = '';

        if (cues.length === 0) {
            this.content.innerHTML = '<p>No cues</p>';
            return;
        }

        cues.forEach((cue, index) => {
            const entry = document.createElement('div');
            entry.className = 'timeline-entry';
            entry.textContent = `${index + 1}. ${cue.name || cue.id} (fade ${cue.fadeIn}s, delay ${cue.delay}s)`;
            if (index === this.cueList.currentIndex) {
                entry.classList.add('active');
            }
            this.content.appendChild(entry);
        });
    }
}
