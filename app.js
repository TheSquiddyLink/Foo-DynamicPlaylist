import { app, BrowserWindow, ipcMain, dialog } from 'electron/main'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url';
import { CHANNELS } from './website/script/electron.js';
import fs from 'fs';
import { parseFile } from 'music-metadata';
import NodeID3 from 'node-id3';
import hotReload from './hotReload.cjs';
import { shell } from 'electron';
import { exec } from 'child_process'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJSON = JSON.parse(fs.readFileSync(join(__dirname, 'package.json'), 'utf8'));
hotReload();


function checkFFmpeg(){
    return new Promise((resolve) => {
        exec('ffmpeg -version', (error, stdout, stderr) => {
            if (error) {
                dialog.showMessageBox(null, {
                    type: 'warning',
                    buttons: ['Cancel', 'Continue', 'Download'],
                    title: 'FFmpeg not found',
                    message: 'FFmpeg not found. Please install FFmpeg to be able use files other than mp3',
                    detail: 'Continuing will disable the ability to use files other than mp3',
                }).then((response) => {
                    if (response.response === 2) {
                        shell.openExternal('https://ffmpeg.org/download.html');
                    } else if (response.response === 1) {
                        resolve()
                    } else {
                        process.exit(0)
                    }
                });
                
            } else {
                console.log(`FFmpeg version: ${stdout}`);
                resolve()
            }
        });
    })
}

function createWindow () {
    var development = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      devTools: development,
    }
  })

    win.loadFile('website/index.html')
    if (development) {
        win.webContents.openDevTools()
    }
    // Set different CSP based on the environment
    const csp = process.env.NODE_ENV === 'development'
    ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; connect-src 'self'; img-src 'self' https://img.shields.io;"
    : "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; connect-src 'self'; img-src 'self' https://img.shields.io;";

    // Set the CSP header in the HTML or via webPreferences
    win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    details.responseHeaders['Content-Security-Policy'] = [csp];
        callback({ cancel: false, responseHeaders: details.responseHeaders });
    });

}

app.whenReady().then(async () => {
    await checkFFmpeg()
    createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on(CHANNELS.openLink.send, (event, arg) => {
    console.log("Opening link:", arg);
    const link = arg;
    if (link.startsWith("http")) {
        shell.openExternal(link);
    } else {
        console.log("Invalid link:", link);
    }
})

ipcMain.on(CHANNELS.promptFileInput.send, async (event, arg) => {
    console.log("Prompting file input");
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Playlist', extensions: ['m3u'] },
        ],
    });
    event.reply(CHANNELS.promptFileInput.reply, result.filePaths[0]);
})

ipcMain.on(CHANNELS.getPlaylist.send, async (event, arg) => {
    console.log("Getting playlist");
    const playlist = arg;
    await getPlaylist(playlist, event, false);
})

ipcMain.on(CHANNELS.getPlaylistHE.send, async (event, arg) => {
    console.log("Getting playlist");
    const playlist = arg;
    await getPlaylist(playlist, event, true);
})


ipcMain.on(CHANNELS.getSongData.send, async (event, arg) => {
    console.log("Getting song data");
    getSongDataIndex(event, arg);
})

ipcMain.on(CHANNELS.getTotal.send, async (event, arg) => {
    console.log("Getting total");
    
    if(!playlistData){
        console.error("Playlist not loaded");
        event.reply(CHANNELS.getTotal.reply, 0);
    }
    else if(!playlistData.files){
        console.log("No Playlist Files")
        event.reply(CHANNELS.getTotal.reply, 0);
    }
    else {
        event.reply(CHANNELS.getTotal.reply, playlistData.files.length);
    }
})
ipcMain.on(CHANNELS.playlistStatus.send, async (event, arg) => {
    console.log("Getting playlist status");
    const simplifiedPlaylistStatus = Object.assign({}, playlistStatus);
    delete simplifiedPlaylistStatus.toDefault;
    event.reply(CHANNELS.playlistStatus.reply, simplifiedPlaylistStatus);
})

ipcMain.on(CHANNELS.stopPlaylist.send, async () => {
    playlistStatus.toDefault();
})

ipcMain.on(CHANNELS.setSong.send, async (event, arg) => {
    console.log("Setting song");
    setSong(event, arg);
})


ipcMain.on(CHANNELS.getVersion.send, async (event) => {
    console.log("Getting version");
    event.reply(CHANNELS.getVersion.reply, packageJSON.version);
})

