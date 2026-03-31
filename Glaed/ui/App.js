class App {
    constructor() {
        this.panels = {};
        this.init();
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
            kindle: new KindleAssistant(document.getElementById('kindle-assistant'), this.cueList, this.paletteManager),
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

        this.timecodeReceiver.onTimecode = (tc) => this.transportBar.setTimecode(`TC: ${String(tc.hours).padStart(2,'0')}:${String(tc.minutes).padStart(2,'0')}:${String(tc.seconds).padStart(2,'0')}:${String(tc.frames).padStart(2,'0')}`);
        
        // Single click from 3D view
        this.stageEngine.onFixtureSelected = (fixture) => {
            this.panels.inspector.selectFixture(fixture);
            // Don't auto-switch tabs when clicking in 3D, let the user decide.
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

        this.programmer.onUpdate = () => {
            this.patchEngine.getAllFixtures().forEach(f => f.updateThreeObject());
            if (this.mirrorSystem) this.mirrorSystem.markDirty();
        };

        this.cueList.onCueChange = (cue) => {
            if (cue) this.fadeEngine.startCue(cue, this.patchEngine);
            this.mirrorSystem.markDirty();
            this.panels.timeline.render();
        };

        this.setupTabsAndToolbar();
        this.createTestPatch();
        this.panels.library.renderTable();
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

                fixture.intensity = finalState.intensity;
                fixture.color = { ...finalState.color };
                fixture.updateThreeObject();

                const fixtureDmx = fixture.getDmxValuesFromState(finalState);
                for (let i = 0; i < fixtureDmx.length; i++) {
                    const channelIndex = fixture.address - 1 + i;
                    if (channelIndex < 512 && channelIndex >= 0) dmxData[channelIndex] = fixtureDmx[i];
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
        // Note: Curtain removed from default startup.
    }
}

window.addEventListener('load', () => { window.glaed = new App(); });