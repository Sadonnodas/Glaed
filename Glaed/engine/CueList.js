class CueList extends EventEmitter {
    constructor() {
        super();
        this.cues = [];
        this.currentIndex = -1;
        this.playing = false;
        this.timelineMode = false;
        this.followTimer = null;
        this.timelineStart = null;
        this.timelineFrame = null;
    }

    addCue(cue) {
        if (!cue || !cue.id) {
            throw new Error('Cue must have an id.');
        }
        this.cues.push(cue);
    }

    removeCue(id) {
        this.cues = this.cues.filter(c => c.id !== id);
        if (this.currentIndex >= this.cues.length) {
            this.currentIndex = this.cues.length - 1;
        }
        this._emitCurrent();
    }

    getCurrentCue() {
        return this.cues[this.currentIndex] || null;
    }

    play() {
        if (this.cues.length === 0) return;
        if (this.timelineMode) {
            this.startTimelinePlayback();
            return;
        }

        this.playing = true;
        if (this.currentIndex < 0 || this.currentIndex >= this.cues.length) {
            this.currentIndex = 0;
        }
        this._emitCurrent();
    }

    startTimelinePlayback() {
        this.playing = true;
        this.timelineStart = Date.now();
        this.timelineFrame = requestAnimationFrame(() => this.updateTimelinePlayback());
    }

    updateTimelinePlayback() {
        if (!this.playing) return;
        const elapsed = (Date.now() - this.timelineStart) / 1000;

        const activeIndex = this.cues.findIndex(cue => {
            const start = Number(cue.startTime || 0);
            const duration = Number(cue.duration || cue.fadeIn || 1);
            return elapsed >= start && elapsed < start + duration;
        });

        if (activeIndex === -1 && elapsed > this.getTotalDuration()) {
            this.stop();
            return;
        }

        if (activeIndex !== -1 && activeIndex !== this.currentIndex) {
            this.currentIndex = activeIndex;
            this._emitCurrent();
        }

        if (this.timelineFrame) {
            cancelAnimationFrame(this.timelineFrame);
        }
        this.timelineFrame = requestAnimationFrame(() => this.updateTimelinePlayback());
    }

    pause() {
        this.playing = false;
        if (this.followTimer) {
            clearTimeout(this.followTimer);
            this.followTimer = null;
        }
        if (this.timelineFrame) {
            cancelAnimationFrame(this.timelineFrame);
            this.timelineFrame = null;
        }
    }

    stop() {
        this.playing = false;
        if (this.followTimer) {
            clearTimeout(this.followTimer);
            this.followTimer = null;
        }
        if (this.timelineFrame) {
            cancelAnimationFrame(this.timelineFrame);
            this.timelineFrame = null;
        }
        this.currentIndex = -1;
        this.emit('cueChange', null);
    }

    getTotalDuration() {
        if (this.cues.length === 0) return 0;
        return this.cues.reduce((max, cue) => {
            const start = Number(cue.startTime || 0);
            const dur = Number(cue.duration || cue.fadeIn || 1);
            return Math.max(max, start + dur);
        }, 0);
    }

    setTimelineMode(enabled) {
        this.timelineMode = !!enabled;
    }

    go(index = null) {
        if (index !== null) {
            if (index < 0 || index >= this.cues.length) return;
            this.currentIndex = index;
        } else {
            if (this.currentIndex + 1 >= this.cues.length) return;
            this.currentIndex += 1;
        }
        this._emitCurrent();
    }

    back() {
        if (this.currentIndex <= 0) return;
        this.currentIndex -= 1;
        this._emitCurrent();
    }

    _emitCurrent() {
        if (this.followTimer) {
            clearTimeout(this.followTimer);
            this.followTimer = null;
        }

        const cue = this.getCurrentCue();
        this.emit('cueChange', cue);

        if (this.playing && cue && cue.follow) {
            const followTime = Number(cue.followTime) || 0;
            if (followTime >= 0) {
                this.followTimer = setTimeout(() => {
                    this.emit('follow', cue);
                    this.go();
                }, followTime * 1000);
            }
        }
    }

    setFollow(index, followDuration = 0) {
        const cue = this.cues[index];
        if (!cue) return;
        cue.follow = true;
        cue.followTime = followDuration;
    }
}
