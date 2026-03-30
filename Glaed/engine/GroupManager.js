class GroupManager {
    constructor() {
        this.groups = {}; // groupName -> array of fixture ids
    }

    createGroup(name, fixtureIds = []) {
        if (!name) throw new Error('Group name required');
        this.groups[name] = Array.from(new Set(fixtureIds));
    }

    deleteGroup(name) {
        delete this.groups[name];
    }

    addFixture(name, fixtureId) {
        if (!this.groups[name]) this.groups[name] = [];
        this.groups[name] = Array.from(new Set([...this.groups[name], fixtureId]));
    }

    removeFixture(name, fixtureId) {
        if (!this.groups[name]) return;
        this.groups[name] = this.groups[name].filter(id => id !== fixtureId);
    }

    getGroup(name) {
        return this.groups[name] || [];
    }

    getAll() {
        return { ...this.groups };
    }
}
