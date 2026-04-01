class FixtureLibraryPanel {
    constructor(container, patchEngine, app) {
        this.container = container;
        this.patchEngine = patchEngine;
        this.app = app; 
        this.library = {}; 
        this.onFixtureSelected = null; 
        this.sortKey = 'id';
        this.sortAsc = true;

        this.init();
    }

    init() {
        this.container.innerHTML = `
            <style>
                details { margin-bottom: 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
                summary { padding: 10px; font-family: var(--font-mono); font-size: 11px; font-weight: bold; color: var(--accent); cursor: pointer; background: var(--bg-mid); border-bottom: 1px solid var(--border); }
                .details-content { padding: 10px; }
                .ch-row { display: flex; gap: 4px; align-items: center; margin-bottom: 4px; }
                .inv-card { padding:8px; background:var(--bg); border:1px solid var(--border-dim); border-radius:4px; margin-bottom:6px; cursor:pointer; transition: 0.1s; }
                .inv-card:hover { border-color: var(--text-muted); }
                .sort-header { cursor: pointer; user-select: none; }
                .sort-header:hover { color: var(--accent); }
            </style>

            <div class="fixture-header"><h3>Library</h3></div>
            
            <details open>
                <summary>1. Fixtures on Stage</summary>
                <div class="details-content" style="padding:0;">
                    <div style="overflow-x: auto; max-height: 300px;">
                        <table class="patch-table" style="margin:0; border:none;">
                            <thead>
                                <tr>
                                    <th class="sort-header" data-sort="id">ID ↕</th>
                                    <th class="sort-header" data-sort="name">Name ↕</th>
                                    <th class="sort-header" data-sort="address">U:A ↕</th>
                                    <th class="sort-header" data-sort="channels">Ch ↕</th>
                                    <th>X</th>
                                </tr>
                            </thead>
                            <tbody id="patch-table-body"></tbody>
                        </table>
                    </div>
                </div>
            </details>

            <details open>
                <summary>2. Fixture Inventory</summary>
                <div class="details-content">
                    <p style="color:var(--text-muted); font-size:10px; margin-bottom:8px;">Drag cards onto the 3D stage, or click to patch manually.</p>
                    <div id="fixture-inventory" style="display:flex; flex-direction:column; max-height: 300px; overflow-y: auto;"></div>
                </div>
            </details>

            <details>
                <summary>3. Create / Import Fixtures</summary>
                <div class="details-content">
                    <div style="display:flex; gap:6px; margin-bottom: 12px;">
                        <button id="btn-import-file" class="btn" style="flex:1;">Import .json / .gdtf</button>
                        <input type="file" id="import-file-input" accept=".json,.gdtf" style="display:none" />
                    </div>
                    
                    <div style="border-top: 1px solid var(--border); margin: 12px 0;"></div>
                    <h4 style="font-size: 10px; color: var(--text-muted); margin-bottom: 8px;">FIXTURE BUILDER</h4>
                    
                    <select id="manual-type" style="margin-bottom:8px; width:100%;">
                        <option value="Wash">Wash / Par</option>
                        <option value="Spot">Spot / Moving Head</option>
                        <option value="Custom">Custom / Other</option>
                    </select>
                    <input id="manual-name" placeholder="Fixture Name (e.g., LED Wash)" />
                    <input id="manual-manufacturer" placeholder="Manufacturer (e.g., Generic)" />
                    
                    <div id="manual-channels-container" style="margin: 8px 0;"></div>
                    
                    <div style="display:flex; gap:6px; margin-top: 12px;">
                        <button id="btn-add-channel" class="btn" style="flex:1;">+ Add Channel</button>
                        <button id="btn-save-manual" class="btn btn-go" style="flex:1;">Save to Library</button>
                    </div>
                </div>
            </details>
        `;

        this.inventoryEl = this.container.querySelector('#fixture-inventory');
        this.tableBody = this.container.querySelector('#patch-table-body');
        this.channelsContainer = this.container.querySelector('#manual-channels-container');
        
        // Sorting Logic
        this.container.querySelectorAll('.sort-header').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.sort;
                if (this.sortKey === key) {
                    this.sortAsc = !this.sortAsc; // toggle direction
                } else {
                    this.sortKey = key;
                    this.sortAsc = true;
                }
                this.renderTable();
            });
        });

        // 1. File Upload
        const fileInput = this.container.querySelector('#import-file-input');
        this.container.querySelector('#btn-import-file').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const profile = JSON.parse(event.target.result);
                    this.addProfileToLibrary(file.name.split('.')[0], profile);
                } catch (err) { alert("Invalid JSON file."); }
            };
            reader.readAsText(file);
        });

        // 2. Form Builder
        this.container.querySelector('#btn-add-channel').addEventListener('click', () => this.addChannelRow());
        this.addChannelRow(); 

        this.container.querySelector('#btn-save-manual').addEventListener('click', () => {
            const name = this.container.querySelector('#manual-name').value.trim();
            const type = this.container.querySelector('#manual-type').value;
            const manufacturer = this.container.querySelector('#manual-manufacturer').value.trim() || 'Custom';
            if (!name) return alert("Please enter a fixture name.");

            const channelRows = this.channelsContainer.querySelectorAll('.ch-row');
            const channels = [];
            channelRows.forEach((row, index) => {
                channels.push({ 
                    offset: index, 
                    name: row.querySelector('.ch-name').value.trim() || `Channel ${index + 1}`, 
                    type: row.querySelector('.ch-type').value 
                });
            });

            if (channels.length === 0) return alert("Add at least one channel.");
            const profile = { name, type, manufacturer, channels };
            this.addProfileToLibrary(`custom-${Date.now()}`, profile);
            
            this.container.querySelector('#manual-name').value = '';
            this.channelsContainer.innerHTML = '';
            this.addChannelRow();
        });

        this.loadDefaultLibrary();
    }

    addChannelRow() {
        const row = document.createElement('div');
        row.className = 'ch-row';
        const chCount = this.channelsContainer.children.length + 1;
        row.innerHTML = `
            <span style="font-family:var(--font-mono); font-size:10px; color:var(--text-muted); width:24px;">CH${chCount}</span>
            <input class="ch-name" placeholder="Name" style="flex:2; margin:0; padding:4px;" />
            <select class="ch-type" style="flex:2; margin:0; padding:4px;">
                <option value="intensity">Intensity</option>
                <option value="red">Red</option><option value="green">Green</option><option value="blue">Blue</option>
                <option value="white">White</option><option value="amber">Amber</option><option value="uv">UV</option>
                <option value="pan">Pan</option><option value="tilt">Tilt</option>
                <option value="custom">Custom</option>
            </select>
            <button class="btn btn-remove-ch" style="padding:4px 6px; background:var(--bg-mid); color:red;">X</button>
        `;
        row.querySelector('.btn-remove-ch').addEventListener('click', () => {
            row.remove();
            this.channelsContainer.querySelectorAll('.ch-row').forEach((r, i) => r.querySelector('span').textContent = `CH${i + 1}`);
        });
        this.channelsContainer.appendChild(row);
    }

    addProfileToLibrary(key, profileObj) {
        this.library[key] = profileObj;
        this.renderInventory();
    }

    loadDefaultLibrary() {
        this.addProfileToLibrary('default-wash', {
            name: "Generic Front Wash", type: "Wash", manufacturer: "Glaed",
            channels: [
                { offset: 0, name: "Red", type: "red" }, { offset: 1, name: "Green", type: "green" },
                { offset: 2, name: "Blue", type: "blue" }, { offset: 3, name: "White", type: "white" },
                { offset: 4, name: "Amber", type: "amber" }, { offset: 5, name: "UV", type: "uv" },
                { offset: 6, name: "Intensity", type: "intensity" }
            ]
        });

        this.addProfileToLibrary('moving-head-generic', {
            name: "Generic Moving Head", manufacturer: "Generic",
            channels: [
                { offset: 0,  name: "Pan",        type: "pan" },
                { offset: 1,  name: "Pan Fine",    type: "pan_fine" },
                { offset: 2,  name: "Tilt",        type: "tilt" },
                { offset: 3,  name: "Tilt Fine",   type: "tilt_fine" },
                { offset: 4,  name: "Dimmer",      type: "intensity" },
                { offset: 5,  name: "Red",         type: "red" },
                { offset: 6,  name: "Green",       type: "green" },
                { offset: 7,  name: "Blue",        type: "blue" },
                { offset: 8,  name: "Gobo",        type: "gobo" },
                { offset: 9,  name: "Strobe",      type: "strobe" },
                { offset: 10, name: "Speed",       type: "pan_tilt_speed" }
            ],
            modes: [{
                name: "16ch",
                channels: [
                    { offset: 0,  name: "Pan",        type: "pan" },
                    { offset: 1,  name: "Pan Fine",    type: "pan_fine" },
                    { offset: 2,  name: "Tilt",        type: "tilt" },
                    { offset: 3,  name: "Tilt Fine",   type: "tilt_fine" },
                    { offset: 4,  name: "Dimmer",      type: "intensity" },
                    { offset: 5,  name: "Red",         type: "red" },
                    { offset: 6,  name: "Green",       type: "green" },
                    { offset: 7,  name: "Blue",        type: "blue" },
                    { offset: 8,  name: "Gobo",        type: "gobo" },
                    { offset: 9,  name: "Strobe",      type: "strobe" },
                    { offset: 10, name: "Speed",       type: "pan_tilt_speed" }
                ]
            }]
        });

        this.addProfileToLibrary('led-par-generic', {
            name: "Generic LED Par", manufacturer: "Generic",
            channels: [
                { offset: 0, name: "Dimmer", type: "intensity" },
                { offset: 1, name: "Red",    type: "red" },
                { offset: 2, name: "Green",  type: "green" },
                { offset: 3, name: "Blue",   type: "blue" },
                { offset: 4, name: "White",  type: "white" },
                { offset: 5, name: "Amber",  type: "amber" },
                { offset: 6, name: "UV",     type: "uv" }
            ],
            modes: [{
                name: "7ch",
                channels: [
                    { offset: 0, name: "Dimmer", type: "intensity" },
                    { offset: 1, name: "Red",    type: "red" },
                    { offset: 2, name: "Green",  type: "green" },
                    { offset: 3, name: "Blue",   type: "blue" },
                    { offset: 4, name: "White",  type: "white" },
                    { offset: 5, name: "Amber",  type: "amber" },
                    { offset: 6, name: "UV",     type: "uv" }
                ]
            }]
        });
    }

    renderInventory() {
        this.inventoryEl.innerHTML = '';
        Object.entries(this.library).forEach(([key, profile]) => {
            const card = document.createElement('div');
            card.className = 'inv-card';
            card.draggable = true;
            
            card.innerHTML = `
                <div class="inv-card-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; font-size:11px;">${profile.name}</span>
                    <span style="font-size:9px; color:var(--text-muted);">${profile.channels.length}ch</span>
                </div>
                <div class="inv-card-body" style="display:none; margin-top:8px; border-top:1px solid var(--border-dim); padding-top:8px;">
                    <input type="text" class="patch-name" value="${profile.name} 1" style="width:100%; margin-bottom:4px;" />
                    <div style="display:flex; gap:4px; margin-bottom:4px;">
                        <input type="number" class="patch-uni" value="0" title="Universe" style="flex:1;" />
                        <input type="number" class="patch-addr" value="1" title="Address" style="flex:1;" />
                    </div>
                    <button class="btn btn-go btn-manual-patch" style="width:100%;">Add to Stage</button>
                </div>
            `;
            
            const header = card.querySelector('.inv-card-header');
            const body = card.querySelector('.inv-card-body');
            
            header.addEventListener('click', () => {
                const isHidden = body.style.display === 'none';
                this.inventoryEl.querySelectorAll('.inv-card-body').forEach(b => b.style.display = 'none');
                if (isHidden) {
                    body.style.display = 'block';
                    let nextAddr = 1;
                    const existing = this.patchEngine.getFixturesByUniverse(0);
                    if (existing.length > 0) {
                        const last = existing[existing.length - 1];
                        nextAddr = last.address + (last.channels ? last.channels.length : 1);
                    }
                    card.querySelector('.patch-addr').value = nextAddr;
                    card.querySelector('.patch-name').value = `${profile.name} ${existing.length + 1}`;
                }
            });

            card.querySelector('.btn-manual-patch').addEventListener('click', (e) => {
                e.stopPropagation();
                const name = card.querySelector('.patch-name').value;
                const uni = parseInt(card.querySelector('.patch-uni').value, 10);
                const addr = parseInt(card.querySelector('.patch-addr').value, 10);
                this.executePatch(key, name, uni, addr, { x: 0, y: 3, z: 0 }); 
                body.style.display = 'none'; 
            });

            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ category: 'fixture', profileKey: key }));
            });

            this.inventoryEl.appendChild(card);
        });
    }

    autoPatchAtPosition(profileKey, position) {
        const profile = this.library[profileKey];
        if (!profile) return;
        const existing = this.patchEngine.getFixturesByUniverse(0);
        let nextAddr = 1;
        if (existing.length > 0) {
            const last = existing[existing.length - 1];
            nextAddr = last.address + (last.channels ? last.channels.length : 1);
        }
        const name = `${profile.name} ${existing.length + 1}`;
        const dropHeight = Math.max(position.y, 3.0); 
        this.executePatch(profileKey, name, 0, nextAddr, { x: position.x, y: dropHeight, z: position.z });
    }

    executePatch(profileKey, name, universe, address, position) {
        const profile = this.library[profileKey];
        if (!profile) return;
        if (address + profile.channels.length > 512) return alert("Universe is full!");

        try {
            const parsed = ProfileParser.parse(profile);
            let fixture;
            const typeStr = (profile.type || profile.name).toLowerCase();
            if (typeStr.includes('spot') || typeStr.includes('moving head')) {
                fixture = new MovingHead({ name: name, id: `fix-${Date.now()}` });
            } else if (typeStr.includes('wash') || typeStr.includes('par')) {
                fixture = new WashLight({ name: name, id: `fix-${Date.now()}` });
            } else {
                fixture = new _BaseFixture({ name: name, id: `fix-${Date.now()}` });
            }

            ProfileParser.applyToFixture(fixture, parsed);
            this.patchEngine.patchFixture(fixture, universe, address);

            const obj = fixture.createThreeObject();
            obj.position.copy(position);
            obj.rotation.x = Math.PI; 
            
            this.app.stageEngine.add(obj);
            this.app.mirrorSystem.markDirty();
            this.renderTable();
            this.refreshGroupColors();
        } catch (err) { console.error("Patch failed", err); }
    }

    renderTable() {
        this.tableBody.innerHTML = '';
        let fixtures = this.patchEngine.getAllFixtures();
        
        // Sorting Logic
        fixtures.sort((a, b) => {
            let valA, valB;
            if (this.sortKey === 'name') { valA = a.name; valB = b.name; }
            else if (this.sortKey === 'address') { valA = a.address; valB = b.address; }
            else if (this.sortKey === 'channels') { valA = a.channels.length; valB = b.channels.length; }
            else { valA = a.id; valB = b.id; } // Default by ID

            if (valA < valB) return this.sortAsc ? -1 : 1;
            if (valA > valB) return this.sortAsc ? 1 : -1;
            return 0;
        });

        if (fixtures.length === 0) {
            this.tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:10px;">No fixtures patched</td></tr>';
            return;
        }

        const groupManager = this.app && this.app.groupManager;
        fixtures.forEach((f, index) => {
            const typeColor = f instanceof MovingHead ? '#5c1a8c' : f instanceof WashLight ? '#1a5c8c' : '#1a7a3a';
            const typeName  = f instanceof MovingHead ? 'Moving Head' : f instanceof WashLight ? 'Wash Light' : 'Generic';
            const groups    = groupManager ? groupManager.getGroupsForFixture(f.id) : [];
            const groupDots = groups.map(g => {
                const c = '#' + groupManager.getGroupColor(g).toString(16).padStart(6, '0');
                return `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${c};margin-left:3px;flex-shrink:0;" title="${g}"></span>`;
            }).join('');

            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.innerHTML = `
                <td>${index + 1}</td>
                <td style="font-weight:bold; color:var(--text);">
                    <div style="display:flex;align-items:center;">
                        <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${typeColor};margin-right:5px;flex-shrink:0;" title="${typeName}"></span>
                        ${f.name}${groupDots}
                    </div>
                </td>
                <td style="color:var(--accent); font-family:var(--font-mono);">${f.universe}.${f.address}</td>
                <td>${f.channels.length}</td>
                <td><button class="unpatch-btn" style="padding:2px 4px; font-size:9px; background:var(--bg-mid); border:1px solid var(--border); color:red;">X</button></td>
            `;
            
            // Single vs Double click routing
            row.addEventListener('click', (e) => {
                if(e.target.classList.contains('unpatch-btn')) return; 
                if (this.onFixtureSelected) this.onFixtureSelected(f, false); // Select in 3D, don't switch tabs
            });

            row.addEventListener('dblclick', (e) => {
                if(e.target.classList.contains('unpatch-btn')) return; 
                if (this.onFixtureSelected) this.onFixtureSelected(f, true); // True = Switch to Inspector tab
            });

            row.querySelector('.unpatch-btn').addEventListener('click', () => {
                this.patchEngine.unpatchFixture(f);
                if (f.threeObject) {
                    this.app.stageEngine.transformControl.detach();
                    this.app.stageEngine.remove(f.threeObject);
                }
                this.renderTable();
            });
            this.tableBody.appendChild(row);
        });
    }

    refreshGroupColors() {
        const groupManager = this.app && this.app.groupManager;
        if (!groupManager) return;
        this.patchEngine.getAllFixtures().forEach(f => {
            const groups = groupManager.getGroupsForFixture(f.id);
            f.setGroupColor(groups.length > 0 ? groupManager.getGroupColor(groups[0]) : null);
        });
        if (this.app && this.app.mirrorSystem) this.app.mirrorSystem.markDirty();
    }
}