class ShowManager {
    constructor(dependencies) {
        Object.assign(this, dependencies);
    }

    collectShowData() {
        const nameEl = document.getElementById('show-name-input');
        return {
            showName: nameEl ? nameEl.value.trim() || 'Untitled Show' : 'Untitled Show',
            createdAt: new Date().toISOString(),
            mode: this.mode || 'live',
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
                position: f.threeObject ? { x: f.threeObject.position.x, y: f.threeObject.position.y, z: f.threeObject.position.z } : null,
                rotation: f.threeObject ? { x: f.threeObject.rotation.x, y: f.threeObject.rotation.y, z: f.threeObject.rotation.z } : null,
                calibration: f.calibration ? f.calibration.toJSON() : null
            })),
            cues: this.cueList.cues,
            palettes: {
                color: this.paletteManager.getAllColorPalettes(),
                position: Object.values(this.paletteManager.palettes.position || {}),
                beam: Object.values(this.paletteManager.palettes.beam || {})
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

    saveShow(transportBar) {
        try {
            const showData = this.collectShowData();
            const name = `glaed-show-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            this.downloadJSON(name, showData);
            if (transportBar) transportBar.setStatus('Show saved');
        } catch (err) {
            console.error('Failed to save show:', err);
            if (transportBar) transportBar.setStatus('Save failed');
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

        const panels = this.getPanels();
        if (panels.cueList) panels.cueList.render();
        if (panels.timeline) panels.timeline.render();
        if (panels.palette) panels.palette.render();
        if (panels.group) panels.group.render();
        if (panels.dmxSheet) panels.dmxSheet.updateData(new Array(512).fill(0));
    }

    loadShowData(data, transportBar) {
        this.resetShow();

        if (data.mode && transportBar) {
            transportBar.setMode(data.mode);
        }

        const fixtureMap = { WashLight, MovingHead };

        (data.fixtures || []).forEach(fixtureData => {
            let fixture;
            if (fixtureData.className && fixtureMap[fixtureData.className]) {
                fixture = new fixtureMap[fixtureData.className]({ id: fixtureData.id, name: fixtureData.name, manufacturer: fixtureData.manufacturer });
            } else {
                fixture = new _BaseFixture({ id: fixtureData.id, name: fixtureData.name, manufacturer: fixtureData.manufacturer });
            }

            fixture.intensity = fixtureData.intensity || 0;
            fixture.color = { ...fixtureData.color };
            fixture.channels = fixtureData.channels || fixture.channels;
            fixture.channelMap = fixtureData.channelMap || fixture.channelMap;
            if (fixtureData.calibration && fixture.calibration) {
                fixture.calibration.fromJSON(fixtureData.calibration);
            }

            const obj = fixture.createThreeObject();
            if (fixtureData.position && obj) {
                obj.position.set(fixtureData.position.x, fixtureData.position.y, fixtureData.position.z);
            }
            if (fixtureData.rotation && obj) {
                obj.rotation.set(fixtureData.rotation.x, fixtureData.rotation.y, fixtureData.rotation.z);
            }
            if (this.stageEngine) this.stageEngine.add(obj);

            this.patchEngine.patchFixture(fixture, fixtureData.universe || 0, fixtureData.address || 1);
        });

        (data.palettes?.color || []).forEach(p => this.paletteManager.addColorPalette(p.id, p.name, p.color));
        (data.palettes?.position || []).forEach(p => this.paletteManager.addPositionPalette(p.id, p.name, p.panTilt));
        (data.palettes?.beam || []).forEach(p => this.paletteManager.addBeamPalette(p.id, p.name, p.settings));

        if (data.groups) {
            Object.entries(data.groups).forEach(([name, members]) => this.groupManager.createGroup(name, members));
        }

        if (Array.isArray(data.cues)) {
            this.cueList.cues = data.cues;
            this.cueList.currentIndex = (typeof data.currentCueIndex === 'number') ? data.currentCueIndex : -1;
        }

        const panels = this.getPanels();
        if (panels.cueList)  panels.cueList.render();
        if (panels.timeline) panels.timeline.render();
        if (panels.palette)  panels.palette.render();
        if (panels.group)    panels.group.render();
        if (panels.library)  {
            panels.library.renderTable();
            panels.library.refreshGroupColors();
        }

        // Restore show name in transport bar input
        const nameEl = document.getElementById('show-name-input');
        if (nameEl && data.showName) nameEl.value = data.showName;

        if (transportBar) transportBar.setStatus('Show loaded');
        this.mirrorSystem.markDirty();
    }

    loadShow(jsonString, transportBar) {
        const data = JSON.parse(jsonString);
        this.loadShowData(data, transportBar);
    }
}