class PropsPanel {
    constructor(container) {
        this.container = container;
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="fixture-header"><h3>Stage Props</h3></div>
            <p style="color:var(--text-muted); font-size:10px; margin-bottom:12px;">Drag items onto the stage.</p>
            <div class="props-list" style="display:flex; flex-direction:column; gap:8px;">
                <div class="prop-item" draggable="true" data-type="human" style="padding:8px; background:var(--bg-card); border:1px solid var(--border); border-radius:4px; cursor:grab;">
                    🧍 Singer / Musician (1.6m)
                </div>
                <div class="prop-item" draggable="true" data-type="riser" style="padding:8px; background:var(--bg-card); border:1px solid var(--border); border-radius:4px; cursor:grab;">
                    🔲 Drum Riser (2x2m)
                </div>
                <div class="prop-item" draggable="true" data-type="curtain" style="padding:8px; background:var(--bg-card); border:1px solid var(--border); border-radius:4px; cursor:grab;">
                    🎭 Backdrop Curtain
                </div>
                <div class="prop-item" draggable="true" data-type="box" style="padding:8px; background:var(--bg-card); border:1px solid var(--border); border-radius:4px; cursor:grab;">
                    📦 Generic Box (0.5m)
                </div>
            </div>
        `;

        this.container.querySelectorAll('.prop-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                    category: 'prop',
                    type: item.dataset.type
                }));
            });
        });
    }
}