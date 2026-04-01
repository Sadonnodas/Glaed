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

    getGroupsForFixture(fixtureId) {
        return Object.entries(this.groups)
            .filter(([, ids]) => ids.includes(fixtureId))
            .map(([name]) => name);
    }

    getGroupColor(groupName) {
        const COLORS = [0xff4466, 0x44aaff, 0x44ff88, 0xffcc22, 0xcc44ff, 0xff8833, 0x22ffdd, 0xff22cc];
        const idx = Object.keys(this.groups).indexOf(groupName);
        return idx >= 0 ? COLORS[idx % COLORS.length] : 0xffffff;
    }
}
