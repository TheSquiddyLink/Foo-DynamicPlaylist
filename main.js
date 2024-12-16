import http, { get } from 'http';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable'

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

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(playlistData);
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
                resolve(data);
            } catch (err) {
                reject(new Error("File not found or cannot be read"));
            }
        });
    });
}