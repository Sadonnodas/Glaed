class GroupPanel {
    constructor(container, patchEngine, groupManager, app) {
        this.container = container;
        this.patchEngine = patchEngine;
        this.groupManager = groupManager;
        this.app = app;
        this.selectedGroup = null;

        this.init();
    }

    init() {
        this.container.innerHTML = `
            <style>
                .group-container { display: flex; gap: 12px; height: 350px; }
                .group-list-box { flex: 1; border: 1px solid var(--border); background: var(--bg); overflow-y: auto; }
                .group-member-box { flex: 2; border: 1px solid var(--border); background: var(--bg); overflow-y: auto; }
                .group-item { padding: 8px; border-bottom: 1px solid var(--border-dim); cursor: pointer; color: var(--text-muted); font-size: 11px; display: flex; justify-content: space-between; align-items: center;}
                .group-item.active { background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); border-left: 3px solid var(--accent); }
            </style>

            <div class="fixture-header"><h3>Groups</h3></div>
            <div style="display:flex; gap:6px; margin-bottom:12px;">
                <input id="group-name-input" placeholder="New Group Name" style="flex:2;" />
                <button id="group-create-btn" class="btn" style="flex:1;">Create</button>
            </div>

            <div class="group-container">
                <div class="group-list-box" id="group-list"></div>
                <div class="group-member-box">
                    <div style="padding: 8px; background: var(--bg-card); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight:bold; font-size:11px;" id="current-group-label">No Group Selected</span>
                        <button id="btn-inspect-group" class="btn btn-go" style="padding:4px 8px; font-size:9px; display:none;">Inspect Group</button>
                    </div>
                    <table class="patch-table" style="margin:0; border:none;">
                        <tbody id="group-members"></tbody>
                    </table>
                </div>
            </div>
        `;

        this.nameInput = this.container.querySelector('#group-name-input');
        this.groupListEl = this.container.querySelector('#group-list');
        this.groupMembersEl = this.container.querySelector('#group-members');
        this.inspectBtn = this.container.querySelector('#btn-inspect-group');
        this.labelEl = this.container.querySelector('#current-group-label');

        this.container.querySelector('#group-create-btn').addEventListener('click', () => {
            const name = this.nameInput.value.trim();
            if (!name) return;
            this.groupManager.createGroup(name);
            this.selectedGroup = name;
            this.nameInput.value = '';
            this.render();
        });

        this.inspectBtn.addEventListener('click', () => {
            if (!this.selectedGroup) return;
            const ids = this.groupManager.getGroup(this.selectedGroup);
            const fixtures = this.patchEngine.getAllFixtures().filter(f => ids.includes(f.id));
            
            // Pass the array of fixtures to the Inspector
            this.app.panels.inspector.selectFixture(fixtures);
            document.querySelector('.tab-btn[data-tab="inspector"]').click();
        });

        this.render();
    }

    render() {
        const groups = this.groupManager.getAll();
        this.groupListEl.innerHTML = '';

        if (Object.keys(groups).length === 0) {
            this.groupListEl.innerHTML = '<div style="padding:8px; text-align:center; color:var(--text-dim); font-size:10px;">No groups</div>';
        }

        Object.entries(groups).forEach(([groupName, members]) => {
            const row = document.createElement('div');
            row.className = `group-item ${this.selectedGroup === groupName ? 'active' : ''}`;
            row.innerHTML = `<span>${groupName}</span> <span style="font-size:9px;">${members.length} fix</span>`;
            row.addEventListener('click', () => {
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
            this.labelEl.textContent = 'No Group Selected';
            this.inspectBtn.style.display = 'none';
            this.groupMembersEl.innerHTML = '<tr><td style="text-align:center; padding:10px;">Select a group on the left.</td></tr>';
            return;
        }

        this.labelEl.textContent = this.selectedGroup;
        this.inspectBtn.style.display = 'block';

        const fixtureList = this.patchEngine.getAllFixtures();
        const currentIds = this.groupManager.getGroup(this.selectedGroup);

        fixtureList.forEach((fixture) => {
            const row = document.createElement('tr');
            const isChecked = currentIds.includes(fixture.id);
            
            row.innerHTML = `
                <td style="width:30px;"><input type="checkbox" ${isChecked ? 'checked' : ''} /></td>
                <td style="font-weight:bold; color:${isChecked ? 'var(--text)' : 'var(--text-dim)'};">${fixture.name}</td>
                <td style="color:var(--text-dim); font-family:var(--font-mono);">${fixture.universe}.${fixture.address}</td>
            `;
            
            row.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) this.groupManager.addFixture(this.selectedGroup, fixture.id);
                else this.groupManager.removeFixture(this.selectedGroup, fixture.id);
                this.render(); // Re-render to update counts and styles
            });
            this.groupMembersEl.appendChild(row);
        });
    }
}