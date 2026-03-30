const ColorUtils = {
    clamp(value, min = 0, max = 255) {
        return Math.max(min, Math.min(max, value));
    },

    rgbToHex(r, g, b) {
        return (r << 16) + (g << 8) + b;
    },

    hsiToRgb(h, s, i) {
        // h in degrees [0,360], s and i in [0,1]
        h = h % 360;
        const rad = Math.PI / 180;
        const H = h * rad;
        s = MathUtils.clamp(s, 0, 1);
        i = MathUtils.clamp(i, 0, 1);

        let r = 0, g = 0, b = 0;

        if (H < 2 * Math.PI / 3) {
            r = i * (1 + s * Math.cos(H) / Math.cos(Math.PI / 3 - H));
            g = i * (1 + s * (1 - Math.cos(H) / Math.cos(Math.PI / 3 - H)));
            b = i * (1 - s);
        } else if (H < 4 * Math.PI / 3) {
            H -= 2 * Math.PI / 3;
            g = i * (1 + s * Math.cos(H) / Math.cos(Math.PI / 3 - H));
            b = i * (1 + s * (1 - Math.cos(H) / Math.cos(Math.PI / 3 - H)));
            r = i * (1 - s);
        } else {
            H -= 4 * Math.PI / 3;
            b = i * (1 + s * Math.cos(H) / Math.cos(Math.PI / 3 - H));
            r = i * (1 + s * (1 - Math.cos(H) / Math.cos(Math.PI / 3 - H)));
            g = i * (1 - s);
        }

        return {
            r: ColorUtils.clamp(Math.round(r * 255), 0, 255),
            g: ColorUtils.clamp(Math.round(g * 255), 0, 255),
            b: ColorUtils.clamp(Math.round(b * 255), 0, 255)
        };
    }
};
