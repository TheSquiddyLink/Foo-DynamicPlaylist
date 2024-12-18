export class Channel {
    constructor(sendChannel) {
        this.send = sendChannel;
        this.reply = `${sendChannel}-reply`;
    }
}

// Channels:
// [X] getPlaylist 
// [ ] getPlaylistHE
// [X] promptFileInput
// [ ] setSong
// [ ] stopPlaylist
// [ ] getTotal
// [ ] playlistStatus
// [ ] getSongData

export const CHANNELS = {
    promptFileInput: new Channel('promptFileInput'),
    getPlaylist: new Channel('getPlaylist'),
    getPlaylistHE: new Channel('getPlaylistHE'),
};

export function sendMessage(channel, data) {
   window.electron.sendMessage(channel, data);
}
export function onMessage(channel, callback) {
   window.electron.onMessage(channel, callback);
}
