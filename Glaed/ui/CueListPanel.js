class CueListPanel {
    constructor(container, cueList) {
        this.container = container;
        this.cueList = cueList;

        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="cue-panel-header">
                <h3>Cue List</h3>
                <div class="cue-panel-controls">
                    <button id="cue-back-btn">BACK</button>
                    <button id="cue-go-btn">GO</button>
                </div>
            </div>
            <div id="cue-items" class="cue-items"></div>
        `;

        this.listDiv = this.container.querySelector('#cue-items');

        this.container.querySelector('#cue-go-btn').addEventListener('click', () => {
            this.cueList.go();
            this.render();
        });

        this.container.querySelector('#cue-back-btn').addEventListener('click', () => {
            this.cueList.back();
            this.render();
        });

        this.cueList.on('cueChange', () => {
            this.render();
        });

        this.render();
    }

    render() {
        const cues = this.cueList.cues;
        const selectedIndex = this.cueList.currentIndex;

        this.listDiv.innerHTML = '';

        if (cues.length === 0) {
            this.listDiv.innerHTML = '<p>No cues available.</p>';
            return;
        }

        cues.forEach((cue, index) => {
            const isActive = index === selectedIndex;
            const row = document.createElement('div');
            row.className = `cue-item ${isActive ? 'active' : ''}`;
            row.style.cssText = 'padding:6px 8px; border-bottom:1px solid var(--border-dim); cursor:pointer;';

            const nameRow = document.createElement('div');
            nameRow.style.cssText = 'display:flex; align-items:center; gap:6px; margin-bottom:4px;';
            nameRow.innerHTML = `<span style="font-family:var(--font-mono); font-size:9px; color:var(--text-dim); flex-shrink:0;">${String(index + 1).padStart(3,'0')}</span>`;

            const nameInput = document.createElement('input');
            nameInput.value = cue.name || cue.id;
            nameInput.style.cssText = 'flex:1; margin:0; padding:2px 4px; font-size:11px; font-weight:bold; background:transparent; border:1px solid transparent; color:var(--text); cursor:pointer;';
            nameInput.addEventListener('focus', (e) => { e.target.style.background = 'var(--bg)'; e.target.style.borderColor = 'var(--border)'; e.target.style.cursor = 'text'; });
            nameInput.addEventListener('blur', (e) => { cue.name = e.target.value.trim() || cue.id; e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; e.target.style.cursor = 'pointer'; });
            nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); e.stopPropagation(); });
            nameInput.addEventListener('click', (e) => e.stopPropagation());
            nameRow.appendChild(nameInput);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '✕';
            deleteBtn.style.cssText = 'padding:2px 5px; font-size:9px; background:none; border:1px solid transparent; color:var(--text-dim); cursor:pointer; flex-shrink:0;';
            deleteBtn.addEventListener('mouseenter', () => { deleteBtn.style.color = '#f44'; deleteBtn.style.borderColor = '#f44'; });
            deleteBtn.addEventListener('mouseleave', () => { deleteBtn.style.color = 'var(--text-dim)'; deleteBtn.style.borderColor = 'transparent'; });
            deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); this.cueList.removeCue(cue.id); this.render(); });
            nameRow.appendChild(deleteBtn);
            row.appendChild(nameRow);

            const metaRow = document.createElement('div');
            metaRow.style.cssText = 'display:flex; gap:8px; align-items:center; flex-wrap:wrap;';

            const makeField = (label, key, step = 0.1) => {
                const wrap = document.createElement('label');
                wrap.style.cssText = 'display:flex; align-items:center; gap:3px; font-size:9px; color:var(--text-dim); font-family:var(--font-mono);';
                wrap.textContent = label + ' ';
                const inp = document.createElement('input');
                inp.type = 'number'; inp.step = step; inp.min = 0;
                inp.value = Number(cue[key] || 0).toFixed(1);
                inp.style.cssText = 'width:42px; margin:0; padding:2px 4px; font-size:9px; text-align:right;';
                inp.addEventListener('change', (e) => { cue[key] = Math.max(0, parseFloat(e.target.value) || 0); });
                inp.addEventListener('click', (e) => e.stopPropagation());
                inp.addEventListener('keydown', (e) => e.stopPropagation());
                wrap.appendChild(inp);
                return wrap;
            };

            metaRow.appendChild(makeField('Fade', 'fadeIn'));
            metaRow.appendChild(makeField('Delay', 'delay'));

            const followWrap = document.createElement('label');
            followWrap.style.cssText = 'display:flex; align-items:center; gap:3px; font-size:9px; color:var(--text-dim); font-family:var(--font-mono); cursor:pointer;';
            const followChk = document.createElement('input');
            followChk.type = 'checkbox'; followChk.checked = !!cue.follow;
            followChk.style.cssText = 'width:auto; margin:0;';
            followChk.addEventListener('change', (e) => { cue.follow = e.target.checked; this.render(); });
            followChk.addEventListener('click', (e) => e.stopPropagation());
            followWrap.appendChild(followChk);
            followWrap.append(' Follow');
            if (cue.follow) followWrap.appendChild(makeField(' @', 'followTime'));
            metaRow.appendChild(followWrap);

            row.appendChild(metaRow);

            row.addEventListener('click', () => {
                this.cueList.go(index);
                this.render();
            });
            this.listDiv.appendChild(row);
        });
    }
}
