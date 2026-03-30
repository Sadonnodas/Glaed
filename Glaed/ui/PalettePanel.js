class PalettePanel {
    constructor(container, paletteManager) {
        this.container = container;
        this.paletteManager = paletteManager;
        this.selectedPaletteId = null;

        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="palette-header">
                <h3>Color Palettes</h3>
            </div>
            <div class="palette-form">
                <input id="palette-name" placeholder="Name" />
                <input id="palette-color" type="color" value="#ffffff" />
                <button id="palette-add">Add</button>
            </div>
            <div id="palette-list" class="palette-list"></div>
        `;

        this.nameInput = this.container.querySelector('#palette-name');
        this.colorInput = this.container.querySelector('#palette-color');
        this.listEl = this.container.querySelector('#palette-list');

        this.container.querySelector('#palette-add').addEventListener('click', () => {
            const name = this.nameInput.value.trim();
            const color = this.colorInput.value;
            if (!name) return;
            const id = `color-${Date.now()}`;
            const rgb = this.hexToRgb(color);
            this.paletteManager.addColorPalette(id, name, rgb);
            this.nameInput.value = '';
            this.render();
        });

        this.render();
    }

    render() {
        const palettes = this.paletteManager.getAllColorPalettes();
        this.listEl.innerHTML = '';

        if (!palettes.length) {
            this.listEl.innerHTML = '<i>No palettes yet</i>';
            return;
        }

        palettes.forEach((palette) => {
            const row = document.createElement('div');
            row.className = 'palette-item';
            row.innerHTML = `
                <span style="background:${this.rgbToCss(palette.color)}" class="palette-swatch"></span>
                <span class="palette-name">${palette.name}</span>
                <button class="palette-use">Use</button>
            `;

            const useBtn = row.querySelector('.palette-use');
            useBtn.addEventListener('click', () => {
                this.selectedPaletteId = palette.id;
                this.onPaletteSelected && this.onPaletteSelected(palette);
               this.render();
            });

            if (this.selectedPaletteId === palette.id) {
                row.classList.add('active');
            }

            this.listEl.appendChild(row);
        });
    }

    hexToRgb(hex) {
        const trimmed = hex.replace('#', '');
        const bigint = parseInt(trimmed, 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
        };
    }

    rgbToCss(rgb) {
        return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    }

    getSelectedPalette() {
        return this.paletteManager.getColorPalette(this.selectedPaletteId);
    }
}
