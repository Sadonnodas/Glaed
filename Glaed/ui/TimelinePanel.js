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
            <p id="timeline-hint" style="color:#aaa;font-size:12px;margin:4px 0;">Drag bars to reposition cues; drag right edge to resize.</p>
        `;

        this.content = this.container.querySelector('#timeline-content');
        this.timelineHint = this.container.querySelector('#timeline-hint');
        this.dragState = null; // {mode, cueIndex, offsetX, startTime, startDuration}

        this.render();

        this.cueList.on('cueChange', () => this.render());
        this.animate();
    }

    animate() {
        if (this.cueList.playing) {
            this.render();
        }
        requestAnimationFrame(() => this.animate());
    }

    xToTime(x, width) {
        return x / 10;
    }

    timeToX(time) {
        return time * 10;
    }

    render() {
        const cues = this.cueList.cues;
        this.content.innerHTML = '';

        if (cues.length === 0) {
            this.content.innerHTML = '<p>No cues</p>';
            return;
        }

        // Create timeline canvas
        const canvas = document.createElement('canvas');
        canvas.width = this.content.clientWidth || 400;
        canvas.height = 100;
        canvas.style.width = '100%';
        canvas.style.height = '100px';
        this.content.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw time scale
        ctx.strokeStyle = '#444';
        ctx.beginPath();
        for (let t = 0; t < canvas.width; t += 50) {
            ctx.moveTo(t, 0);
            ctx.lineTo(t, 10);
            ctx.fillStyle = '#888';
            ctx.fillText(`${t / 10}s`, t + 2, 20);
        }
        ctx.stroke();

        // Draw cue bars
        cues.forEach((cue, index) => {
            const startTime = Number(cue.startTime ?? index * 4);
            const duration = Number(cue.duration ?? cue.fadeIn ?? 1);
            const x = this.timeToX(startTime);
            const w = Math.max(10, this.timeToX(duration));

            ctx.fillStyle = index === this.cueList.currentIndex ? '#ffb400' : '#666';
            ctx.fillRect(x, 30, w, 20);

            // right handle for resize
            ctx.fillStyle = '#bbb';
            ctx.fillRect(x + w - 4, 30, 4, 20);

            ctx.fillStyle = '#fff';
            ctx.fillText(cue.name || cue.id, x + 4, 45);

            cue.__timelineData = { index, x, w, startTime, duration };
        });

        // Draw playhead
        if (this.cueList.playing) {
            const currentCue = this.cueList.getCurrentCue();
            const activeStart = currentCue ? Number(currentCue.startTime ?? this.cueList.currentIndex * 4) : 0;
            const roll = (Date.now() % (this.cueList.getCurrentCue()?.duration * 1000 || 4000)) / 1000;
            const playheadX = this.timeToX(activeStart + roll);
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(playheadX, 0);
            ctx.lineTo(playheadX, canvas.height);
            ctx.stroke();
        }

        this.attachCanvasHandlers(canvas, cues);
    }

    attachCanvasHandlers(canvas, cues) {
        const getX = (event) => {
            const rect = canvas.getBoundingClientRect();
            return event.clientX - rect.left;
        };

        canvas.onmousedown = (event) => {
            const x = getX(event);
            const clicked = cues.find(cue => {
                const d = cue.__timelineData;
                return d && x >= d.x && x <= d.x + d.w;
            });
            if (!clicked) return;

            const d = clicked.__timelineData;
            const isResize = x >= d.x + d.w - 6;
            this.dragState = {
                mode: isResize ? 'resize' : 'move',
                cueIndex: d.index,
                offsetX: x - d.x,
                originalStart: d.startTime,
                originalDuration: d.duration
            };
            this.timelineHint.textContent = isResize ? 'Resizing cue...' : 'Moving cue...';
        };

        canvas.onmousemove = (event) => {
            if (!this.dragState) return;
            const x = getX(event);
            const cue = this.cueList.cues[this.dragState.cueIndex];
            if (!cue) return;

            if (this.dragState.mode === 'move') {
                let newX = x - this.dragState.offsetX;
                newX = Math.max(0, newX);
                cue.startTime = Number(this.xToTime(newX).toFixed(2));
            } else if (this.dragState.mode === 'resize') {
                const d = cue.__timelineData;
                if (!d) return;
                let newWidth = Math.max(10, x - d.x);
                cue.duration = Number(this.xToTime(newWidth).toFixed(2));
            }

            this.render();
        };

        const stopDrag = () => {
            if (!this.dragState) return;
            this.dragState = null;
            this.timelineHint.textContent = 'Drag bars to reposition cues; drag right edge to resize.';
            this.render();
        };

        canvas.onmouseup = stopDrag;
        canvas.onmouseleave = stopDrag;
    }
}

