import { app, BrowserWindow, ipcMain, dialog } from 'electron/main'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url';
import { CHANNELS } from './website/script/electron.js';
import fs from 'fs';
import { parseFile } from 'music-metadata';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false
    }
  })

  win.loadFile('website/index.html')
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
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

    try {
        const data = fs.readFileSync(playlist, 'utf8');
        console.log(data);
        const playlistData = formatPlaylistData(data, playlist);
        const allSongsData = await getAllSongData(playlistData, false);
        event.reply(CHANNELS.getPlaylist.reply, allSongsData);
    } catch (err) {
        console.log(err)
        event.reply(CHANNELS.getPlaylist.reply, err.message);
    }
})

function formatPlaylistData(data, path){
    return {
        folder: formatPlaylistPath(path),
        files: formatPath(data).split('\n')
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
    toDefault: function () {
        this.status = "inactive";
        this.percentage = 0;
        this.total = 0;
        this.remaining = 0;
        this.elapsed = 0;
        this.failed = 0;
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
            playlistStatus.remaining--;
            playlistStatus.elapsed = Date.now() - startTime;
        }
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
        return Song.fromNodeID3(metadata);
    } catch (err) {
        console.error('Error:', err.message);
        return Song.invalid(songPath, "Unknown error");
    }
}

class Song {
    path = ""
    tags = new Tags();
    isValid = true;

    constructor(path, artist, album, title, morning=false, day=false, evening=false, night=false, temp=0) {
        this.path = path;
        this.tags.artist = artist;
        this.tags.album = album;
        this.tags.title = title;
        this.tags.custom.timeOfDay = [morning, day, evening, night];
        this.tags.custom.temp = temp;
        console.log(this)
    }

    static invalid(path, reason){
        const song = new Song(path, reason, path, "")
        song.isValid = false;
        return song;
    }
    static fromNodeID3(nodeID3) {
        const tags = nodeID3.common;

        const customTags = nodeID3.native["ID3v2.3"];
        console.log(customTags);
        const song = new Song(nodeID3.path, tags.artist, tags.album, tags.title, this.getCustomTag(customTags,"MORNING") , this.getCustomTag(customTags,"DAY"), this.getCustomTag(customTags,"EVENING"),this.getCustomTag(customTags,"NIGHT"), this.getCustomTag(customTags,"TEMP"));
        return song;
    }

    static getCustomTag(native, id){
        const tag = native.find(tag => tag.id === `TXXX:SQUIBS_${id}`)
        if(tag) return tag.value === "true";
        return false;
    }
}
class Tags {
    constructor() {
        this.artist = "";
        this.album = "";
        this.title = "";
        this.custom = {
            timeOfDay: [false, false, false, false],
            temp: 0
        }
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
