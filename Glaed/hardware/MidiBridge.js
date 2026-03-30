class MidiBridge {
    constructor(onTimecode) {
        this.onTimecode = onTimecode;
        this.midiAccess = null;
        this.input = null;
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
        const [status, data1, data2] = message.data;

        // MTC Quarter Frame messages (0xF1)
        if (status === 0xF1) {
            // Basic MTC parsing (simplified)
            // In real implementation, accumulate frames to build timecode
            const frame = data1 & 0x0F;
            const seconds = (data1 >> 4) & 0x03;
            const minutes = data2 & 0x3F;
            const hours = (data2 >> 6) & 0x1F;

            if (this.onTimecode) {
                this.onTimecode({ hours, minutes, seconds, frames: frame });
            }
        }
    }
}