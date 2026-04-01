const AUTOSAVE_KEY = 'glaed-autosave';

class App {
    constructor() {
        this.panels = {};
        this._showStartupSplash();
        this.init();
    }

    _showStartupSplash() {
        const saved = localStorage.getItem(AUTOSAVE_KEY);
        if (!saved) return;

        try {
            const data = JSON.parse(saved);
            const splash = document.getElementById('startup-splash');
            if (!splash) return;

            const meta = document.getElementById('splash-meta');
            if (meta) {
                const fixtureCount = (data.fixtures || []).length;
                const cueCount     = (data.cues    || []).length;
                const savedAt      = data._savedAt ? new Date(data._savedAt).toLocaleString() : 'Unknown';
                meta.textContent   = `"${data.showName || 'Untitled Show'}"  ·  ${fixtureCount} fixtures  ·  ${cueCount} cues  ·  Saved: ${savedAt}`;
            }

            splash.classList.add('visible');
            this._pendingAutosave = data;

            document.getElementById('splash-resume').addEventListener('click', () => {
                splash.classList.remove('visible');
                this._loadAutosave();
            });

            document.getElementById('splash-new').addEventListener('click', () => {
                this._pendingAutosave = null;
                splash.classList.remove('visible');
            });

            const fileInput = document.getElementById('splash-file-input');
            document.getElementById('splash-load').addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const data = JSON.parse(ev.target.result);
                        this._pendingAutosave = null;
                        splash.classList.remove('visible');
                        // Load after a tick so app is fully initialised
                        setTimeout(() => this.showManager && this.showManager.loadShowData(data), 100);
                    } catch (err) { alert('Invalid show file.'); }
                };
                reader.readAsText(file);
            });
        } catch (e) {
            // Corrupt autosave — ignore
        }
    }

    _loadAutosave() {
        const data = this._pendingAutosave;
        this._pendingAutosave = null;
        if (data && this.showManager) {
            this.showManager.loadShowData(data);
        }
    }

    _autoSave() {
        try {
            const data = this.showManager.collectShowData();
            data._savedAt = new Date().toISOString();
            localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Autosave failed', e);
        }
    }

    init() {
        console.log('Initializing Glaed...');

        this.patchEngine = new PatchEngine();
        this.programmer = new Programmer();
        this.fadeEngine = new FadeEngine();
        this.cueList = new CueList();
        this.groupManager = new GroupManager();
        this.paletteManager = new PaletteManager();
        this.timecodeReceiver = new TimecodeReceiver();
        this.blackout = new BlackoutController();

        // Wire paletteManager into fadeEngine for colorPalette resolution
        this.fadeEngine.paletteManager = this.paletteManager;

        this.mirrorSystem = new MirrorSystem(() => {
            this.fadeEngine.update(1 / 40);
            if (this.fadeEngine.active) this.mirrorSystem.markDirty();
            this.sendDmx();
        });

        this.artnetClient = new ArtnetClient();
        this.artnetClient.connect().then(() => this.mirrorSystem.start()).catch(e => console.log(e));

        this.midiBridge = new MidiBridge((tc) => {
            if (this.transportBar) this.transportBar.setTimecode(`MTC: ${String(tc.hours).padStart(2,'0')}:${String(tc.minutes).padStart(2,'0')}:${String(tc.seconds).padStart(2,'0')}:${String(tc.frames).padStart(2,'0')}`);
            if (this.transportBar && this.transportBar.mode === 'playback') {
                const idx = Math.floor(tc.totalSeconds / 4) % this.cueList.cues.length;
                if (idx !== this.cueList.currentIndex) this.cueList.go(idx);
            }
        });

        this.stageEngine = new StageEngine(document.getElementById('stage-viewport'));

        this.panels = {
            dmxSheet: new DmxSheet(document.getElementById('dmx-sheet')),
            inspector: new InspectorPanel(document.getElementById('inspector-panel'), this.programmer),
            cueList: new CueListPanel(document.getElementById('cue-list-panel'), this.cueList),
            palette: new PalettePanel(document.getElementById('palette-panel'), this.paletteManager),
            group: new GroupPanel(document.getElementById('group-panel'), this.patchEngine, this.groupManager, this),
            timeline: new TimelinePanel(document.getElementById('timeline-panel'), this.cueList),
            kindle: new KindleAssistant(document.getElementById('kindle-assistant'), this.cueList, this.paletteManager, this.patchEngine),
            props: new PropsPanel(document.getElementById('props-panel')),
            library: new FixtureLibraryPanel(document.getElementById('fixture-library-panel'), this.patchEngine, this)
        };

        this.showManager = new ShowManager({
            patchEngine: this.patchEngine, stageEngine: this.stageEngine, cueList: this.cueList,
            paletteManager: this.paletteManager, groupManager: this.groupManager,
            programmer: this.programmer, fadeEngine: this.fadeEngine, mirrorSystem: this.mirrorSystem,
            getPanels: () => this.panels
        });

        this.transportBar = new TransportBar({
            cueList: this.cueList, programmer: this.programmer, fadeEngine: this.fadeEngine,
            mirrorSystem: this.mirrorSystem, timecodeReceiver: this.timecodeReceiver, midiBridge: this.midiBridge,
            patchEngine: this.patchEngine, showManager: this.showManager, getPanels: () => this.panels
        });

        this.timecodeReceiver.onTimecode = (tc) => {
            if (this.transportBar) this.transportBar.setTimecode(`TC: ${String(tc.hours).padStart(2,'0')}:${String(tc.minutes).padStart(2,'0')}:${String(tc.seconds).padStart(2,'0')}:${String(tc.frames).padStart(2,'0')}`);
        };

        // Single click from 3D view
        this.stageEngine.onFixtureSelected = (fixture) => {
            this.panels.inspector.selectFixture(fixture);
        };

        // Click/Double-click from the Spreadsheet
        this.panels.library.onFixtureSelected = (fixture, isDoubleClick) => {
            this.stageEngine.selectFixtureIn3D(fixture);
            this.panels.inspector.selectFixture(fixture);
            if (isDoubleClick) {
                document.querySelector('.tab-btn[data-tab="inspector"]').click();
            }
        };

        this.stageEngine.onItemDropped = (data, dropPos) => {
            if (data.category === 'prop') {
                this.stageEngine.addProp(data.type, 0x555555, dropPos);
            } else if (data.category === 'fixture') {
                this.panels.library.autoPatchAtPosition(data.profileKey, dropPos);
                document.querySelector('.tab-btn[data-tab="patch"]').click();
            }
        };

        this.programmer.on('update', () => {
            this.patchEngine.getAllFixtures().forEach(f => f.updateThreeObject());
            if (this.mirrorSystem) this.mirrorSystem.markDirty();
        });

        this.cueList.on('cueChange', (cue) => {
            if (cue) this.fadeEngine.startCue(cue, this.patchEngine);
            this.mirrorSystem.markDirty();
            this.panels.timeline.render();
            // Update cue name display in transport bar
            const nameEl = document.getElementById('cue-name-display');
            if (nameEl) nameEl.textContent = cue ? (cue.name || cue.id) : '—';
        });

        this.setupTabsAndToolbar();
        this.createTestPatch();
        this.panels.library.renderTable();

        // Autosave every 5 minutes
        setInterval(() => this._autoSave(), 5 * 60 * 1000);

        // Autosave on page unload
        window.addEventListener('beforeunload', () => this._autoSave());
    }

    sendDmx() {
        if (!this.artnetClient || !this.artnetClient.isConnected) return;
        for (const universeNum in this.patchEngine.universes) {
            const universe = parseInt(universeNum, 10);
            const fixtures = this.patchEngine.getFixturesByUniverse(universe);
            const dmxData = new Array(512).fill(0);

            for (const fixture of fixtures) {
                const fadeState = this.fadeEngine.getFixtureState(fixture.id);
                let finalState = { intensity: fixture.intensity, color: { ...fixture.color } };

                if (fadeState) {
                    if (fadeState.intensity !== undefined) finalState.intensity = fadeState.intensity;
                    if (fadeState.color !== undefined) finalState.color = { ...finalState.color, ...fadeState.color };
                }

                const currentCue = this.cueList.getCurrentCue();
                if (currentCue && currentCue.data && currentCue.data[fixture.id]) {
                    const entry = currentCue.data[fixture.id];
                    if (entry.colorPalette) {
                        const palette = this.paletteManager.getColorPalette(entry.colorPalette);
                        if (palette) finalState.color = { ...palette.color };
                    } else if (entry.color) {
                        finalState.color = { ...finalState.color, ...entry.color };
                    }
                    if (entry.intensity !== undefined) finalState.intensity = entry.intensity;
                }

                const programmerState = this.programmer.getValuesForFixture(fixture.id);
                if (programmerState) {
                    if (programmerState.intensity !== undefined) finalState.intensity = programmerState.intensity;
                    if (programmerState.color !== undefined) finalState.color = { ...finalState.color, ...programmerState.color };
                    Object.keys(programmerState).forEach(key => {
                        if (key !== 'color' && key !== 'intensity') finalState[key] = programmerState[key];
                    });
                }

                // Render 3D from state — do NOT mutate fixture.intensity or fixture.color
                fixture.updateThreeObject(finalState);

                const fixtureDmx = fixture.getDmxValuesFromState(finalState);
                const dmxBuf = this.blackout.applyToBuffer(fixtureDmx);
                for (let i = 0; i < dmxBuf.length; i++) {
                    const channelIndex = fixture.address - 1 + i;
                    if (channelIndex < 512 && channelIndex >= 0) dmxData[channelIndex] = dmxBuf[i];
                }
            }
            this.artnetClient.send(universe, dmxData);
            if (this.panels.dmxSheet && this.panels.dmxSheet.universe === universe) this.panels.dmxSheet.updateData(dmxData);
        }
    }

    setupTabsAndToolbar() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${target}`).classList.add('active');
            });
        });

        // 3D Toolbar Worklights
        const workLightsBtn = document.getElementById('tool-worklights');
        if (workLightsBtn) {
            workLightsBtn.addEventListener('click', () => {
                const isOn = this.stageEngine.toggleWorkLights();
                workLightsBtn.textContent = isOn ? '💡 Work Lights: ON' : '💡 Work Lights: OFF';
                workLightsBtn.style.color = isOn ? '#ffcc00' : '#888';
                workLightsBtn.style.borderColor = isOn ? '#ffcc00' : '#444';
            });
        }

        const tools = ['move', 'rotate', 'scale'];
        tools.forEach(tool => {
            const btn = document.getElementById(`tool-${tool}`);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    const mode = tool === 'move' ? 'translate' : tool;
                    this.stageEngine.setTransformMode(mode);
                    document.querySelectorAll('.tool-btn').forEach(b => {
                        if (b.id !== 'tool-worklights') b.classList.remove('active');
                    });
                    e.target.classList.add('active');
                });
            }
        });

        // BLACKOUT button
        const blackoutBtn = document.getElementById('btn-blackout');
        if (blackoutBtn) {
            blackoutBtn.addEventListener('click', () => {
                const active = this.blackout.toggle();
                blackoutBtn.classList.toggle('blackout-active', active);
                this.mirrorSystem.markDirty();
            });
        }

        // KINDLE button — toggle floating panel
        const kindleBtn = document.getElementById('btn-kindle');
        const kindlePanel = document.getElementById('kindle-panel');
        if (kindleBtn && kindlePanel) {
            kindleBtn.addEventListener('click', () => {
                kindlePanel.classList.toggle('visible');
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            const tag = document.activeElement.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            if (e.key === 'b' || e.key === 'B') {
                const active = this.blackout.toggle();
                const btn = document.getElementById('btn-blackout');
                if (btn) btn.classList.toggle('blackout-active', active);
                this.mirrorSystem.markDirty();
            }

            if (e.key === 'h' || e.key === 'H') {
                if (this.panels.inspector && this.panels.inspector.toggleHighlight) {
                    this.panels.inspector.toggleHighlight();
                }
            }
        });
    }

    createTestPatch() {
        const wash1 = new WashLight({ name: 'Front Wash 1', id: 'wash-1' });
        this.patchEngine.patchFixture(wash1, 0, 1);
        const wash1Obj = wash1.createThreeObject();
        wash1Obj.position.set(-5, 5, 0); wash1Obj.rotation.x = Math.PI;
        this.stageEngine.add(wash1Obj);

        const wash2 = new WashLight({ name: 'Front Wash 2', id: 'wash-2' });
        this.patchEngine.patchFixture(wash2, 0, 11);
        const wash2Obj = wash2.createThreeObject();
        wash2Obj.position.set(5, 5, 0); wash2Obj.rotation.x = Math.PI;
        this.stageEngine.add(wash2Obj);

        this.stageEngine.addProp('human', 0xaaaaaa, {x: 0, y: 0, z: 1});
        this.stageEngine.addProp('riser', 0x333333, {x: 0, y: 0, z: -2});
    }
}

window.addEventListener('load', () => { window.glaed = new App(); });
