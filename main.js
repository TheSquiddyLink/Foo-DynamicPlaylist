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
function getPlaylist(req, res){
    const form = formidable({});
    form.parse(req, (err, fields, files) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Server Error');
            return
        }
        const playlist = fields.playlist[0];
            let fileData;
            try {
                fileData = fs.readFileSync(playlist, 'utf8');
            } catch (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File Not Found');
                return;
            }            
            console.log(fileData);
    })
}