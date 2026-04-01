class MidiBridge {
    constructor(onTimecode) {
        this.onTimecode = onTimecode;
        this.midiAccess = null;
        this.input = null;

        // MTC quarter-frame accumulator
        this._mtcNibbles = new Array(8).fill(0);
        this._mtcCount   = 0;
    }

    async connect() {
        if (!navigator.requestMIDIAccess) {
            console.error('Web MIDI API not supported');
            return false;
        }

        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            const inputs = Array.from(this.midiAccess.inputs.values());
            if (inputs.length === 0) {
                console.error('No MIDI inputs found');
                return false;
            }

            this.input = inputs[0]; // Use first input
            this.input.onmidimessage = this.handleMidiMessage.bind(this);
            console.log('MIDI connected:', this.input.name);
            return true;
        } catch (err) {
            console.error('MIDI access failed:', err);
            return false;
        }
    }

    disconnect() {
        if (this.input) {
            this.input.onmidimessage = null;
            this.input = null;
        }
    }

    handleMidiMessage(message) {
        const [status, data1] = message.data;

        // MTC Quarter Frame messages (0xF1) — accumulate 8 nibbles to form full timecode
        if (status === 0xF1) {
            const piece = data1 & 0x0f;
            const type  = (data1 >> 4) & 0x07;
            this._mtcNibbles[type] = piece;
            this._mtcCount++;
            if (this._mtcCount >= 8) {
                this._mtcCount = 0;
                const n = this._mtcNibbles;
                const frames  = n[0] | (n[1] << 4);
                const seconds = n[2] | (n[3] << 4);
                const minutes = n[4] | (n[5] << 4);
                const hours   = n[6] | ((n[7] & 0x01) << 4);
                if (this.onTimecode) {
                    this.onTimecode({
                        hours, minutes, seconds, frames,
                        totalSeconds: hours * 3600 + minutes * 60 + seconds + frames / 30
                    });
                }
            }
        }
    }
}
