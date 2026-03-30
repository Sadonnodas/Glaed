class MirrorSystem {
    constructor(onTick, frequency = 40) {
        this.onTick = onTick;
        this.frequency = frequency;
        this.intervalId = null;
        this.dirty = true;
    }

    start() {
        if (this.intervalId) return;
        const interval = 1000 / this.frequency;
        this.intervalId = setInterval(() => {
            if (!this.dirty) return;
            if (this.onTick) this.onTick();
            this.dirty = false;
        }, interval);
    }

    stop() {
        if (!this.intervalId) return;
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    markDirty() {
        this.dirty = true;
    }

    isDirty() {
        return this.dirty;
    }
}
