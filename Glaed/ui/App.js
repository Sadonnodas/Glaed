
class App {
    constructor() {
        this.stageEngine = null;
        this.patchEngine = null;
        this.programmer = null;
        this.fadeEngine = null;
        this.cueList = null;
        this.mirrorSystem = null;
        this.groupManager = null;
        this.artnetClient = null;
        this.dmxSheet = null;
        this.inspectorPanel = null;
        this.transportStatusEl = null;
        this.timecodeStatusEl = null;
        this.showTimerEl = null;
        this.playStartTime = null;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.init();
    }

    init() {
        console.log('Initializing Glaed...');

        // 1. Engines
        this.patchEngine = new PatchEngine();
        this.programmer = new Programmer();
        this.fadeEngine = new FadeEngine();
        this.cueList = new CueList();
        this.groupManager = new GroupManager();
        this.paletteManager = new PaletteManager();
        this.timecodeReceiver = new TimecodeReceiver();
        this.midiBridge = new MidiBridge((tc) => {
            this.setTimecodeStatus(`MTC: ${String(tc.hours).padStart(2,'0')}:${String(tc.minutes).padStart(2,'0')}:${String(tc.seconds).padStart(2,'0')}:${String(tc.frames).padStart(2,'0')}`);
            if (this.mode === 'playback') {
                const idx = Math.floor(tc.totalSeconds / 4) % this.cueList.cues.length;
                if (idx !== this.cueList.currentIndex) {
                    this.cueList.go(idx);
                }
            }
        });
        this.mirrorSystem = new MirrorSystem(() => {
            this.fadeEngine.update(1 / 40); // 40 Hz simulation
            if (this.fadeEngine.active) {
                this.mirrorSystem.markDirty();
            }
            this.sendDmx();
        });

        this.cueList.onCueChange = (cue) => {
            if (cue) {
                console.log('Cue fired:', cue.name || cue.id);
                this.fadeEngine.startCue(cue, this.patchEngine);
                if (this.mirrorSystem) this.mirrorSystem.markDirty();
            }
            if (this.timelinePanel) {
                this.timelinePanel.render();
            }
        };

        this.cueList.onFollow = (cue) => {
            if (cue) {
                console.log('Auto-following cue:', cue.name || cue.id);
                this.setTransportStatus(`Auto-follow cue: ${cue.name || cue.id}`);
                if (this.mirrorSystem) this.mirrorSystem.markDirty();
            }
        };

        this.timecodeReceiver.onTimecode = (tc) => {
            this.setTimecodeStatus(`TC: ${String(tc.hours).padStart(2,'0')}:${String(tc.minutes).padStart(2,'0')}:${String(tc.seconds).padStart(2,'0')}:${String(tc.frames).padStart(2,'0')}`);

            if (this.mode === 'playback') {
                const idx = Math.floor(tc.totalSeconds / 4) % this.cueList.cues.length;
                if (idx !== this.cueList.currentIndex) {
                    this.cueList.go(idx);
                }
            }
        };

        this.timecodeReceiver.onLock = (locked) => {
            this.setTransportStatus(locked ? 'Timecode locked' : 'Timecode unlocked');
        };
        
        // 2. UI
        const stageContainer = document.getElementById('stage-viewport');
        if (stageContainer) {
            this.stageEngine = new StageEngine(stageContainer);
            this.stageEngine.renderer.domElement.addEventListener('click', this.onCanvasClick.bind(this), false);
        } else {
            console.error('Could not find #stage-viewport container for StageEngine.');
        }

        const dmxSheetContainer = document.getElementById('dmx-sheet');
        if (dmxSheetContainer) {
            this.dmxSheet = new DmxSheet(dmxSheetContainer);
        } else {
            console.error('Could not find #dmx-sheet container for DmxSheet.');
        }
        
        const inspectorContainer = document.getElementById('inspector-panel');
        if (inspectorContainer) {
            this.inspectorPanel = new InspectorPanel(inspectorContainer, this.programmer);
        } else {
            console.error('Could not find #inspector-panel container for InspectorPanel.');
        }

        const cueListPanelContainer = document.getElementById('cue-list-panel');
        if (cueListPanelContainer) {
            this.cueListPanel = new CueListPanel(cueListPanelContainer, this.cueList);
            this.cueListPanel.onGo = (cue) => {
                this.setTransportStatus(`Cue active: ${cue ? cue.name : 'none'}`);
            };
            this.cueListPanel.onBack = (cue) => {
                this.setTransportStatus(`Cue active: ${cue ? cue.name : 'none'}`);
            };
        } else {
            console.error('Could not find #cue-list-panel container for CueListPanel.');
        }

        const palettePanelContainer = document.getElementById('palette-panel');
        if (palettePanelContainer) {
            this.palettePanel = new PalettePanel(palettePanelContainer, this.paletteManager);
            this.palettePanel.onPaletteSelected = (palette) => {
                this.setTransportStatus(`Palette selected: ${palette.name}`);
            };
        } else {
            console.error('Could not find #palette-panel container for PalettePanel.');
        }

        const groupPanelContainer = document.getElementById('group-panel');
        if (groupPanelContainer) {
            this.groupPanel = new GroupPanel(groupPanelContainer, this.patchEngine, this.groupManager);
        } else {
            console.error('Could not find #group-panel container for GroupPanel.');
        }

        const timelinePanelContainer = document.getElementById('timeline-panel');
        if (timelinePanelContainer) {
            this.timelinePanel = new TimelinePanel(timelinePanelContainer, this.cueList);
        } else {
            console.error('Could not find #timeline-panel container for TimelinePanel.');
        }

        const kindleContainer = document.getElementById('kindle-assistant');
        if (kindleContainer) {
            this.kindleAssistant = new KindleAssistant(kindleContainer, this.cueList, this.paletteManager);
            this.kindleAssistant.onCueGenerated = (cue) => {
                this.timelinePanel.render();
                this.cueListPanel.render();
                this.setTransportStatus(`AI cue generated: ${cue.name}`);
            };
        } else {
            console.error('Could not find #kindle-assistant container for KindleAssistant.');
        }

        const fixtureLibraryContainer = document.getElementById('fixture-library-panel');
        if (fixtureLibraryContainer) {
            this.fixtureLibraryPanel = new FixtureLibraryPanel(fixtureLibraryContainer, this.patchEngine, this);
        } else {
            console.error('Could not find #fixture-library-panel container for FixtureLibraryPanel.');
        }

        this.transportStatusEl = document.getElementById('transport-status');
        this.timecodeStatusEl = document.getElementById('timecode-status');
        this.showTimerEl = document.getElementById('show-timer');
        this.setupTransportControls();

        // 3. Hardware
        this.artnetClient = new ArtnetClient();
        this.artnetClient.connect()
            .then(() => {
                console.log("Art-Net client connected successfully.");
                // Start mirror output loop at 40Hz
                this.mirrorSystem.start();
            })
            .catch(err => {
                console.error("Art-Net client connection failed:", err);
            });

        // 4. Test Patch
        this.createTestPatch();
        
        // Link programmer updates to redrawing the stage and marking mirror dirty
        this.programmer.onUpdate = () => {
            this.patchEngine.getAllFixtures().forEach(f => f.updateThreeObject());
            if (this.mirrorSystem) this.mirrorSystem.markDirty();
        };
    }

