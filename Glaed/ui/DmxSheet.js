
class DmxSheet {
    constructor(container, artnetClient) {
        this.container = container;
        this.artnetClient = artnetClient;
        this.universe = 0; // Default to universe 0
        this.data = new Array(512).fill(0);

        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="dmx-sheet-header">
                <h2>DMX Universe ${this.universe}</h2>
                <button id="dmx-refresh-btn">Refresh</button>
            </div>
            <div class="dmx-grid"></div>
        `;

        this.grid = this.container.querySelector('.dmx-grid');
        this.renderGrid();

        this.container.querySelector('#dmx-refresh-btn').addEventListener('click', () => {
            // In a real app, this would request the latest DMX data from the engine
            // For now, it just re-renders the current state.
            this.updateData(this.data);
        });
    }

    renderGrid() {
        this.grid.innerHTML = '';
        for (let i = 0; i < 512; i++) {
            const cell = document.createElement('div');
            cell.className = 'dmx-cell';
            cell.dataset.channel = i + 1;
            cell.innerHTML = `
                <div class="dmx-channel-number">${i + 1}</div>
                <div class="dmx-channel-value">0</div>
            `;
            this.grid.appendChild(cell);
        }
    }

    updateData(data) {
        if (data.length !== 512) {
            console.error('DMX data must be 512 channels.');
            return;
        }
        this.data = data;
        const cells = this.grid.children;
        for (let i = 0; i < 512; i++) {
            const valueEl = cells[i].querySelector('.dmx-channel-value');
            if (valueEl.textContent != data[i]) {
               valueEl.textContent = data[i];
               cells[i].style.backgroundColor = data[i] > 0 ? `rgba(255, 180, 0, ${data[i] / 255})` : '#222';
            }
        }
    }

    setUniverse(universe) {
        this.universe = universe;
        this.container.querySelector('h2').textContent = `DMX Universe ${this.universe}`;
        // Clear the grid when switching universes
        this.updateData(new Array(512).fill(0));
    }
}
