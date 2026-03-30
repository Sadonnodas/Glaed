class PaletteManager {
    constructor() {
        this.palettes = {
            color: {},
            position: {},
            beam: {}
        };
    }

    addColorPalette(id, name, color) {
        if (!id || !name || !color) {
            throw new Error('Palette id, name, and color required');
        }
        this.palettes.color[id] = { id, name, color };
    }

    removeColorPalette(id) {
        delete this.palettes.color[id];
    }

    getColorPalette(id) {
        return this.palettes.color[id] || null;
    }

    getAllColorPalettes() {
        return Object.values(this.palettes.color);
    }

    addPositionPalette(id, name, panTilt) {
        this.palettes.position[id] = { id, name, panTilt };
    }

    getPositionPalette(id) {
        return this.palettes.position[id] || null;
    }

    addBeamPalette(id, name, settings) {
        this.palettes.beam[id] = { id, name, settings };
    }

    getBeamPalette(id) {
        return this.palettes.beam[id] || null;
    }
}
