/**
 * 前端大文件分片上传服务端
 * form-data 方式上传
 */

const express = require('express');
const fs = require('fs');
const crypto = require('crypto');
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
    const { index, total, md5, fileMd5 } = req.body;
    const { file } = req;
    //创建public/fileMd5文件夹
    const chunkDir = path.join('public/', fileMd5);
    mkdirSync(chunkDir);
    fs.renameSync(file.path, path.join(chunkDir, index));
    //计算并校验分片md5
    let chunkMd5 = calculateFileMD5(path.join(chunkDir, index));
    if (chunkMd5 !== md5) {
        res.end('file is invalid');
    }
    res.end('ok');
});

app.post('/merge', (req, res) => {
    const { fileMd5, fileName } = req.query;
    const chunkDir = path.join(__dirname, 'public', fileMd5);
    const chunks = fs.readdirSync(chunkDir);
    chunks.sort((a, b) => parseInt(a) - parseInt(b)).map(chunkPath => {
        fs.appendFileSync(path.join(__dirname, 'public', fileName), fs.readFileSync(path.join(chunkDir, chunkPath)));
        fs.unlinkSync(path.join(chunkDir, chunkPath));
    });
    fs.rmdirSync(chunkDir);
    if (calculateFileMD5(path.join(__dirname, 'public', fileName)) === fileMd5) {
        res.end('ok');
    }else {
        res.end('file is invalid');
    }
});


//查询分片是否存在
app.get('/check', (req, res) => {
    const { md5, fileMd5, index } = req.query;
    const chunkDir = path.join(__dirname, 'public', fileMd5);
    const filePath = path.join(chunkDir, index);
    if (fs.existsSync(filePath)) {
        //计算并校验分片md5
        let chunkMd5 = calculateFileMD5(filePath);
        if (chunkMd5 === md5) {
            console.log('exist===', filePath);
            res.send({
                exist: true,
                code: 200
            })
        } else {
            res.send({
                exist: false,
                code: 200
            })
        }
    } else {
        res.send({
            exist: false,
            code: 200
        })
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});


function calculateFileMD5(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('md5');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

//没有就创建文件夹
function mkdirSync(dirname) {
    if (fs.existsSync(dirname)) {
        return true;
    } else {
        if (mkdirSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
        }
    }
}