class InspectorPanel {
    constructor(container, programmer) {
        this.container = container;
        this.programmer = programmer;
        this.selectedFixtures = [];
        this._highlightActive = false;
        this._highlightedIds = [];

        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="inspector-header">
                <h3>Inspector</h3>
                <span id="inspector-fixture-name">No fixture selected</span>
            </div>
            <div id="inspector-highlight-row" style="display:none; margin-bottom:10px;">
                <button id="btn-highlight" class="btn" style="width:100%;">⊙ Highlight</button>
            </div>
            <div class="inspector-content"></div>
            <div id="inspector-calibration" style="display:none; margin-top:12px;"></div>
        `;
        this.content = this.container.querySelector('.inspector-content');
        this.fixtureNameEl = this.container.querySelector('#inspector-fixture-name');
        this.highlightRow = this.container.querySelector('#inspector-highlight-row');
        this.highlightBtn = this.container.querySelector('#btn-highlight');
        this.calibrationEl = this.container.querySelector('#inspector-calibration');

        this.highlightBtn.addEventListener('click', () => this.toggleHighlight());
    }

    // Accepts either a single fixture or an array
    selectFixture(fixtureOrArray) {
        // Clear previous highlight if selection changes
        if (this._highlightActive) {
            this._clearHighlight();
        }

        if (!fixtureOrArray) {
            this.selectedFixtures = [];
        } else if (Array.isArray(fixtureOrArray)) {
            this.selectedFixtures = fixtureOrArray;
        } else {
            this.selectedFixtures = [fixtureOrArray];
        }

        if (this.selectedFixtures.length === 0) {
            this.fixtureNameEl.textContent = 'No fixture selected';
        } else if (this.selectedFixtures.length === 1) {
            this.fixtureNameEl.textContent = this.selectedFixtures[0].name;
        } else {
            this.fixtureNameEl.textContent = `Multiple Fixtures (${this.selectedFixtures.length})`;
        }

        this.render();
    }

    toggleHighlight() {
        if (this._highlightActive) {
            this._clearHighlight();
        } else {
            this._applyHighlight();
        }
    }

    _applyHighlight() {
        if (this.selectedFixtures.length === 0) return;
        this._highlightActive = true;
        this._highlightedIds = this.selectedFixtures.map(f => f.id);

        this.selectedFixtures.forEach(fixture => {
            this.programmer.setValue(fixture, 'intensity', 255);
            this.programmer.setValue(fixture, 'color', { r: 255, g: 255, b: 255, w: 255, a: 0, uv: 0 });
        });

        this.highlightBtn.style.background = 'color-mix(in srgb, var(--accent) 30%, transparent)';
        this.highlightBtn.style.color = 'var(--accent)';
        this.highlightBtn.style.borderColor = 'var(--accent)';
        this.highlightBtn.textContent = '⊙ Highlight (ON)';
    }

    _clearHighlight() {
        this._highlightActive = false;

        // Clear programmer values for previously highlighted fixtures
        this._highlightedIds.forEach(id => {
            this.programmer.clearFixture(id);
        });
        this._highlightedIds = [];

        this.highlightBtn.style.background = '';
        this.highlightBtn.style.color = '';
        this.highlightBtn.style.borderColor = '';
        this.highlightBtn.textContent = '⊙ Highlight';
    }

    render() {
        this.content.innerHTML = '';
        this.calibrationEl.innerHTML = '';
        this.calibrationEl.style.display = 'none';

        if (this.selectedFixtures.length === 0) {
            this.highlightRow.style.display = 'none';
            this.content.innerHTML = '<p style="color:var(--text-dim); font-size:11px; padding:8px 0;">Select a fixture to see its properties.</p>';
            return;
        }

        this.highlightRow.style.display = 'block';

        const leadFixture = this.selectedFixtures[0];
        const currentState = this.programmer.getMergedState(leadFixture.id, leadFixture);

        const paramsToInspect = ['intensity', 'red', 'green', 'blue', 'white', 'amber', 'uv'];

        for (const param of paramsToInspect) {
            if (leadFixture[param] !== undefined || (leadFixture.color && leadFixture.color[param] !== undefined)) {
                const isColor = ['red', 'green', 'blue', 'white', 'amber', 'uv'].includes(param);
                const value = isColor ? (currentState.color ? (currentState.color[param] || 0) : 0) : (currentState[param] || 0);

                const sliderContainer = document.createElement('div');
                sliderContainer.className = 'slider-field';
                sliderContainer.innerHTML = `
                    <div class="slider-header">
                        <span class="slider-label">${param}</span>
                        <span class="slider-value" data-display="${param}">${value}</span>
                    </div>
                    <input type="range" min="0" max="255" value="${value}" data-param="${param}" style="width:100%; margin:0;" />
                `;
                this.content.appendChild(sliderContainer);
            }
        }

        this.addEventListeners();

        // Show calibration controls for MovingHead fixtures
        if (leadFixture instanceof MovingHead) {
            this._renderCalibration(leadFixture);
        }
    }

    _renderCalibration(fixture) {
        const cal = fixture.calibration;
        this.calibrationEl.style.display = 'block';
        this.calibrationEl.innerHTML = `
            <div style="font-family:var(--font-mono); font-size:9px; color:var(--text-dim); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; border-top:1px solid var(--border-dim); padding-top:10px;">Calibration</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px;">
                <label style="font-size:10px; color:var(--text-muted);">Pan Offset
                    <input type="number" id="cal-pan-offset" min="-255" max="255" value="${cal.panOffset}" style="width:100%; margin-top:2px;" />
                </label>
                <label style="font-size:10px; color:var(--text-muted);">Tilt Offset
                    <input type="number" id="cal-tilt-offset" min="-255" max="255" value="${cal.tiltOffset}" style="width:100%; margin-top:2px;" />
                </label>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px;">
                <label style="font-size:10px; color:var(--text-muted); display:flex; align-items:center; gap:4px;">
                    <input type="checkbox" id="cal-pan-invert" ${cal.panInvert ? 'checked' : ''} style="width:auto; margin:0;" /> Pan Invert
                </label>
                <label style="font-size:10px; color:var(--text-muted); display:flex; align-items:center; gap:4px;">
                    <input type="checkbox" id="cal-tilt-invert" ${cal.tiltInvert ? 'checked' : ''} style="width:auto; margin:0;" /> Tilt Invert
                </label>
            </div>
            <label style="font-size:10px; color:var(--text-muted);">Dimmer Floor
                <input type="number" id="cal-dimmer-floor" min="0" max="255" value="${cal.dimmerFloor}" style="width:100%; margin-top:2px;" />
            </label>
        `;

        const bind = (id, prop, isCheck = false) => {
            const el = this.calibrationEl.querySelector(`#${id}`);
            if (!el) return;
            el.addEventListener('change', () => {
                this.selectedFixtures.forEach(f => {
                    if (f.calibration) {
                        f.calibration[prop] = isCheck ? el.checked : Number(el.value);
                    }
                });
            });
        };

        bind('cal-pan-offset',   'panOffset');
        bind('cal-tilt-offset',  'tiltOffset');
        bind('cal-pan-invert',   'panInvert',  true);
        bind('cal-tilt-invert',  'tiltInvert', true);
        bind('cal-dimmer-floor', 'dimmerFloor');
    }

    addEventListeners() {
        const sliders = this.content.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const param = e.target.dataset.param;
                const value = parseInt(e.target.value, 10);
                const displayEl = this.content.querySelector(`[data-display="${param}"]`);
                if (displayEl) displayEl.textContent = value;

                const isColor = ['red', 'green', 'blue', 'white', 'amber', 'uv'].includes(param);

                // Apply the change to EVERY selected fixture
                this.selectedFixtures.forEach(fixture => {
                    if (isColor) {
                        const newColor = { ...fixture.color, [param]: value };
                        this.programmer.setValue(fixture, 'color', newColor);
                        fixture.color[param] = value;
                    } else {
                        this.programmer.setValue(fixture, param, value);
                        fixture.setParameter(param, value);
                    }
                });
            });
        });
    }
}
