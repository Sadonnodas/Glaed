
class _BaseFixture {
    constructor(options = {}) {
        this.id = options.id || `fixture-${Date.now()}`;
        this.name = options.name || 'New Fixture';
        this.manufacturer = options.manufacturer || 'Generic';
        
        // DMX Patching
        this.universe = null;
        this.address = null; // 1-512

        // 3D Representation
        this.threeObject = null;

        // Core Parameters
        this.intensity = 0; // 0-255
        this.color = { r: 255, g: 255, b: 255 }; // HSI is better, but start with RGB
        
        // The DMX channel layout for this fixture.
        // This should be populated by a ProfileParser based on a fixture definition file.
        this.channels = []; 
        this.channelMap = {}; // e.g., { intensity: 1, red: 2, ... }
    }

    /**
     * Should be implemented by subclasses to create the Three.js object.
     */
    createThreeObject() {
        // Example: A simple box
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.threeObject = new THREE.Mesh(geometry, material);
        this.threeObject.userData.fixture = this; // Link back to this fixture instance
        return this.threeObject;
    }

    /**
     * Updates the Three.js object's appearance based on fixture state.
     */
    updateThreeObject() {
        if (!this.threeObject) return;

        // Example: Update material color based on intensity and color
        const emissiveColor = new THREE.Color(
            this.color.r / 255,
            this.color.g / 255,
            this.color.b / 255
        );
        this.threeObject.material.emissive.copy(emissiveColor);
        this.threeObject.material.color.copy(emissiveColor); // Use emissive for self-illumination
        this.threeObject.material.opacity = this.intensity / 255;
    }


    /**
     * Set a parameter by its logical name (e.g., 'intensity', 'pan').
     * @param {string} param - The parameter name.
     * @param {number} value - The value (typically 0-255).
     */
    setParameter(param, value) {
        if (param in this) {
            this[param] = value;
        }
        // In a more complex system, this would trigger updates.
        this.updateThreeObject();
    }

    /**
     * Generates the DMX byte array for this fixture based on its current state.
     * This is a crucial method. It translates the fixture's high-level
     * properties (like `intensity`, `color`) into raw DMX values.
     * The `channelMap` and `channels` from the profile are used here.
     * 
     * @returns {Array<number>} An array of DMX values.
     */
    getDmxValues() {
        // This is a placeholder. The actual implementation will depend on the
        // fixture's specific channel layout defined in its profile.
        const dmx = new Array(this.channels.length).fill(0);
        
        if (this.channelMap.intensity) {
            dmx[this.channelMap.intensity - 1] = this.intensity;
        }
        if (this.channelMap.red) {
            dmx[this.channelMap.red - 1] = this.color.r;
        }
        if (this.channelMap.green) {
            dmx[this.channelMap.green - 1] = this.color.g;
        }
        if (this.channelMap.blue) {
            dmx[this.channelMap.blue - 1] = this.color.b;
        }

        return dmx;
    }
    
    /**
     * Generates the DMX byte array for this fixture based on a given state object.
     * This is used by the Programmer to get DMX values without altering the fixture's own state.
     * @param {object} state - A state object with properties like 'intensity' and 'color'.
     * @returns {Array<number>} An array of DMX values.
     */
    getDmxValuesFromState(state) {
        const dmx = new Array(this.channels.length).fill(0);

        if (this.channelMap.intensity && state.intensity !== undefined) {
            dmx[this.channelMap.intensity - 1] = state.intensity;
        }
        if (this.channelMap.red && state.color && state.color.r !== undefined) {
            dmx[this.channelMap.red - 1] = state.color.r;
        }
        if (this.channelMap.green && state.color && state.color.g !== undefined) {
            dmx[this.channelMap.green - 1] = state.color.g;
        }
        if (this.channelMap.blue && state.color && state.color.b !== undefined) {
            dmx[this.channelMap.blue - 1] = state.color.b;
        }
        
        return dmx;
    }

    get numChannels() {
        return this.channels.length;
    }
}
