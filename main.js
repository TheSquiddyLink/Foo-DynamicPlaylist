import http, { get } from 'http';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable'
import { parseFile } from 'music-metadata'

const folder =  "./website"

const server = http.createServer((req, res) => {
    const filePath = path.join(folder, 'index.html');

    if(req.url == "/getPlaylist"){
        getPlaylist(req, res);
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

        console.log(await getSongData(getSongPath(playlistData, 0)));

        res.writeHead(200, { 'Content-Type': 'text/json' });
        res.end(JSON.stringify(playlistData, null, 2));
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
    try {
        const metadata = await parseFile(songPath);
        console.log('Title:', metadata.common.title);
        console.log('Artist:', metadata.common.artist);
        console.log('Album:', metadata.common.album);
        console.log('Genre:', metadata.common.genre);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

/**
 * 
 * @param {PlaylistData} data 
 * @param {Number} i 
 * @returns {string}
 */
function getSongPath(data,i){
    return data.folder + "/" + data.files[i];
}