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
            row.style.cssText = 'display:flex; align-items:center; gap:6px; padding:4px 0; border-bottom:1px solid var(--border-dim);';

            const swatch = document.createElement('span');
            swatch.style.cssText = `display:inline-block; width:14px; height:14px; border-radius:3px; background:${this.rgbToCss(palette.color)}; flex-shrink:0; border:1px solid var(--border);`;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = palette.name;
            nameSpan.style.cssText = 'flex:1; font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';

            const useBtn = document.createElement('button');
            useBtn.textContent = 'Use';
            useBtn.style.cssText = 'font-size:9px; padding:2px 6px; flex-shrink:0;';
            useBtn.addEventListener('click', () => {
                this.selectedPaletteId = palette.id;
                this.onPaletteSelected && this.onPaletteSelected(palette);
                this.render();
            });

            const delBtn = document.createElement('button');
            delBtn.textContent = '✕';
            delBtn.style.cssText = 'font-size:9px; padding:2px 5px; flex-shrink:0; background:none; border:1px solid transparent; color:var(--text-dim);';
            delBtn.addEventListener('mouseenter', () => { delBtn.style.color = '#f44'; delBtn.style.borderColor = '#f44'; });
            delBtn.addEventListener('mouseleave', () => { delBtn.style.color = 'var(--text-dim)'; delBtn.style.borderColor = 'transparent'; });
            delBtn.addEventListener('click', () => {
                this.paletteManager.removeColorPalette(palette.id);
                if (this.selectedPaletteId === palette.id) this.selectedPaletteId = null;
                this.render();
            });

            if (this.selectedPaletteId === palette.id) {
                row.style.background = 'color-mix(in srgb, var(--accent) 8%, transparent)';
                useBtn.style.color = 'var(--accent)';
                useBtn.style.borderColor = 'var(--accent)';
            }

            row.appendChild(swatch);
            row.appendChild(nameSpan);
            row.appendChild(useBtn);
            row.appendChild(delBtn);
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
