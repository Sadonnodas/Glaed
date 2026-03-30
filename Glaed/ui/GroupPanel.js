class GroupPanel {
    constructor(container, patchEngine, groupManager) {
        this.container = container;
        this.patchEngine = patchEngine;
        this.groupManager = groupManager;
        this.selectedGroup = null;

        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="group-header"><h3>Groups</h3></div>
            <div class="group-create">
                <input id="group-name-input" placeholder="Group name" />
                <button id="group-create-btn">Create</button>
            </div>
            <div id="group-list" class="group-list"></div>
            <div id="group-members" class="group-members"></div>
        `;

        this.nameInput = this.container.querySelector('#group-name-input');
        this.groupListEl = this.container.querySelector('#group-list');
        this.groupMembersEl = this.container.querySelector('#group-members');

        this.container.querySelector('#group-create-btn').addEventListener('click', () => {
            const name = this.nameInput.value.trim();
            if (!name) return;
            this.groupManager.createGroup(name);
            this.nameInput.value = '';
            this.render();
        });

        this.render();
    }

    render() {
        const groups = this.groupManager.getAll();
        this.groupListEl.innerHTML = '';

        Object.keys(groups).forEach((groupName) => {
            const row = document.createElement('div');
            row.className = 'group-row';
            row.innerHTML = `<span>${groupName}</span><button data-group="${groupName}">Select</button>`;

            row.querySelector('button').addEventListener('click', () => {
                this.selectedGroup = groupName;
                this.render();
            });

            this.groupListEl.appendChild(row);
        });

        this.renderMembers();
    }

    renderMembers() {
        this.groupMembersEl.innerHTML = '';

        if (!this.selectedGroup) {
            this.groupMembersEl.innerHTML = '<p>Select a group to manage members.</p>';
            return;
        }

        const fixtureList = this.patchEngine.getAllFixtures();
        const current = this.groupManager.getGroup(this.selectedGroup);

        fixtureList.forEach((fixture) => {
            const line = document.createElement('div');
            line.className = 'group-member-line';
            const checked = current.includes(fixture.id) ? 'checked' : '';
            line.innerHTML = `
                <label>
                    <input type="checkbox" data-fixture-id="${fixture.id}" ${checked} /> ${fixture.name}
                </label>
            `;
            line.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.groupManager.addFixture(this.selectedGroup, fixture.id);
                } else {
                    this.groupManager.removeFixture(this.selectedGroup, fixture.id);
                }
                this.render();
            });
            this.groupMembersEl.appendChild(line);
        });
    }

    getSelectedGroup() {
        return this.selectedGroup;
    }
}
