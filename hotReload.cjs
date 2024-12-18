const { join } = require('path');

module.exports = function() {
    const env = process.env.NODE_ENV;
    if (env === 'development') { 
        try { 
            var folder = join(__dirname, 'website');
            require('electron-reload')(folder, {
                debug: true,     
            }); 
        } catch (error) {
            console.log(error);
        }
    }
}

