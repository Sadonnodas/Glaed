class MovingHead extends _BaseFixture {
    constructor(options = {}) {
        super(options);
        this.name = options.name || 'Moving Head';

        // Example channel map for a basic moving head
        this.channels = [
            { offset: 0, name: 'Pan', type: 'pan' },
            { offset: 1, name: 'Pan Fine', type: 'pan_fine' },
            { offset: 2, name: 'Tilt', type: 'tilt' },
            { offset: 3, name: 'Tilt Fine', type: 'tilt_fine' },
            { offset: 4, name: 'Dimmer', type: 'intensity' },
            { offset: 5, name: 'Red', type: 'red' },
            { offset: 6, name: 'Green', type: 'green' },
            { offset: 7, name: 'Blue', type: 'blue' },
            { offset: 8, name: 'Gobo', type: 'gobo' },
            { offset: 9, name: 'Strobe', type: 'strobe' },
            { offset: 10, name: 'Speed', type: 'pan_tilt_speed' }
        ];

        this.channelMap = {
            pan: 1,
            pan_fine: 2,
            tilt: 3,
            tilt_fine: 4,
            intensity: 5,
            red: 6,
            green: 7,
            blue: 8,
            gobo: 9,
            strobe: 10,
            pan_tilt_speed: 11
        };

        this.pan = 0;
        this.tilt = 0;
        this.color = { r: 255, g: 255, b: 255 };
        this.calibration = new Calibration();
    }

    createThreeObject() {
        const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0x5c1a8c, // Purple — moving heads
            metalness: 0.8,
            roughness: 0.2
        });
        this.threeObject = new THREE.Mesh(geometry, material);
        this.threeObject.userData.fixture = this;

        // Add a lens
        const lensGeometry = new THREE.CircleGeometry(0.25, 16);
        const lensMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const lens = new THREE.Mesh(lensGeometry, lensMaterial);
        lens.position.set(0, 0.4, 0);
        lens.rotation.x = -Math.PI / 2;
        this.threeObject.add(lens);
        this.threeObject.lens = lens;

        this._addGroupRing(0.4, 0);
        this.updateThreeObject();
        return this.threeObject;
    }

    updateThreeObject(state) {
        if (!this.threeObject) return;

        const color     = state ? state.color     : this.color;
        const intensity = state ? state.intensity : this.intensity;
        const pan       = state ? (state.pan  !== undefined ? state.pan  : this.pan)  : this.pan;
        const tilt      = state ? (state.tilt !== undefined ? state.tilt : this.tilt) : this.tilt;

        const { r = 255, g = 255, b = 255 } = color || {};
        const displayColor = new THREE.Color(r / 255, g / 255, b / 255);
        this.threeObject.lens.material.color.copy(displayColor);
        this.threeObject.lens.material.emissive.copy(displayColor);
        this.threeObject.lens.material.emissiveIntensity = (intensity || 0) / 255;

        // Rotate based on pan/tilt (simplified)
        this.threeObject.rotation.y = (pan / 255) * Math.PI * 2;
        this.threeObject.rotation.x = (tilt / 255) * Math.PI;
    }

    getDmxValues() {
        const cal = this.calibration;
        const dmx = new Array(this.channels.length).fill(0);
        dmx[this.channelMap.pan - 1]       = cal.applyPan(this.pan);
        dmx[this.channelMap.tilt - 1]      = cal.applyTilt(this.tilt);
        dmx[this.channelMap.intensity - 1] = cal.applyDimmer(this.intensity);
        dmx[this.channelMap.red - 1]       = this.color.r;
        dmx[this.channelMap.green - 1]     = this.color.g;
        dmx[this.channelMap.blue - 1]      = this.color.b;
        return dmx;
    }

    getDmxValuesFromState(state) {
        const cal = this.calibration;
        const dmx = new Array(this.channels.length).fill(0);
        if (state.pan !== undefined)       dmx[this.channelMap.pan - 1]       = cal.applyPan(state.pan);
        if (state.tilt !== undefined)      dmx[this.channelMap.tilt - 1]      = cal.applyTilt(state.tilt);
        if (state.intensity !== undefined) dmx[this.channelMap.intensity - 1] = cal.applyDimmer(state.intensity);
        if (state.color) {
            if (state.color.r !== undefined) dmx[this.channelMap.red - 1]   = state.color.r;
            if (state.color.g !== undefined) dmx[this.channelMap.green - 1] = state.color.g;
            if (state.color.b !== undefined) dmx[this.channelMap.blue - 1]  = state.color.b;
        }
        return dmx;
    }
}