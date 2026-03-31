class WashLight extends _BaseFixture {
    constructor(options = {}) {
        super(options);
        this.name = options.name || 'Wash Light';

        this.channels = [
            { offset: 0, name: 'Red', type: 'red' },
            { offset: 1, name: 'Green', type: 'green' },
            { offset: 2, name: 'Blue', type: 'blue' },
            { offset: 3, name: 'White', type: 'white' },
            { offset: 4, name: 'Amber', type: 'amber' },
            { offset: 5, name: 'UV', type: 'uv' },
            { offset: 6, name: 'Dimmer', type: 'intensity' },
        ];
        
        this.channelMap = { red: 1, green: 2, blue: 3, white: 4, amber: 5, uv: 6, intensity: 7 };
        this.color = { r: 255, g: 255, b: 255, w: 255, a: 0, uv: 0 };
    }

    createThreeObject() {
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0x222222, // Darker body so the lens pops
            metalness: 0.5,
            roughness: 0.5
        });
        this.threeObject = new THREE.Mesh(geometry, material);
        this.threeObject.userData.fixture = this;

        // The glowing lens
        const lensGeometry = new THREE.CircleGeometry(0.4, 32);
        const lensMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x000000 });
        const lens = new THREE.Mesh(lensGeometry, lensMaterial);
        lens.position.set(0, 0.11, 0);
        lens.rotation.x = -Math.PI / 2;
        this.threeObject.add(lens);
        this.threeObject.lens = lens;

        // NEW: The Actual Light Source
        this.spotLight = new THREE.SpotLight(0xffffff, 0);
        this.spotLight.angle = Math.PI / 6; // 30 degree beam angle
        this.spotLight.penumbra = 0.5;      // Soft edges
        this.spotLight.distance = 40;       // How far the light travels
        this.spotLight.castShadow = true;
        
        this.spotLight.position.set(0, 0.12, 0);
        this.spotLight.target.position.set(0, 10, 0); // Point the light 'forward' out of the lens
        
        this.threeObject.add(this.spotLight);
        this.threeObject.add(this.spotLight.target); // Target must be added to the scene

        this.updateThreeObject(); 
        return this.threeObject;
    }

    updateThreeObject() {
        if (!this.threeObject) return;

        const { r, g, b, w, a } = this.color;
        
        const displayColor = new THREE.Color(
            (r + w + a) / (255 * 3),
            (g + w + a) / (255 * 3),
            (b + w) / (255 * 2)
        );

        // Update the glowing lens
        this.threeObject.lens.material.color.copy(displayColor);
        this.threeObject.lens.material.emissive.copy(displayColor);
        this.threeObject.lens.material.emissiveIntensity = this.intensity / 255;

        // NEW: Update the actual light rays hitting the floor
        this.spotLight.color.copy(displayColor);
        this.spotLight.intensity = (this.intensity / 255) * 15; // Multiply for Three.js brightness
    }

    getDmxValues() {
        const dmx = new Array(this.channels.length).fill(0);
        dmx[this.channelMap.red - 1] = this.color.r;
        dmx[this.channelMap.green - 1] = this.color.g;
        dmx[this.channelMap.blue - 1] = this.color.b;
        dmx[this.channelMap.white - 1] = this.color.w;
        dmx[this.channelMap.amber - 1] = this.color.a;
        dmx[this.channelMap.uv - 1] = this.color.uv;
        dmx[this.channelMap.intensity - 1] = this.intensity;
        return dmx;
    }

    getDmxValuesFromState(state) {
        const dmx = new Array(this.channels.length).fill(0);
        const { intensity, color } = state;

        if (color) {
            if (this.channelMap.red && color.r !== undefined) dmx[this.channelMap.red - 1] = color.r;
            if (this.channelMap.green && color.g !== undefined) dmx[this.channelMap.green - 1] = color.g;
            if (this.channelMap.blue && color.b !== undefined) dmx[this.channelMap.blue - 1] = color.b;
            if (this.channelMap.white && color.w !== undefined) dmx[this.channelMap.white - 1] = color.w;
            if (this.channelMap.amber && color.a !== undefined) dmx[this.channelMap.amber - 1] = color.a;
            if (this.channelMap.uv && color.uv !== undefined) dmx[this.channelMap.uv - 1] = color.uv;
        }

        if (this.channelMap.intensity && intensity !== undefined) {
            dmx[this.channelMap.intensity - 1] = intensity;
        }
        
        return dmx;
    }
}