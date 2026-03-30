class TimecodeReceiver {
    constructor() {
        this.running = false;
        this.framerate = 30; // default fps
        this.currentFrame = 0;
        this.onTimecode = null;
        this.onLock = null;
        this.locked = false;
    }

    connect() {
        this.running = true;
        this.locked = true;
        if (this.onLock) this.onLock(true);

        this._tickId = setInterval(() => {
            if (!this.running) return;

            this.currentFrame += 1;
            const totalSeconds = this.currentFrame / this.framerate;
            const hours = Math.floor(totalSeconds / 3600) % 24;
            const minutes = Math.floor(totalSeconds / 60) % 60;
            const seconds = Math.floor(totalSeconds) % 60;
            const frames = this.currentFrame % this.framerate;

            const tc = {
                hours,
                minutes,
                seconds,
                frames,
                fps: this.framerate,
                totalSeconds
            };

            if (this.onTimecode) this.onTimecode(tc);
        }, 1000 / this.framerate);

        return Promise.resolve();
    }

    disconnect() {
        this.running = false;
        this.locked = false;
        if (this.onLock) this.onLock(false);

        if (this._tickId) {
            clearInterval(this._tickId);
            this._tickId = null;
        }
    }

    setFrameRate(fps) {
        this.framerate = fps;
        if (this.running) {
            this.disconnect();
            this.connect();
        }
    }
}
