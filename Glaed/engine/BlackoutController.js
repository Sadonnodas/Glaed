class BlackoutController {
    constructor() {
        this.active = false;
    }

    toggle() {
        this.active = !this.active;
        return this.active;
    }

    engage() {
        this.active = true;
    }

    disengage() {
        this.active = false;
    }

    // Called by sendDmx() before transmitting — zeroes the buffer if blackout is active
    applyToBuffer(dmxBuffer) {
        if (!this.active) return dmxBuffer;
        return new Array(dmxBuffer.length).fill(0);
    }
}
