class KindleAssistant {
    constructor(container, cueList, paletteManager, patchEngine) {
        // container is a hidden div; the actual UI lives in #kindle-panel (index.html)
        this.container = container;
        this.cueList = cueList;
        this.paletteManager = paletteManager;
        this.patchEngine = patchEngine;

        this._chat = document.getElementById('kindle-chat');
        this._input = document.getElementById('kindle-input');
        this._sendBtn = document.getElementById('kindle-send');
        this._closeBtn = document.getElementById('kindle-panel-close');
        this._panel = document.getElementById('kindle-panel');
        this._header = document.getElementById('kindle-panel-header');
        this._history = []; // multi-turn conversation messages

        if (!this._chat) return; // Panel not in DOM yet

        this._initDrag();
        this._initEvents();
    }

    _initEvents() {
        this._sendBtn.addEventListener('click', () => this._onSend());
        this._input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._onSend();
            }
        });
        if (this._closeBtn) {
            this._closeBtn.addEventListener('click', () => {
                this._panel.classList.remove('visible');
            });
        }

        // Clear history button
        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear';
        clearBtn.style.cssText = 'background:none; border:none; color:var(--text-dim); font-size:9px; cursor:pointer; padding:0 4px;';
        clearBtn.addEventListener('click', () => {
            this._history = [];
            this._chat.innerHTML = '';
        });
        const header = document.getElementById('kindle-panel-header');
        if (header) header.insertBefore(clearBtn, this._closeBtn);
    }

    _initDrag() {
        if (!this._header || !this._panel) return;
        let dragging = false, ox = 0, oy = 0, startLeft = 0, startBottom = 0;

        this._header.addEventListener('mousedown', (e) => {
            if (e.target.id === 'kindle-panel-close') return;
            dragging = true;
            const rect = this._panel.getBoundingClientRect();
            ox = e.clientX - rect.left;
            oy = e.clientY - rect.top;
            // Convert to left/top positioning
            this._panel.style.left   = rect.left + 'px';
            this._panel.style.top    = rect.top + 'px';
            this._panel.style.bottom = 'auto';
            this._panel.style.right  = 'auto';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            this._panel.style.left = (e.clientX - ox) + 'px';
            this._panel.style.top  = (e.clientY - oy) + 'px';
        });

        document.addEventListener('mouseup', () => { dragging = false; });
    }

    _getApiKey() {
        if (window.ANTHROPIC_KEY) return window.ANTHROPIC_KEY;
        const meta = document.querySelector('meta[name="anthropic-key"]');
        return meta ? meta.getAttribute('content') : null;
    }

    _addMessage(role, text) {
        const div = document.createElement('div');
        div.className = `kindle-msg ${role}`;
        div.textContent = text;
        this._chat.appendChild(div);
        this._chat.scrollTop = this._chat.scrollHeight;
        return div;
    }

    _addSpinner() {
        const div = document.createElement('div');
        div.className = 'kindle-spinner';
        div.textContent = '⟳ Generating…';
        this._chat.appendChild(div);
        this._chat.scrollTop = this._chat.scrollHeight;
        return div;
    }

    _addCuePreview(cue, spinnerEl) {
        if (spinnerEl) spinnerEl.remove();

        const div = document.createElement('div');
        div.className = 'kindle-msg assistant';
        div.innerHTML = `
            <strong>${cue.name}</strong><br>
            <span style="font-size:10px; color:var(--text-muted);">fadeIn ${cue.fadeIn}s · delay ${cue.delay || 0}s · ${Object.keys(cue.data || {}).length} fixtures</span>
            <div class="kindle-cue-actions">
                <button class="btn accent" style="font-size:10px; padding:4px 8px;" id="kindle-add-cue">+ Add to show</button>
                <button class="btn" style="font-size:10px; padding:4px 8px;" id="kindle-discard-cue">Discard</button>
            </div>
        `;
        this._chat.appendChild(div);
        this._chat.scrollTop = this._chat.scrollHeight;

        div.querySelector('#kindle-add-cue').addEventListener('click', () => {
            try {
                this.cueList.addCue(cue);
                div.querySelector('.kindle-cue-actions').innerHTML = '<span style="color:var(--accent); font-size:10px;">✓ Added to show</span>';
                // Re-render cue list panel if available
                if (window.glaed && window.glaed.panels && window.glaed.panels.cueList) {
                    window.glaed.panels.cueList.render();
                }
            } catch (e) {
                div.querySelector('.kindle-cue-actions').innerHTML = `<span style="color:#f44; font-size:10px;">Error: ${e.message}</span>`;
            }
        });

        div.querySelector('#kindle-discard-cue').addEventListener('click', () => {
            div.querySelector('.kindle-cue-actions').innerHTML = '<span style="color:var(--text-muted); font-size:10px;">Discarded</span>';
        });
    }

    async _onSend() {
        const prompt = this._input.value.trim();
        if (!prompt) return;

        const key = this._getApiKey();
        if (!key) {
            this._addMessage('assistant', 'No API key found. Set window.ANTHROPIC_KEY or add <meta name="anthropic-key" content="sk-ant-..."> to index.html.');
            return;
        }

        this._input.value = '';
        this._addMessage('user', prompt);
        this._history.push({ role: 'user', content: prompt });
        this._sendBtn.disabled = true;
        const spinner = this._addSpinner();

        try {
            const { cue, rawText } = await this._generate(key);
            this._history.push({ role: 'assistant', content: rawText });
            this._addCuePreview(cue, spinner);
        } catch (e) {
            if (spinner) spinner.remove();
            this._addMessage('assistant', `Error: ${e.message}`);
            this._history.push({ role: 'assistant', content: `Error: ${e.message}` });
        } finally {
            this._sendBtn.disabled = false;
        }
    }

    async _generate(apiKey) {
        const fixtures = (this.patchEngine ? this.patchEngine.getAllFixtures() : []).map(f => ({
            id: f.id, name: f.name, type: f.constructor.name,
            channels: Object.keys(f.channelMap || {})
        }));

        const palettes = (this.paletteManager ? this.paletteManager.getAllColorPalettes() : []).map(p => ({
            id: p.id, name: p.name, color: p.color
        }));

        const systemPrompt = `You are a lighting designer assistant for Glaed, a stage lighting app.
The user has these fixtures patched: ${JSON.stringify(fixtures)}.
Available color palettes: ${JSON.stringify(palettes)}.
Current cue count: ${this.cueList.cues.length}.

Generate a lighting cue as a JSON object matching this exact schema:
{
  "id": "cue-XXX",
  "name": "string",
  "fadeIn": number (seconds),
  "delay": number (seconds, usually 0),
  "follow": false,
  "data": {
    "<fixtureId>": { "intensity": 0-255, "color": { "r": 0-255, "g": 0-255, "b": 0-255 } }
  }
}

Only include fixtures from the provided list. Use real fixture IDs exactly as given.
If a matching color palette exists, use "colorPalette": "<paletteId>" instead of a raw color object.
Return ONLY the JSON object, no explanation, no markdown fences.`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1024,
                system: systemPrompt,
                messages: this._history
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`API error ${response.status}: ${err}`);
        }

        const data = await response.json();
        const rawText = data.content?.[0]?.text || '';
        const cue = JSON.parse(rawText.replace(/```json|```/g, '').trim());
        return { cue, rawText };
    }
}
