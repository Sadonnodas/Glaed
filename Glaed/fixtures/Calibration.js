class Calibration {
    constructor() {
        this.panOffset   = 0;     // -255 to +255, added to raw pan DMX value
        this.tiltOffset  = 0;
        this.panInvert   = false; // if true, value = 255 - value before offset
        this.tiltInvert  = false;
        this.dimmerFloor = 0;     // minimum DMX value when intensity > 0
    }

    applyPan(raw) {
        let v = this.panInvert ? 255 - raw : raw;
        return Math.max(0, Math.min(255, v + this.panOffset));
    }

    applyTilt(raw) {
        let v = this.tiltInvert ? 255 - raw : raw;
        return Math.max(0, Math.min(255, v + this.tiltOffset));
    }

    applyDimmer(raw) {
        return raw > 0 ? Math.max(this.dimmerFloor, raw) : 0;
    }

    toJSON() {
        return {
            panOffset:   this.panOffset,
            tiltOffset:  this.tiltOffset,
            panInvert:   this.panInvert,
            tiltInvert:  this.tiltInvert,
            dimmerFloor: this.dimmerFloor
        };
    }

    fromJSON(d) {
        Object.assign(this, d);
    }
}
