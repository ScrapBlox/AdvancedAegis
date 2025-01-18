const { Logger } = require('term-logger');

module.exports = (client) => {
    Logger.start(`${client.user.tag} is ready!`);
};