ipcMain.on(CHANNELS.getPlaylistJSON.send, async (event)=> {
    console.log("Getting playlist JSON");
    event.reply(CHANNELS.getPlaylistJSON.reply, JSON.stringify(playlistData, null, 4));
})

ipcMain.on(CHANNELS.exportData.send, (event) => {
    console.log("Exporting data");
    const playlistJSON = JSON.stringify(playlistData, null, 4);
    dialog.showSaveDialog({
        defaultPath: 'playlist.json',
        filters: [
            { name: 'JSON', extensions: ['json'] },
        ],
    }).then((result) => {
        if (result.filePath) {
            fs.writeFileSync(result.filePath, playlistJSON);
            console.log(`Playlist JSON exported to ${result.filePath}`);
        }
    })
})

ipcMain.on(CHANNELS.updateConfig.send, async (event, arg) => {
    console.log("Updating config");
    if(playlistData){
        playlistData.config = arg;
    }
})


ipcMain.on(CHANNELS.setFooLocation.send, async (event, arg) => {
    console.log("Setting foo location");
    dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Executable', extensions: ['exe'] },
        ],
    }).then((result) => {
        if (result.filePaths.length > 0) {
            const fooLocation = result.filePaths[0];
            event.reply(CHANNELS.setFooLocation.reply, fooLocation);
        }
    });
})


ipcMain.on(CHANNELS.bulkSetSongs.send, async (event, arg)=> {
    var songs = arg.songs;
    var data = arg.data;

    songs.forEach((index) => {
        var argument = {
            index: index,
            timeOfDay: data.timeOfDay,
            temp: data.temp,
            weather: data.weather
        }

        setSong(null, argument)
    });
})

function setSong(event, arg) {
    const index = arg.index;
    const song = playlistData.files[index];

    const timeOfDay = arg.timeOfDay;
    const temp = arg.temp;

    const weather = arg.weather;
    song.tags.setCustomTags(timeOfDay, temp);

    if(song.path.includes(".mp3")){
        NodeID3.update({
            TXXX: [
                //TODO: Change to class/object relation
                {
                    description: "SQUIBS_MORNING",
                    value: String(timeOfDay[0])
                },
                {
                    description: "SQUIBS_DAY",
                    value: String(timeOfDay[1])
                },
                {
                    description: "SQUIBS_NIGHT",
                    value: String(timeOfDay[2])
                },
                {
                    description: "SQUIBS_TEMP_HOT",
                    value: String(temp.hot)
                },
                {
                    description: "SQUIBS_TEMP_COLD",
                    value: String(temp.cold)
                },
                {
                    description: "SQUIBS_WEATHER_RAINY",
                    value: String(weather.raining)
                }
            ] 
            }, song.path);
        console.log(song);
    } else {
        console.log("Not an mp3 file");
    }
}

function getSongDataIndex(event,index){
    if(!playlistData){
        console.error("Playlist not loaded");
        event.reply(CHANNELS.getSongData.reply, "{}");
    }
    else if(!playlistData.files){
        console.log("No Playlist Files")
        event.reply(CHANNELS.getSongData.reply, "{}");
    }
    else if(Number(index) >= playlistData.files.length) {
        console.error("Index out of range");
        event.reply(CHANNELS.getSongData.reply, "{}");
    }
    else {
        console.log("Getting song data for index: " + index);
        var data = playlistData.files[Number(index)]
        playlistData.index = Number(index);
        event.reply(CHANNELS.getSongData.reply, data);
    }
}
async function getPlaylist(playlist, event, hideErrors){
    try {
        const data = fs.readFileSync(playlist, 'utf8');
        console.log(data);
        const rawData = formatPlaylistData(data, playlist);
        const allSongsData = await getAllSongData(rawData, hideErrors);
        playlistData = allSongsData;
        event.reply(CHANNELS.getPlaylist.reply, allSongsData);
    } catch (err) {
        console.log(err)
        event.reply(CHANNELS.getPlaylist.reply, err.message);
    }
}
function formatPlaylistData(data, path){
    return {
        folder: formatPlaylistPath(path),
        files: formatPath(data).split('\n').filter((item) => item !== "")
    }
}
/*
* 
* @param {string} pathStr 
* @returns {string}
*/
function formatPath(pathStr){
   pathStr = pathStr.replace(/\r/g, "").replace(/\\/g, "/");
   return pathStr;
}

function formatPlaylistPath(path){
    const result = path.split("\\");
    result.pop();
    return formatPath(result.join("\\"));
}

