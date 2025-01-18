const fs = require('fs');
const path = require('path'); // For resolving paths reliably
const { Logger } = require('term-logger');

module.exports = (client) => {
    const eventsPath = path.resolve(__dirname, 'events'); // Path to the events folder

    // Read the events folder
    fs.readdir(eventsPath, (err, files) => {
        if (err) {
            return Logger.error(`Error reading events folder: ${err.message}`);
        }

        // Filter JavaScript files
        const eventFiles = files.filter((file) => file.endsWith('.js'));

        // Log if no events are found
        if (eventFiles.length === 0) {
            Logger.warn('No events found in the events folder.');
            return;
        }

        // Register each event
        eventFiles.forEach((file) => {
            const eventName = file.split('.')[0];
            const eventPath = path.join(eventsPath, file);

            try {
                const event = require(eventPath);

                if (typeof event !== 'function') {
                    Logger.warn(`Event file ${file} does not export a valid function.`);
                    return;
                }

                client.on(eventName, event.bind(null, client));
                Logger.success(`Successfully registered event: ${eventName}`);
            } catch (err) {
                Logger.error(`Failed to load event ${file}: ${err.message}`);
            }
        });
    });
};