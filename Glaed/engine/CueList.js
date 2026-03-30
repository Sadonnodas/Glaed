class CueList {
    constructor() {
        this.cues = [];
        this.currentIndex = -1;
        this.onCueChange = null;
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
        if (this.onCueChange) {
            this.onCueChange(this.getCurrentCue());
        }
    }

    setFollow(index, followDuration = 0) {
        const cue = this.cues[index];
        if (!cue) return;
        cue.follow = true;
        cue.followTime = followDuration;
    }
}