var playlistStatus = {
    status: "inactive",
    percentage: 0,
    total: 0,
    remaining: 0,
    elapsed: 0,
    failed: 0,
    finished: 0,
    toDefault: function () {
        this.status = "inactive";
        this.percentage = 0;
        this.total = 0;
        this.remaining = 0;
        this.elapsed = 0;
        this.failed = 0;
        this.finished = 0;
    }
};

var playlistData;

async function getAllSongData(playlist, hideErrors){
    if(playlistStatus.status == "processing") return;
    playlistStatus.toDefault();
    const result = {
        folder: playlist.folder,
        elapsed : 0,
        files: []
    }

    playlistStatus.status = "processing";
    playlistStatus.percentage = 0;

    const startTime = Date.now();
    var length = playlist.files.length;
    playlistStatus.total = length;
    playlistStatus.remaining = length;
    try {
        for(let i = 0; i < length; i++){
            if(playlistStatus.status != "processing") break;
            let song = await getSongData(getSongPath(playlist, i));
            if(!song){
                console.log("No Song")
            } else if(song.isValid){
                console.log("Song Valid")
                result.files.push(song);
            } else {
                console.log("Song Failed")
                playlistStatus.failed++;
                if(!hideErrors) result.files.push(song);
            }

            playlistStatus.percentage = (i + 1) / length * 100;
            console.log(playlistStatus.remaining);
            playlistStatus.remaining--;
            playlistStatus.finished++;
            playlistStatus.elapsed = Date.now() - startTime;
        }
        playlistStatus.status = "complete";
    } catch (err) {
        console.error("Error getting song data:", err);
        playlistStatus.toDefault();
        return;
    }
   
    const endTime = Date.now();
    const duration = endTime - startTime;
    result.elapsed = duration;
    playlistStatus.status = "complete";
    return result;
}

async function getSongData(songPath){
    if(!songPath) return;
    if(!songPath.includes(".mp3")) return Song.invalid(songPath, "Invalid file extension");
    try {
        const metadata = await parseFile(songPath);
        return Song.fromNodeID3(metadata, songPath);
    } catch (err) {
        console.error('Error:', err.message);
        return Song.invalid(songPath, "Unknown error");
    }
}

class Song {
    path = ""
    tags = new Tags();
    isValid = true;

    constructor(path, artist, album, title, morning=false, day=false, night=false, tempHot=false, tempCold=false, raining=false) {
        this.path = path;
        this.tags.artist = artist;
        this.tags.album = album;
        this.tags.title = title;
        this.tags.custom.timeOfDay = [morning, day, night];
        this.tags.custom.temp = {
            hot: tempHot,
            cold: tempCold
        };
        this.tags.custom.weather= {
            raining: raining
        
        }
        console.log(this)
    }

    static invalid(path, reason){
        const song = new Song(path, reason, path, "")
        song.isValid = false;
        return song;
    }
    static fromNodeID3(nodeID3, path) {
        const tags = nodeID3.common;

        const customTags = nodeID3.native["ID3v2.3"];
        console.log(customTags);
        const song = new Song(path, tags.artist, tags.album, tags.title, this.getCustomBoolTag(customTags,"MORNING") , this.getCustomBoolTag(customTags,"DAY"),this.getCustomBoolTag(customTags,"NIGHT"), this.getCustomBoolTag(customTags,"TEMP_HOT"),this.getCustomBoolTag(customTags,"TEMP_COLD"), this.getCustomBoolTag(customTags,"WEATHER_RAINY"));
        return song;
    }
    static getCustomBoolTag(native, id){
        return this.getCustomTag(native, id) === "true";
    }
    static getCustomTag(native, id){
        const tag = native.find(tag => tag.id === `TXXX:SQUIBS_${id}`)
        if(tag) return tag.value
        return null;
    }
}
class Tags {
    constructor() {
        this.artist = "";
        this.album = "";
        this.title = "";
        this.custom = {
            timeOfDay: [false, false, false, false],
            temp: {},
            weather: {}
        }
    }

    /**
     * @param {boolean[]} timeOfDay
     * @param {Number} temp
     */
    setCustomTags(timeOfDay, temp){
        this.custom.timeOfDay = timeOfDay;
        this.custom.temp = temp;
    }
}

/**
 * 
 * @param {PlaylistData} data 
 * @param {Number} i 
 * @returns {string}
 */
function getSongPath(data,i){
    if(data.files[i] == "") return null;
    return data.folder + "/" + data.files[i];
}
