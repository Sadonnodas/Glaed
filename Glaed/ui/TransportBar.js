class TransportBar {
    constructor(dependencies) {
        Object.assign(this, dependencies);
        
        this.mode = 'live';
        this.mirrorEnabled = true;
        this.playStartTime = null;

        this.statusEl = document.getElementById('transport-status');
        this.timecodeEl = document.getElementById('timecode-status');
        this.timerEl = document.getElementById('show-timer');

        this.init();
    }

    init() {
        const modeSelect = document.getElementById('mode-select');
        if (modeSelect) {
            modeSelect.value = this.mode;
            modeSelect.addEventListener('change', (e) => this.setMode(e.target.value));
        }

        document.getElementById('btn-go')?.addEventListener('click', () => {
            this.cueList.go();
            this.setStatus(`Cue active: ${this.cueList.getCurrentCue() ? this.cueList.getCurrentCue().name : 'none'}`);
        });

        document.getElementById('btn-back')?.addEventListener('click', () => {
            this.cueList.back();
            this.setStatus(`Cue active: ${this.cueList.getCurrentCue() ? this.cueList.getCurrentCue().name : 'none'}`);
        });

        document.getElementById('btn-play')?.addEventListener('click', () => {
            this.cueList.play();
            this.playStartTime = Date.now();
            this.setStatus(`Playing cues from: ${this.cueList.getCurrentCue() ? this.cueList.getCurrentCue().name : 'none'}`);
            this.mirrorSystem.markDirty();
            this.updateShowTimer();
        });

        document.getElementById('btn-pause')?.addEventListener('click', () => {
            this.cueList.pause();
            this.setStatus('Paused');
        });

        document.getElementById('btn-stop')?.addEventListener('click', () => {
            this.cueList.stop();
            this.playStartTime = null;
            this.setStatus('Stopped');
            this.fadeEngine.clear();
            this.programmer.clear();
            this.mirrorSystem.markDirty();
            this.updateShowTimer();
        });

        document.getElementById('btn-save')?.addEventListener('click', () => this.showManager.saveShow(this));

        const fileInput = document.getElementById('show-file-input');
        document.getElementById('btn-load')?.addEventListener('click', () => fileInput?.click());
        
        if (fileInput) {
            fileInput.addEventListener('change', (event) => {
                const file = event.target.files && event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        this.showManager.loadShowData(data, this);
                    } catch (err) { console.error(err); this.setStatus('Load failed'); }
                };
                reader.readAsText(file);
                fileInput.value = '';
            });
        }

        document.getElementById('btn-clear')?.addEventListener('click', () => {
            this.programmer.clear();
            this.setStatus('Programmer cleared');
        });

        document.getElementById('btn-record')?.addEventListener('click', () => {
            const newCueId = `cue-${String(this.cueList.cues.length + 1).padStart(3, '0')}`;
            const data = {};
            this.patchEngine.getAllFixtures().forEach(f => {
                const merged = this.programmer.getMergedState(f.id, { intensity: f.intensity, color: { ...f.color } });
                const panels = this.getPanels();
                const selectedPalette = panels.palette ? panels.palette.getSelectedPalette() : null;

                data[f.id] = selectedPalette 
                    ? { intensity: merged.intensity, colorPalette: selectedPalette.id }
                    : { intensity: merged.intensity, color: { ...merged.color } };
            });
            
            const cue = { id: newCueId, name: `Recorded ${newCueId}`, fadeIn: 1.0, fadeOut: 0, delay: 0, follow: false, data };
            this.cueList.addCue(cue);
            
            const panels = this.getPanels();
            if (panels.cueList) panels.cueList.render();
            if (panels.timeline) panels.timeline.render();
            this.setStatus(`Recorded ${newCueId}`);
        });

        const mirrorBtn = document.getElementById('btn-mirror-toggle');
        if (mirrorBtn) {
            mirrorBtn.addEventListener('click', () => {
                this.mirrorEnabled = !this.mirrorEnabled;
                if (this.mirrorEnabled) {
                    this.mirrorSystem.start();
                    mirrorBtn.textContent = 'Mirror: ON';
                    this.setStatus('Mirror ON');
                } else {
                    this.mirrorSystem.stop();
                    mirrorBtn.textContent = 'Mirror: OFF';
                    this.setStatus('Mirror OFF');
                }
            });
        }
    }

    setMode(newMode) {
        this.mode = newMode;
        const modeSelect = document.getElementById('mode-select');
        if (modeSelect) modeSelect.value = this.mode;
        
        this.setStatus(`Mode: ${this.mode}`);
        const mirrorBtn = document.getElementById('btn-mirror-toggle');

        if (this.mode === 'playback') {
            this.timecodeReceiver.connect();
            this.midiBridge.connect();
            this.mirrorSystem.stop();
            if (mirrorBtn) mirrorBtn.textContent = 'Mirror: OFF';
            this.mirrorEnabled = false;
        } else {
            this.timecodeReceiver.disconnect();
            this.midiBridge.disconnect();
        }

        if (this.mode === 'live') {
            this.mirrorSystem.start();
            if (mirrorBtn) mirrorBtn.textContent = 'Mirror: ON';
            this.mirrorEnabled = true;
        }
    }

    setStatus(text) { if (this.statusEl) this.statusEl.textContent = text; }
    setTimecode(text) { if (this.timecodeEl) this.timecodeEl.textContent = text; }

    updateShowTimer() {
        if (!this.timerEl) return;
        if (!this.playStartTime) {
            this.timerEl.textContent = 'Elapsed: 00:00';
            return;
        }
        const elapsed = Math.floor((Date.now() - this.playStartTime) / 1000);
        const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const secs = (elapsed % 60).toString().padStart(2, '0');
        this.timerEl.textContent = `Elapsed: ${mins}:${secs}`;
        if (this.cueList.playing) {
            setTimeout(() => this.updateShowTimer(), 1000);
        }
    }
}