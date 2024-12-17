import http, { get } from 'http';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable'
import { parseFile } from 'music-metadata'
import NodeID3 from 'node-id3';
import { spawn } from "child_process"

const folder =  "./website"

var playlistData;

const server = http.createServer((req, res) => {
    const filePath = path.join(folder, 'index.html');
    console.log(req.url);
    if(req.url == "/getPlaylist"){
        getPlaylist(req, res);
        return;
    }

    if(req.url == "/promptFileInput"){
        promptFileInput(req, res);
        return;
    }

    if(req.url == "/setSong"){
        setSong(req, res);
        return;
    }

    if(req.url == "/stopPlaylist"){
        stopPlaylist(req, res);
        return;
    }
    if(req.url == "/getTotal"){
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        if(!playlistData){
            res.end("0");
        }
        else if(playlistData.files){
            res.end(playlistData.files.length.toString());
        }else {
            res.end("0");
        }
        return;
    }

    if(req.url == "/playlistStatus"){
        getPlaylistStatus(req, res);
        return;
    }

    if(req.url.includes("/getSongData")){

        var index = req.url.split("-")[1];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if(!playlistData){
            console.error("Playlist not loaded");
            res.end("{}");
        }
        else if(Number(index) >= playlistData.files.length) {
            console.error("Index out of range");
            res.end("{}");
        }
        else {
            console.log("Getting song data for index: " + index);
            var data = playlistData.files[Number(index)]
        
            res.end(JSON.stringify(data));
        }
        return;
    }
    if(req.url.includes(".css") || req.url.includes(".js")){
        console.log(req.url);
        res.writeHead(200, { 'Content-Type': 'text/css' });
        res.end(fs.readFileSync(path.join(folder, req.url)));
        return;
    }
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Server Error');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

/**
 * 
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse<http.IncomingMessage>} res 
 */
async function getPlaylist(req, res) {
    try {
        const rawData = await getPlaylistData(req);
        console.log("Done");
        console.log(rawData);

        const allSongsData = await getAllSongData(rawData);
        playlistData = allSongsData;
        res.writeHead(200, { 'Content-Type': 'text/json' });
        res.end(JSON.stringify(allSongsData, null, 2));
    } catch (err) {
        console.error("Error:", err.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(err.message);
    }
}

async function getPlaylistData(req) {
    return new Promise((resolve, reject) => {
        const form = formidable({});
        form.parse(req, async (err, fields) => {
            if (err) {
                return reject(new Error("Error parsing form data"));
            }

            const playlist = fields.playlist[0]; 
            console.log(playlist);
            if (!playlist) {
                return reject(new Error("Playlist field is missing"));
            }

            try {
                const data = fs.readFileSync(playlist, 'utf8');
                resolve(formatPlaylistData(data, playlist));
            } catch (err) {
                reject(new Error("File not found or cannot be read" + err));
            }
        });
    });
}

/**
 * @typedef {{folder: string, files: string[]}} PlaylistData
 */

/**
 * 
 * @param {string} data 
 * @param {string} path 
 * @returns {PlaylistData}
 */
function formatPlaylistData(data, path){
    return {
        folder: formatPlaylistPath(path),
        files: formatPath(data).split('\n')
    }
}

/**
 * 
 * @param {string} path 
 * @returns {string}
 */
function formatPlaylistPath(path){
    const result = path.split("\\");
    result.pop();
    return formatPath(result.join("\\"));
}

/**
 * 
 * @param {string} pathStr 
 * @returns {string}
 */
function formatPath(pathStr){
    pathStr = pathStr.replace(/\r/g, "").replace(/\\/g, "/");
    return pathStr;
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

/**
 * 
 * @param {PlaylistData} playlist 
 */
async function getAllSongData(playlist){
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
            if(song){
                result.files.push(song);
            }else {
                console.log("Song Failed")
                playlistStatus.failed++;
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

function getPlaylistStatus(req, res) {
   res.writeHead(200, { 'Content-Type': 'text/json' });
   res.end(JSON.stringify(playlistStatus, null, 2));
}

function setSong(req, res) {
    const form = formidable({});
    form.parse(req, async (err, fields) => {
        if (err) {
            console.error("Error parsing form data:", err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end("Error parsing form data");
            return;
        }
        const index = fields.currentIndex[0];
        const song = playlistData.files[index];
        const timeOfDay = fields.timeOfDay;
        const temp = fields.temp[0];

        if(song.path.includes(".mp3")){
            NodeID3.update({
                TXXX: [
                    //TODO: Change to class/object relation
                    {
                        description: "SQUIBS_MORNING",
                        value: timeOfDay.includes("morning") ? "true" : "false"
                    },
                    {
                        description: "SQUIBS_DAY",
                        value: timeOfDay.includes("day") ? "true" : "false"
                    },
                    {
                        description: "SQUIBS_EVENING",
                        value: timeOfDay.includes("evening") ? "true" : "false"
                    },
                    {
                        description: "SQUIBS_NIGHT",
                        value: timeOfDay.includes("night") ? "true" : "false"
                    },
                    {
                        description: "SQUIBS_TEMP",
                        value: temp
                    }
                ] 
                }, song.path);
            console.log(song);
        } else {
            console.log("Not an mp3 file");
        }
       
    })
}

/**
 * 
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse<http.IncomingMessage>} res 
 */
function promptFileInput(req, res) {
    let psScript = fs.readFileSync("fileInput.ps1", "utf8");
    var child = spawn("powershell.exe", ["-Command", psScript]);
    child.stdout.on("data", (data) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(data);
        child.kill();
    });
}  


function stopPlaylist(req, res){
    console.log("Stopping playlist");
    playlistStatus.toDefault();
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end("Playlist Stopped");
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

class Song {
    path = ""
    tags = new Tags();

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
        return new Song(path, reason, path, "");
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