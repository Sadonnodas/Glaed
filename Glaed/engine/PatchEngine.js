
class PatchEngine {
    constructor() {
        this.fixtures = [];
        this.universes = {}; // Keyed by universe number
    }

    /**
     * Patches a fixture to a specific universe and address.
     * @param {object} fixture - The fixture instance to patch.
     * @param {number} universe - The Art-Net universe number (0-15).
     * @param {number} address - The DMX start address (1-512).
     */
    patchFixture(fixture, universe, address) {
        if (address < 1 || address > 512) {
            throw new Error(`Invalid DMX address: ${address}. Must be between 1 and 512.`);
        }

        const channelCount = fixture.channels ? fixture.channels.length : 1;
        const endAddress = address + channelCount - 1;

        if (endAddress > 512) {
            throw new Error(`Fixture ${fixture.name} exceeds universe range: ${endAddress} > 512.`);
        }

        // collision check inside the same universe
        const existing = this.getFixturesByUniverse(universe);
        for (const fx of existing) {
            const fxStart = fx.address;
            const fxCount = fx.channels ? fx.channels.length : 1;
            const fxEnd = fxStart + fxCount - 1;

            if (address <= fxEnd && endAddress >= fxStart) {
                throw new Error(`DMX overlap: ${fixture.name} (${address}-${endAddress}) overlaps ${fx.name} (${fxStart}-${fxEnd}) in universe ${universe}.`);
            }
        }

        fixture.universe = universe;
        fixture.address = address;

        this.fixtures.push(fixture);

        if (!this.universes[universe]) {
            this.universes[universe] = new Array(512).fill(0);
        }

        console.log(`Patched ${fixture.name} to Universe ${universe}, Address ${address} (channels ${channelCount})`);
    }

    /**
     * Removes a fixture from the patch.
     * @param {object} fixture - The fixture instance to unpatch.
     */
    unpatchFixture(fixture) {
        const index = this.fixtures.indexOf(fixture);
        if (index > -1) {
            this.fixtures.splice(index, 1);
            fixture.universe = null;
            fixture.address = null;
            console.log(`Unpatched ${fixture.name}`);
        }
    }

    /**
     * Gets all fixtures patched to a specific universe.
     * @param {number} universe - The universe number.
     * @returns {Array<object>} - An array of fixture instances.
     */
    getFixturesByUniverse(universe) {
        return this.fixtures.filter(f => f.universe === universe);
    }

    /**
     * Returns the DMX buffer for a given universe.
     * @param {number} universe - The universe number.
     * @returns {Array<number>} - The 512-channel DMX data array.
     */
    getUniverseData(universe) {
        return this.universes[universe] || new Array(512).fill(0);
    }

    /**
     * Updates the DMX buffer for a given universe with the current state of its fixtures.
     * This is a simplified example. In a real scenario, this would be called
     * by the FadeEngine or Programmer to update the DMX state.
     */
    updateUniverse(universe) {
        if (!this.universes[universe]) return;

        // Reset the universe data
        this.universes[universe].fill(0);

        for (const fixture of this.getFixturesByUniverse(universe)) {
            const fixtureDmx = fixture.getDmxValues(); // Assume fixture has this method
            for (let i = 0; i < fixtureDmx.length; i++) {
                const channelIndex = fixture.address - 1 + i;
                if (channelIndex < 512) {
                    this.universes[universe][channelIndex] = fixtureDmx[i];
                }
            }
        }
    }

    getAllFixtures() {
        return this.fixtures;
    }
}
