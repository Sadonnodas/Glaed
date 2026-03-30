class CueList {
    constructor() {
        this.cues = [];
        this.currentIndex = -1;
        this.onCueChange = null;
        this.onFollow = null; // callback for auto-follow
        this.followTimer = null;
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
        if (this.onCueChange) {
            this.onCueChange(cue);
        }

        if (cue && cue.follow) {
            const followTime = Number(cue.followTime) || 0;
            if (followTime >= 0) {
                this.followTimer = setTimeout(() => {
                    if (this.onFollow) {
                        this.onFollow(cue);
                    }
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
