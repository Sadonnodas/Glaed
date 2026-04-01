class FadeEngine {
    constructor() {
        this.currentState = new Map(); // fixtureId -> state object (intensity, color, etc.)
        this.startState = new Map();
        this.targetState = new Map();
        this.duration = 0;
        this.elapsed = 0;
        this.delay = 0;
        this.active = false;
        this.onUpdate = null; // callback fixtureId => state
        this.paletteManager = null; // set externally after construction
    }

    static _lerp(a, b, t) {
        return a + (b - a) * t;
    }

    static _lerpColor(a, b, t) {
        return {
            r: Math.round(FadeEngine._lerp(a.r || 0, b.r || 0, t)),
            g: Math.round(FadeEngine._lerp(a.g || 0, b.g || 0, t)),
            b: Math.round(FadeEngine._lerp(a.b || 0, b.b || 0, t)),
            w: Math.round(FadeEngine._lerp(a.w || 0, b.w || 0, t)),
            a: Math.round(FadeEngine._lerp(a.a || 0, b.a || 0, t)),
            uv: Math.round(FadeEngine._lerp(a.uv || 0, b.uv || 0, t))
        };
    }

    startCue(cue, patchEngine) {
        if (!cue || !cue.data) return;

        this.duration = Math.max(0, Number(cue.fadeIn) || 0);
        this.delay = Math.max(0, Number(cue.delay) || 0);
        this.elapsed = 0;
        this.active = true;

        // prepare states for each fixture in cue
        for (const fixtureId in cue.data) {
            // Work on a shallow copy so original cue data is never mutated
            const rawEntry = cue.data[fixtureId];
            const entry = { ...rawEntry };

            // Resolve colorPalette reference before processing
            if (entry.colorPalette && this.paletteManager) {
                const palette = this.paletteManager.getColorPalette(entry.colorPalette);
                if (palette && palette.color) {
                    entry.color = { ...palette.color };
                    delete entry.colorPalette;
                }
            }

            const fixture = patchEngine.fixtures.find(f => f.id === fixtureId);
            const current = this.currentState.get(fixtureId);
            const base = current || (fixture ? {
                intensity: fixture.intensity || 0,
                color: { ...fixture.color }
            } : { intensity: 0, color: { r: 0, g: 0, b: 0, w: 0, a: 0, uv: 0 } });

            this.startState.set(fixtureId, JSON.parse(JSON.stringify(base)));

            const desired = {
                intensity: entry.intensity !== undefined ? entry.intensity : base.intensity,
                color: entry.color ? { ...base.color, ...entry.color } : { ...base.color }
            };

            // also allow direct rgb params in entry
            ['red', 'green', 'blue', 'white', 'amber', 'uv'].forEach(ch => {
                if (entry[ch] !== undefined) {
                    desired.color = desired.color || { ...base.color };
                    const mapped = ch === 'red' ? 'r' : ch === 'green' ? 'g' : ch === 'blue' ? 'b' : ch === 'white' ? 'w' : ch === 'amber' ? 'a' : 'uv';
                    desired.color[mapped] = entry[ch];
                }
            });

            this.targetState.set(fixtureId, desired);

            // ensure currentState has a fallback for immediate 'snap' when duration==0
            if (!this.currentState.has(fixtureId)) {
                this.currentState.set(fixtureId, { ...base, color: { ...base.color } });
            }
        }

        if (this.duration === 0 && this.delay === 0) {
            // immediate apply
            this._applyProgress(1);
            this.active = false;
        }
    }

    _applyProgress(t) {
        this.targetState.forEach((target, fixtureId) => {
            const start = this.startState.get(fixtureId);
            if (!start) return;

            const intensity = Math.round(FadeEngine._lerp(start.intensity || 0, target.intensity || 0, t));
            const color = FadeEngine._lerpColor(start.color || {}, target.color || {}, t);

            const state = { intensity, color };
            this.currentState.set(fixtureId, state);

            if (this.onUpdate) {
                this.onUpdate(fixtureId, state);
            }
        });
    }

    update(deltaSeconds) {
        if (!this.active) return;

        this.elapsed += deltaSeconds;

        if (this.elapsed < this.delay) {
            return;
        }

        const fadeElapsed = this.elapsed - this.delay;
        const progress = this.duration <= 0 ? 1 : Math.min(1, fadeElapsed / this.duration);

        this._applyProgress(progress);

        if (progress >= 1) {
            this.active = false;
        }
    }

    getFixtureState(fixtureId) {
        return this.currentState.get(fixtureId) || null;
    }

    getAllStates() {
        const output = {};
        this.currentState.forEach((v, k) => output[k] = v);
        return output;
    }

    clear() {
        this.currentState.clear();
        this.startState.clear();
        this.targetState.clear();
        this.active = false;
        this.elapsed = 0;
        this.duration = 0;
        this.delay = 0;
    }
}
