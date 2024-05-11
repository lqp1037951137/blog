/**
 * 前端大文件分片上传服务端
 * form-data 方式上传
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const multer = require('multer');
const upload = multer({
    dest: 'uploads/'
});
const port = 3000;

//设置跨域访问
app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.static(path.join(__dirname, 'public')));

app.post('/upload', upload.single('shard'), (req, res) => {
    const { index, total, md5 } = req.body;
    const { file } = req;
    fs.renameSync(file.path, path.join('public/', index));


    res.end('ok');
});

app.post('/merge', (req, res) => {
    const chunkDir = path.join(__dirname, 'public', req.query.hash);
    const chunks = fs.readdirSync(chunkDir);
    chunks.sort((a, b) => parseInt(a) - parseInt(b)).map(chunkPath => {
        fs.appendFileSync(path.join(__dirname, 'public', 'result.mp4'), fs.readFileSync(path.join(chunkDir, chunkPath)));
        fs.unlinkSync(path.join(chunkDir, chunkPath));
    });
    fs.rmdirSync(chunkDir);
    res.end('ok');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
