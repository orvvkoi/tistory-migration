const path = require('path');

const paths = {
    // Config files
    config: path.join(__dirname, '../config'),

    // server build files
    build: path.join(__dirname, '../build'),

    // Static files that get copied to build folder
    public: path.join(__dirname, '../public')
};

module.exports = paths;