const MathUtils = {
    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    },

    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    smoothStep(t) {
        const v = MathUtils.clamp(t, 0, 1);
        return v * v * (3 - 2 * v);
    },

    easeInOutQuad(t) {
        const v = MathUtils.clamp(t, 0, 1);
        return v < 0.5 ? 2 * v * v : -1 + (4 - 2 * v) * v;
    }
};
