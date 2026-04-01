class Programmer extends EventEmitter {
    constructor() {
        super();
        // Stores the active programmer values.
        // The key is the fixture ID, and the value is an object of parameters.
        // e.g., { 'fixture-123': { intensity: 255, pan: 128 } }
        this.activeValues = new Map();

        // A Map to store the original state of a fixture when it's first touched.
        // This is useful for "off" functionality, returning a fixture to its cue state.
        this.originalValues = new Map();
    }

    /**
     * Sets a parameter for a specific fixture.
     * @param {object} fixture - The fixture instance.
     * @param {string} param - The name of the parameter (e.g., 'intensity').
     * @param {*} value - The value of the parameter.
     */
    setValue(fixture, param, value) {
        if (!this.activeValues.has(fixture.id)) {
            this.activeValues.set(fixture.id, {});
            // Store original state the first time a fixture is modified
            this.originalValues.set(fixture.id, { [param]: fixture[param] });
        }

        const fixtureParams = this.activeValues.get(fixture.id);
        fixtureParams[param] = value;

        this.emit('update', fixture.id, this.getValuesForFixture(fixture.id));
    }

    /**
     * Gets the programmer values for a specific fixture.
     * @param {string} fixtureId - The ID of the fixture.
     * @returns {object|null} - The object of parameters, or null if none.
     */
    getValuesForFixture(fixtureId) {
        return this.activeValues.get(fixtureId) || null;
    }

    /**
     * Clears all values from the programmer.
     */
    clear() {
        const affectedFixtureIds = Array.from(this.activeValues.keys());
        this.activeValues.clear();
        this.originalValues.clear();
        console.log('Programmer cleared.');

        // Notify subscribers that these fixtures are no longer in the programmer
        affectedFixtureIds.forEach(id => this.emit('update', id, null));
    }

    /**
     * Clears only a specific fixture from the programmer.
     * @param {string} fixtureId - The ID of the fixture to clear.
     */
    clearFixture(fixtureId) {
        if (this.activeValues.has(fixtureId)) {
            this.activeValues.delete(fixtureId);
            this.originalValues.delete(fixtureId);
            this.emit('update', fixtureId, null);
        }
    }

    /**
     * Checks if a fixture has any active values in the programmer.
     * @param {string} fixtureId - The ID of the fixture.
     * @returns {boolean}
     */
    has(fixtureId) {
        return this.activeValues.has(fixtureId);
    }

    /**
     * Returns a merged state of the programmer and a base cue state.
     * Programmer values take precedence (LTP - Latest Takes Precedence).
     * @param {string} fixtureId - The fixture ID.
     * @param {object} baseState - The base state from a cue or other source.
     * @returns {object} - The final, merged state for the fixture.
     */
    getMergedState(fixtureId, baseState = {}) {
        const programmerState = this.getValuesForFixture(fixtureId);
        return { ...baseState, ...programmerState };
    }

    /**
     * Returns all fixture IDs currently in the programmer.
     * @returns {Array<string>}
     */
    getActiveFixtureIds() {
        return Array.from(this.activeValues.keys());
    }
}
