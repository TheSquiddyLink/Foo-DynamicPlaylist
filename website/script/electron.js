export class Channel {
    constructor(sendChannel) {
        this.send = sendChannel;
        this.reply = `${sendChannel}-reply`;
    }
}

// Channels:
// [X] getPlaylist 
// [X] getPlaylistHE
// [X] promptFileInput
// [ ] setSong
// [ ] stopPlaylist
// [X] getTotal
// [ ] playlistStatus
// [X] getSongData

export const CHANNELS = {
    promptFileInput: new Channel('promptFileInput'),
    getPlaylist: new Channel('getPlaylist'),
    getPlaylistHE: new Channel('getPlaylistHE'),
    getSongData: new Channel('getSongData'),
    getTotal: new Channel('getTotal'),
};

/**
 * 
 * @param {Channel} channel 
 * @param {*} data 
 * @returns {Promise<*>}
 */
export function sendAndReceive(channel, data = null) {
    return new Promise((resolve, reject) => {
        try {
            window.electron.onceMessage(channel.reply, (event, arg) => {
                resolve(arg);
            });
            sendMessage(channel.send, data);
        } catch (error) {
            reject(error);
        }
    });
}


export function sendMessage(channel, data) {
    if (window.electron && window.electron.sendMessage) {
        window.electron.sendMessage(channel, data);
    } else {
        console.error(`sendMessage: Electron bridge is not defined.`);
    }
}

export function onMessage(channel, callback) {
    if (window.electron && window.electron.onMessage) {
        window.electron.onMessage(channel, callback);
    } else {
        console.error(`onMessage: Electron bridge is not defined.`);
    }
}
