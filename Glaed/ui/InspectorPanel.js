class InspectorPanel {
    constructor(container, programmer) {
        this.container = container;
        this.programmer = programmer;
        this.selectedFixtures = []; // Now holds an array!

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

    // Accepts either a single fixture object or an array of them
    selectFixture(fixtureOrArray) {
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

    render() {
        this.content.innerHTML = '';
        if (this.selectedFixtures.length === 0) {
            this.content.innerHTML = '<p>Select a fixture or group to see its properties.</p>';
            return;
        }

        // We use the first selected fixture to determine which sliders to show
        const leadFixture = this.selectedFixtures[0];
        const currentState = this.programmer.getMergedState(leadFixture.id, leadFixture);

        const paramsToInspect = ['intensity', 'red', 'green', 'blue', 'white', 'amber', 'uv'];
        
        for (const param of paramsToInspect) {
            if (leadFixture[param] !== undefined || (leadFixture.color && leadFixture.color[param] !== undefined)) {
                
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
                e.target.nextElementSibling.textContent = value;
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