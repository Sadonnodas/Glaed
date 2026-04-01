class ProfileParser {
    static parse(profile) {
        if (!profile || !profile.modes || !Array.isArray(profile.modes) || profile.modes.length === 0) {
            throw new Error('Invalid fixture profile');
        }

        const mode = profile.modes[0];
        const channels = mode.channels || [];

        const parsed = {
            name: profile.name || 'Unnamed Fixture',
            manufacturer: profile.manufacturer || 'Generic',
            channels,
            channelMap: {}
        };

        channels.forEach(channel => {
            const type = channel.type;
            if (!type) return;

            let mapKey = null;
            switch (type) {
                case 'intensity': mapKey = 'intensity'; break;
                case 'red': mapKey = 'red'; break;
                case 'green': mapKey = 'green'; break;
                case 'blue': mapKey = 'blue'; break;
                case 'white': mapKey = 'white'; break;
                case 'amber': mapKey = 'amber'; break;
                case 'uv': mapKey = 'uv'; break;
                case 'pan': mapKey = 'pan'; break;
                case 'tilt': mapKey = 'tilt'; break;
                default: mapKey = channel.name || type;
            }

            if (channel.offset !== undefined) {
                parsed.channelMap[mapKey] = channel.offset + 1; // 1-based
            }
        });

        return parsed;
    }

    static applyToFixture(fixture, parsed) {
        fixture.channels   = parsed.channels;
        fixture.channelMap = parsed.channelMap;
        if (parsed.name)         fixture.name         = parsed.name;
        if (parsed.manufacturer) fixture.manufacturer = parsed.manufacturer;
    }

    static parseGDTF(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

        const fixtureType = xmlDoc.querySelector('FixtureType');
        if (!fixtureType) throw new Error('Invalid GDTF: no FixtureType');

        const name = fixtureType.getAttribute('Name') || 'Unnamed';
        const manufacturer = fixtureType.getAttribute('Manufacturer') || 'Generic';

        const dmxModes = xmlDoc.querySelectorAll('DMXMode');
        if (dmxModes.length === 0) throw new Error('No DMX modes found');

        const mode = dmxModes[0]; // Take first mode
        const modeName = mode.getAttribute('Name') || 'Default';

        const channels = [];
        const channelMap = {};

        const dmxChannels = mode.querySelectorAll('DMXChannel');
        dmxChannels.forEach((ch, index) => {
            const chName = ch.getAttribute('Name') || `Ch${index}`;
            const geometry = ch.getAttribute('Geometry') || '';
            const offset = parseInt(ch.getAttribute('DMXBreak') || '0', 10) + index; // Simplified

            let type = 'unknown';
            // Basic type detection from name or LogicalChannel
            if (chName.toLowerCase().includes('dimmer') || chName.toLowerCase().includes('intensity')) type = 'intensity';
            else if (chName.toLowerCase().includes('red')) type = 'red';
            else if (chName.toLowerCase().includes('green')) type = 'green';
            else if (chName.toLowerCase().includes('blue')) type = 'blue';
            else if (chName.toLowerCase().includes('white')) type = 'white';
            else if (chName.toLowerCase().includes('amber')) type = 'amber';
            else if (chName.toLowerCase().includes('uv')) type = 'uv';
            else if (chName.toLowerCase().includes('pan')) type = 'pan';
            else if (chName.toLowerCase().includes('tilt')) type = 'tilt';

            channels.push({ offset, name: chName, type });
            channelMap[type] = offset + 1; // 1-based
        });

        return {
            name,
            manufacturer,
            modes: [{ name: modeName, channels }],
            channels,
            channelMap
        };
    }
}
