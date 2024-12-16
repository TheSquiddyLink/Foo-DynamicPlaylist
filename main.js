import http, { get } from 'http';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable'
import { parseFile } from 'music-metadata'

const folder =  "./website"

const server = http.createServer((req, res) => {
    const filePath = path.join(folder, 'index.html');
    console.log(req.url);
    if(req.url == "/getPlaylist"){
        getPlaylist(req, res);
        return;
    }

    if(req.url == "/playlistStatus"){
        getPlaylistStatus(req, res);
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
        const playlistData = await getPlaylistData(req);
        console.log("Done");
        console.log(playlistData);

        const allSongsData = await getAllSongData(playlistData);

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
    try {
        const metadata = await parseFile(songPath);
        return {
            title: metadata.common.title,
            artist: metadata.common.artist,
            album: metadata.common.album,
        }
    } catch (err) {
        console.error('Error:', err.message);
        return {
            title: "Unknown",
            artist: "Unknown",
            album: "Unknown",
            path: songPath
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
    for(let i = 0; i < length; i++){
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