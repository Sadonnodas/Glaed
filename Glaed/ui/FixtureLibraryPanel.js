class FixtureLibraryPanel {
    constructor(container, patchEngine, app) {
        this.container = container;
        this.patchEngine = patchEngine;
        this.app = app; // reference to App for stageEngine
        this.library = {}; // name -> profile

        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="fixture-header"><h3>Fixture Library</h3></div>
            <div class="fixture-list" id="fixture-list"></div>
            <div class="fixture-manual">
                <h4>Manual Fixture</h4>
                <div class="manual-fields">
                    <label>Name: <input id="manual-name" type="text" placeholder="Fixture Name" /></label>
                    <label>Manufacturer: <input id="manual-manufacturer" type="text" placeholder="Manufacturer" /></label>
                </div>
                <div class="channels-section">
                    <h5>Channels</h5>
                    <div id="channels-list"></div>
                    <button id="add-channel-btn">Add Channel</button>
                </div>
                <button id="import-fixture-btn">Import Fixture</button>
            </div>
            <div class="fixture-patch">
                <input id="fixture-universe" type="number" placeholder="Universe" min="0" max="15" value="0" />
                <input id="fixture-address" type="number" placeholder="Address" min="1" max="512" value="1" />
                <button id="fixture-patch-btn">Patch Selected</button>
            </div>
        `;

        this.listEl = this.container.querySelector('#fixture-list');
        this.universeInput = this.container.querySelector('#fixture-universe');
        this.addressInput = this.container.querySelector('#fixture-address');
        this.patchBtn = this.container.querySelector('#fixture-patch-btn');

        this.patchBtn.addEventListener('click', () => {
            this.patchSelectedFixture();
        });

        this.nameInput = this.container.querySelector('#manual-name');
        this.manufacturerInput = this.container.querySelector('#manual-manufacturer');
        this.channelsList = this.container.querySelector('#channels-list');
        this.addChannelBtn = this.container.querySelector('#add-channel-btn');
        this.importBtn = this.container.querySelector('#import-fixture-btn');

        this.addChannelBtn.addEventListener('click', () => {
            this.addChannelField();
        });

        this.importBtn.addEventListener('click', () => {
            this.importFixture();
        });

        this.loadLibrary();
        this.render();
    }

    loadLibrary() {
        // Hardcoded for now; in future, scan utils/fixtures/
        const fixtures = [
            { name: 'moving-head-generic', path: 'utils/fixtures/moving-head-generic.json', type: 'json' },
            { name: 'led-par-generic', path: 'utils/fixtures/led-par-generic.json', type: 'json' },
            { name: 'generic-moving-head', path: 'utils/fixtures/generic-moving-head.gdtf', type: 'gdtf' }
        ];

        fixtures.forEach(f => {
            fetch(f.path)
                .then(res => res.text())
                .then(content => {
                    let profile;
                    if (f.type === 'json') {
                        profile = JSON.parse(content);
                    } else if (f.type === 'gdtf') {
                        profile = ProfileParser.parseGDTF(content);
                    }
                    this.library[f.name] = profile;
                    this.render();
                })
                .catch(err => console.error('Failed to load fixture', f.name, err));
        });
    }

    render() {
        this.listEl.innerHTML = '';

        Object.entries(this.library).forEach(([key, profile]) => {
            const item = document.createElement('div');
            item.className = 'fixture-item';
            item.innerHTML = `
                <label>
                    <input type="radio" name="fixture-select" value="${key}" />
                    ${profile.name}${profile.manufacturer ? ` (${profile.manufacturer})` : ''}
                </label>
            `;
            this.listEl.appendChild(item);
        });
    }

    patchSelectedFixture() {
        const selected = this.container.querySelector('input[name="fixture-select"]:checked');
        if (!selected) {
            alert('Select a fixture first');
            return;
        }

        const profileKey = selected.value;
        const profile = this.library[profileKey];
        if (!profile) return;

        const universe = parseInt(this.universeInput.value, 10);
        const address = parseInt(this.addressInput.value, 10);

        try {
            const parsed = ProfileParser.parse(profile);
            let fixture;

            if (profile.name.toLowerCase().includes('moving head')) {
                fixture = new MovingHead({ name: parsed.name, id: `${profileKey}-${Date.now()}` });
            } else if (profile.name.toLowerCase().includes('par') || profile.name.toLowerCase().includes('wash')) {
                fixture = new WashLight({ name: parsed.name, id: `${profileKey}-${Date.now()}` });
            } else {
                fixture = new _BaseFixture({ name: parsed.name, id: `${profileKey}-${Date.now()}` });
            }

            ProfileParser.applyToFixture(fixture, parsed);
            this.patchEngine.patchFixture(fixture, universe, address);

            const obj = fixture.createThreeObject();
            obj.position.set(Math.random() * 10 - 5, Math.random() * 5 + 2, 0);
            this.app.stageEngine.add(obj);

            this.app.setTransportStatus(`Patched ${fixture.name} at ${universe}:${address}`);
            this.app.mirrorSystem.markDirty();

        } catch (err) {
            console.error('Patch failed:', err);
            this.app.setTransportStatus('Patch failed');
        }
    }

    addManualFixture() {
        const jsonText = this.manualTextarea.value.trim();
        if (!jsonText) {
            alert('Enter JSON for the fixture');
            return;
        }

        try {
            const profile = JSON.parse(jsonText);
            if (!profile.name) {
                alert('Fixture must have a name');
                return;
            }
            const key = 'manual-' + Date.now();
            this.library[key] = profile;
            this.render();
            this.manualTextarea.value = ''; // Clear after adding
            this.app.setTransportStatus(`Added manual fixture: ${profile.name}`);
        } catch (err) {
            alert('Invalid JSON: ' + err.message);
        }
    }

    addChannelField() {
        const channelDiv = document.createElement('div');
        channelDiv.className = 'channel-item';
        channelDiv.innerHTML = `
            <input type="number" placeholder="Offset" class="channel-offset" min="0" />
            <input type="text" placeholder="Name" class="channel-name" />
            <select class="channel-type">
                <option value="intensity">Intensity</option>
                <option value="red">Red</option>
                <option value="green">Green</option>
                <option value="blue">Blue</option>
                <option value="white">White</option>
                <option value="amber">Amber</option>
                <option value="uv">UV</option>
                <option value="pan">Pan</option>
                <option value="tilt">Tilt</option>
                <option value="gobo">Gobo</option>
                <option value="color">Color</option>
            </select>
            <button class="remove-channel">Remove</button>
        `;
        channelDiv.querySelector('.remove-channel').addEventListener('click', () => {
            channelDiv.remove();
        });
        this.channelsList.appendChild(channelDiv);
    }

    importFixture() {
        const name = this.nameInput.value.trim();
        if (!name) {
            alert('Enter a fixture name');
            return;
        }

        const manufacturer = this.manufacturerInput.value.trim() || 'Custom';
        const channels = [];

        this.channelsList.querySelectorAll('.channel-item').forEach(item => {
            const offset = parseInt(item.querySelector('.channel-offset').value, 10);
            const chName = item.querySelector('.channel-name').value.trim();
            const type = item.querySelector('.channel-type').value;
            if (chName && !isNaN(offset)) {
                channels.push({ offset, name: chName, type });
            }
        });

        if (channels.length === 0) {
            alert('Add at least one channel');
            return;
        }

        const profile = { name, manufacturer, channels };
        const key = 'manual-' + Date.now();
        this.library[key] = profile;
        this.render();

        // Clear the form
        this.nameInput.value = '';
        this.manufacturerInput.value = '';
        this.channelsList.innerHTML = '';
        this.app.setTransportStatus(`Imported manual fixture: ${name}`);
    }
}