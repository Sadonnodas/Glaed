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

    static applyToFixture(fixture, parsedProfile) {
        if (!fixture || !parsedProfile) {
            throw new Error('Invalid fixture or profile');
        }

        fixture.channels = parsedProfile.channels || fixture.channels;
        fixture.channelMap = parsedProfile.channelMap || fixture.channelMap;

        if (parsedProfile.name) fixture.name = parsedProfile.name;
        if (parsedProfile.manufacturer) fixture.manufacturer = parsedProfile.manufacturer;
    }
}
