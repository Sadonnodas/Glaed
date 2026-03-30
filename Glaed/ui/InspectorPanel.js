
class InspectorPanel {
    constructor(container, programmer) {
        this.container = container;
        this.programmer = programmer;
        this.selectedFixture = null;

        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="inspector-header">
                <h3>Inspector</h3>
                <span id="inspector-fixture-name">No fixture selected</span>
            </div>
            <div class="inspector-content"></div>
        `;
        this.content = this.container.querySelector('.inspector-content');
        this.fixtureNameEl = this.container.querySelector('#inspector-fixture-name');
    }

    /**
     * Selects a fixture to display in the inspector.
     * @param {object} fixture - The fixture instance to inspect.
     */
    selectFixture(fixture) {
        this.selectedFixture = fixture;
        this.fixtureNameEl.textContent = fixture ? fixture.name : 'No fixture selected';
        this.render();
    }

    render() {
        this.content.innerHTML = '';
        if (!this.selectedFixture) {
            this.content.innerHTML = '<p>Select a fixture to see its properties.</p>';
            return;
        }

        // Get the current merged state from the programmer
        const currentState = this.programmer.getMergedState(this.selectedFixture.id, this.selectedFixture);

        // Create sliders for the fixture's main parameters
        const paramsToInspect = ['intensity', 'red', 'green', 'blue', 'white', 'amber', 'uv'];
        
        for (const param of paramsToInspect) {
            if (this.selectedFixture[param] !== undefined || (this.selectedFixture.color && this.selectedFixture.color[param] !== undefined)) {
                
                const isColor = ['red', 'green', 'blue', 'white', 'amber', 'uv'].includes(param);
                const value = isColor ? currentState.color[param] : currentState[param];

                const sliderContainer = document.createElement('div');
                sliderContainer.className = 'inspector-slider';
                sliderContainer.innerHTML = `
                    <label>${param}</label>
                    <input type="range" min="0" max="255" value="${value}" data-param="${param}" />
                    <span>${value}</span>
                `;
                this.content.appendChild(sliderContainer);
            }
        }
        
        this.addEventListeners();
    }

    addEventListeners() {
        const sliders = this.content.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const param = e.target.dataset.param;
                const value = parseInt(e.target.value, 10);

                // Update the UI immediately
                e.target.nextElementSibling.textContent = value;
                
                const isColor = ['red', 'green', 'blue', 'white', 'amber', 'uv'].includes(param);

                // Update the programmer
                if (isColor) {
                    const newColor = { ...this.selectedFixture.color, [param]: value };
                    this.programmer.setValue(this.selectedFixture, 'color', newColor);
                    // Also update the fixture's base state for now for visual feedback
                    this.selectedFixture.color[param] = value;
                } else {
                    this.programmer.setValue(this.selectedFixture, param, value);
                    // Also update the fixture's base state for now for visual feedback
                    this.selectedFixture.setParameter(param, value);
                }
            });
        });
    }
}