    setupTransportControls() {
        const goBtn = document.getElementById('btn-go');
        const backBtn = document.getElementById('btn-back');
        const playBtn = document.getElementById('btn-play');
        const pauseBtn = document.getElementById('btn-pause');
        const stopBtn = document.getElementById('btn-stop');
        const saveBtn = document.getElementById('btn-save');
        const loadBtn = document.getElementById('btn-load');
        const fileInput = document.getElementById('show-file-input');
        const clearBtn = document.getElementById('btn-clear');
        const recordBtn = document.getElementById('btn-record');
        const mirrorToggleBtn = document.getElementById('btn-mirror-toggle');
        const modeSelect = document.getElementById('mode-select');

        if (modeSelect) {
            modeSelect.value = this.mode;
            modeSelect.addEventListener('change', (e) => {
                this.mode = e.target.value;
                this.setTransportStatus(`Mode: ${this.mode}`);

                if (this.mode === 'playback') {
                    this.timecodeReceiver.connect();
                    this.midiBridge.connect();
                    this.mirrorSystem.stop();
                    mirrorToggleBtn.textContent = 'Mirror: OFF';
                    this.mirrorEnabled = false;
                } else {
                    this.timecodeReceiver.disconnect();
                    this.midiBridge.disconnect();
                }

                if (this.mode === 'live') {
                    this.mirrorSystem.start();
                    mirrorToggleBtn.textContent = 'Mirror: ON';
                    this.mirrorEnabled = true;
                }
            });
        }

        if (goBtn) {
            goBtn.addEventListener('click', () => {
                this.cueList.go();
                this.setTransportStatus(`Cue active: ${this.cueList.getCurrentCue() ? this.cueList.getCurrentCue().name : 'none'}`);
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.cueList.back();
                this.setTransportStatus(`Cue active: ${this.cueList.getCurrentCue() ? this.cueList.getCurrentCue().name : 'none'}`);
            });
        }

        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.cueList.play();
                this.playStartTime = Date.now();
                this.setTransportStatus(`Playing cues from: ${this.cueList.getCurrentCue() ? this.cueList.getCurrentCue().name : 'none'}`);
                this.mirrorSystem.markDirty();
                this.updateShowTimer();
            });
        }

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.cueList.pause();
                this.setTransportStatus('Paused');
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.cueList.stop();
                this.playStartTime = null;
                this.setTransportStatus('Stopped');
                this.fadeEngine.clear();
                this.programmer.clear();
                this.mirrorSystem.markDirty();
                this.updateShowTimer();
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveShow();
            });
        }

        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                if (fileInput) fileInput.click();
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (event) => {
                const file = event.target.files && event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        this.loadShow(e.target.result);
                    } catch (err) {
                        console.error('Failed to load show file', err);
                        this.setTransportStatus('Load failed');
                    }
                };
                reader.readAsText(file);
                fileInput.value = '';
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.programmer.clear();
                this.setTransportStatus('Programmer cleared');
            });
        }

        if (recordBtn) {
            recordBtn.addEventListener('click', () => {
                const newCueId = `cue-${String(this.cueList.cues.length + 1).padStart(3, '0')}`;
                const data = {};
                this.patchEngine.getAllFixtures().forEach(f => {
                    const progState = this.programmer.getValuesForFixture(f.id);
                    const baseState = {
                        intensity: f.intensity,
                        color: { ...f.color }
                    };
                    const merged = this.programmer.getMergedState(f.id, baseState);
                    const selectedPalette = this.palettePanel ? this.palettePanel.getSelectedPalette() : null;

                    if (selectedPalette) {
                        data[f.id] = {
                            intensity: merged.intensity,
                            colorPalette: selectedPalette.id
                        };
                    } else {
                        data[f.id] = {
                            intensity: merged.intensity,
                            color: { ...merged.color }
                        };
                    }
                });
                const cue = { id: newCueId, name: `Recorded ${newCueId}`, fadeIn: 1.0, fadeOut: 0, delay: 0, follow: false, data };
                this.cueList.addCue(cue);
                this.cueListPanel.render();
                this.setTransportStatus(`Recorded ${newCueId}`);
            });
        }

        if (mirrorToggleBtn) {
            mirrorToggleBtn.addEventListener('click', () => {
                this.mirrorEnabled = !this.mirrorEnabled;
                if (this.mirrorEnabled) {
                    this.mirrorSystem.start();
                    mirrorToggleBtn.textContent = 'Mirror: ON';
                    this.setTransportStatus('Mirror ON');
                } else {
                    this.mirrorSystem.stop();
                    mirrorToggleBtn.textContent = 'Mirror: OFF';
                    this.setTransportStatus('Mirror OFF');
                }
            });
        }
    }

    setTransportStatus(text) {
        if (this.transportStatusEl) this.transportStatusEl.textContent = text;
    }

    setTimecodeStatus(text) {
        if (this.timecodeStatusEl) this.timecodeStatusEl.textContent = text;
    }

    updateShowTimer() {
        if (!this.showTimerEl) return;
        if (!this.playStartTime) {
            this.showTimerEl.textContent = 'Elapsed: 00:00';
            return;
        }
        const elapsed = Math.floor((Date.now() - this.playStartTime) / 1000);
        const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const secs = (elapsed % 60).toString().padStart(2, '0');
        this.showTimerEl.textContent = `Elapsed: ${mins}:${secs}`;
        if (this.cueList.playing) {
            setTimeout(() => this.updateShowTimer(), 1000);
        }
    }

    collectShowData() {
        return {
            createdAt: new Date().toISOString(),
            mode: this.mode,
            fixtures: this.patchEngine.getAllFixtures().map(f => ({
                className: f.constructor.name,
                id: f.id,
                name: f.name,
                manufacturer: f.manufacturer,
                universe: f.universe,
                address: f.address,
                intensity: f.intensity,
                color: { ...f.color },
                channels: f.channels,
                channelMap: f.channelMap,
                position: f.threeObject ? { x: f.threeObject.position.x, y: f.threeObject.position.y, z: f.threeObject.position.z } : null
            })),
            cues: this.cueList.cues,
            palettes: {
                color: this.paletteManager.getAllColorPalettes(),
                position: Object.values(this.paletteManager.palettes.position),
                beam: Object.values(this.paletteManager.palettes.beam)
            },
            groups: this.groupManager.getAll(),
            currentCueIndex: this.cueList.currentIndex
        };
    }

    downloadJSON(filename, data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    saveShow() {
        try {
            const showData = this.collectShowData();
            const name = `glaed-show-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            this.downloadJSON(name, showData);
            this.setTransportStatus('Show saved');
        } catch (err) {
            console.error('Failed to save show:', err);
            this.setTransportStatus('Save failed');
        }
    }

    resetShow() {
        this.patchEngine.getAllFixtures().forEach(f => {
            if (f.threeObject && this.stageEngine) {
                this.stageEngine.remove(f.threeObject);
            }
        });

        this.patchEngine.fixtures = [];
        this.patchEngine.universes = {};

        this.cueList.cues = [];
        this.cueList.currentIndex = -1;
        this.cueList.playing = false;
        this.cueList.pause();

        this.paletteManager.palettes = { color: {}, position: {}, beam: {} };
        this.groupManager.groups = {};

        this.programmer.clear();
        this.fadeEngine.clear();

        if (this.cueListPanel) this.cueListPanel.render();
        if (this.timelinePanel) this.timelinePanel.render();
        if (this.palettePanel) this.palettePanel.render();
        if (this.groupPanel) this.groupPanel.render();
        if (this.dmxSheet) this.dmxSheet.updateData(new Array(512).fill(0));
    }

    loadShow(jsonString) {
        const data = JSON.parse(jsonString);
        this.resetShow();

        if (data.mode) {
            this.mode = data.mode;
            const modeSelect = document.getElementById('mode-select');
            if (modeSelect) modeSelect.value = this.mode;
        }

        const fixtureMap = {
            WashLight,
            MovingHead,
        };

        (data.fixtures || []).forEach(fixtureData => {
            let fixture;
            if (fixtureData.className && fixtureMap[fixtureData.className]) {
                fixture = new fixtureMap[fixtureData.className]({
                    id: fixtureData.id,
                    name: fixtureData.name,
                    manufacturer: fixtureData.manufacturer
                });
            } else {
                fixture = new _BaseFixture({ id: fixtureData.id, name: fixtureData.name, manufacturer: fixtureData.manufacturer });
            }

            fixture.intensity = fixtureData.intensity || 0;
            fixture.color = { ...fixtureData.color };
            fixture.channels = fixtureData.channels || fixture.channels;
            fixture.channelMap = fixtureData.channelMap || fixture.channelMap;

            const obj = fixture.createThreeObject();
            if (fixtureData.position && obj) {
                obj.position.set(fixtureData.position.x, fixtureData.position.y, fixtureData.position.z);
            }
            if (this.stageEngine) this.stageEngine.add(obj);

            this.patchEngine.patchFixture(fixture, fixtureData.universe || 0, fixtureData.address || 1);
        });

        (data.palettes && data.palettes.color || []).forEach(p => {
            this.paletteManager.addColorPalette(p.id, p.name, p.color);
        });
        (data.palettes && data.palettes.position || []).forEach(p => {
            this.paletteManager.addPositionPalette(p.id, p.name, p.panTilt);
        });
        (data.palettes && data.palettes.beam || []).forEach(p => {
            this.paletteManager.addBeamPalette(p.id, p.name, p.settings);
        });

        if (data.groups) {
            Object.entries(data.groups).forEach(([name, members]) => {
                this.groupManager.createGroup(name, members);
            });
        }

        if (Array.isArray(data.cues)) {
            this.cueList.cues = data.cues;
            this.cueList.currentIndex = (typeof data.currentCueIndex === 'number') ? data.currentCueIndex : -1;
        }

        if (this.cueListPanel) this.cueListPanel.render();
        if (this.timelinePanel) this.timelinePanel.render();
        if (this.palettePanel) this.palettePanel.render();
        if (this.groupPanel) this.groupPanel.render();

        this.setTransportStatus('Show loaded');
        this.mirrorSystem.markDirty();
    }

    createTestPatch() {
        const wash1 = new WashLight({ name: 'Front Wash 1', id: 'wash-1' });
        this.patchEngine.patchFixture(wash1, 0, 1);
        const wash1Obj = wash1.createThreeObject();
        wash1Obj.position.set(-5, 5, 0);
        this.stageEngine.add(wash1Obj);

        const wash2 = new WashLight({ name: 'Front Wash 2', id: 'wash-2' });
        this.patchEngine.patchFixture(wash2, 0, 11);
        const wash2Obj = wash2.createThreeObject();
        wash2Obj.position.set(5, 5, 0);
        this.stageEngine.add(wash2Obj);

        // Create some reference palettes
        this.paletteManager.addColorPalette('tour-red', 'Tour Red', { r: 255, g: 80, b: 30 });
        this.paletteManager.addColorPalette('stage-blue', 'Stage Blue', { r: 30, g: 120, b: 255 });

        // Build a small test cue stack.
        this.cueList.addCue({
            id: 'cue-001',
            name: 'All bright white',
            fadeIn: 1.2,
            fadeOut: 0,
            delay: 0,
            follow: false,
            data: {
                'wash-1': { intensity: 255, color: { r: 255, g: 255, b: 255 } },
                'wash-2': { intensity: 255, color: { r: 255, g: 255, b: 255 } }
            }
        });

        this.cueList.addCue({
            id: 'cue-002',
            name: 'Warm dim (Tour Red palette)',
            fadeIn: 1.2,
            fadeOut: 0,
            delay: 0,
            follow: true,
            followTime: 4.0,
            data: {
                'wash-1': { intensity: 180, colorPalette: 'tour-red' },
                'wash-2': { intensity: 180, colorPalette: 'tour-red' }
            }
        });

        // Auto-start the first cue for sanity check
        this.cueList.addCue({
            id: 'cue-003',
            name: 'Cool blue',
            fadeIn: 1.2,
            fadeOut: 0,
            delay: 0,
            follow: false,
            data: {
                'wash-1': { intensity: 255, color: { r: 40, g: 80, b: 255 } },
                'wash-2': { intensity: 255, color: { r: 40, g: 80, b: 255 } }
            }
        });

        // Auto-start the first cue for sanity check
        this.cueList.go(0);

    }

    sendDmx() {
        if (!this.artnetClient || !this.artnetClient.isConnected) return;

        // For each universe managed by the PatchEngine
        for (const universeNum in this.patchEngine.universes) {
            const universe = parseInt(universeNum, 10);

            // Get all fixtures for this universe
            const fixtures = this.patchEngine.getFixturesByUniverse(universe);

            // Create a DMX buffer
            const dmxData = new Array(512).fill(0);

            for (const fixture of fixtures) {
                const fadeState = this.fadeEngine.getFixtureState(fixture.id);

                let finalState = {
                    intensity: fixture.intensity,
                    color: { ...fixture.color }
                };

                if (fadeState) {
                    if (fadeState.intensity !== undefined) finalState.intensity = fadeState.intensity;
                    if (fadeState.color !== undefined) finalState.color = { ...finalState.color, ...fadeState.color };
                }

                // Process cue color palettes (per-fixture reference)
                const currentCue = this.cueList.getCurrentCue();
                if (currentCue && currentCue.data && currentCue.data[fixture.id]) {
                    const entry = currentCue.data[fixture.id];
                    if (entry.colorPalette) {
                        const palette = this.paletteManager.getColorPalette(entry.colorPalette);
                        if (palette) {
                            finalState.color = { ...palette.color };
                        }
                    } else if (entry.color) {
                        finalState.color = { ...finalState.color, ...entry.color };
                    }
                    if (entry.intensity !== undefined) {
                        finalState.intensity = entry.intensity;
                    }
                }

                // Programmer is LTP and overrides fade and base state.
                const programmerState = this.programmer.getValuesForFixture(fixture.id);
                if (programmerState) {
                    if (programmerState.intensity !== undefined) finalState.intensity = programmerState.intensity;
                    if (programmerState.color !== undefined) finalState.color = { ...finalState.color, ...programmerState.color };
                    // Keep other DMX parameters from programmer state (for future modes)
                    Object.keys(programmerState).forEach(key => {
                        if (key !== 'color' && key !== 'intensity') {
                            finalState[key] = programmerState[key];
                        }
                    });
                }

                // Update the fixture visuals in the stage
                fixture.intensity = finalState.intensity;
                fixture.color = { ...finalState.color };
                fixture.updateThreeObject();

                const fixtureDmx = fixture.getDmxValuesFromState(finalState);

                for (let i = 0; i < fixtureDmx.length; i++) {
                    const channelIndex = fixture.address - 1 + i;
                    if (channelIndex < 512 && channelIndex >= 0) {
                        dmxData[channelIndex] = fixtureDmx[i];
                    }
                }
            }

            this.artnetClient.send(universe, dmxData);

            if (this.dmxSheet && this.dmxSheet.universe === universe) {
                this.dmxSheet.updateData(dmxData);
            }
        }
    }
    
    onCanvasClick(event) {
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = (event.clientX / this.stageEngine.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / this.stageEngine.renderer.domElement.clientHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.stageEngine.camera);

        const intersects = this.raycaster.intersectObjects(this.stageEngine.scene.children, true);

        if (intersects.length > 0) {
            let clickedObject = intersects[0].object;
            // Traverse up to find the group that has the fixture data
            while (clickedObject && !clickedObject.userData.fixture) {
                clickedObject = clickedObject.parent;
            }

            if (clickedObject && clickedObject.userData.fixture) {
                const fixture = clickedObject.userData.fixture;
                console.log('Selected fixture:', fixture.name);
                this.inspectorPanel.selectFixture(fixture);
            }
        } else {
            this.inspectorPanel.selectFixture(null);
        }
    }
}

// Entry point
window.addEventListener('load', () => {
    // These need to be loaded in the HTML file
    if (typeof THREE === 'undefined') {
        console.error('THREE.js is not loaded. Please include it in your HTML.');
        return;
    }
     if (typeof THREE.OrbitControls === 'undefined') {
        console.error('THREE.OrbitControls.js is not loaded. Please include it in your HTML.');
        return;
    }

    const app = new App();
    window.glaed = app; // For easy debugging from the console
});
