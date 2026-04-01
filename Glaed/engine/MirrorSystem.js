class MirrorSystem extends EventEmitter {
    constructor(onTick, frequency = 40) {
        super();
        if (onTick) this.on('tick', onTick);
        this.frequency = frequency;
        this.intervalId = null;
        this.dirty = true;
    }

    start() {
        if (this.intervalId) return;
        const interval = 1000 / this.frequency;
        this.intervalId = setInterval(() => {
            if (!this.dirty) return;
            this.emit('tick');
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
