var path = require('path');
var express = require('express');
var app = express();
var multer  = require('multer');
var mime = require('mime-types');
var crypto = require('crypto');
var fs = require('fs');
var swig = require('swig');
var consolidate = require('consolidate');

var port = 8000;

var rootUrl = 'https://0x1.host/';
var maxFileSize = 256 * 1024 * 1024;
var doNotAllow = ['application/x-dosexec', 'application/x-msdos-program'];

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'uploads')
	},
	filename: function (req, file, cb) {
		var mimeType = mime.lookup(file.originalname);
		var hInfo = file.originalname + mimeType + file.size;
		var hName = crypto.createHmac('sha256', hInfo).digest('hex').substring(0, 8);
		cb(null, hName + '.' + mime.extension(mimeType));
	}
});

function fileFilter(req, file, cb) {
	var mimeType = mime.lookup(file.originalname);
	if (doNotAllow.indexOf(mimeType) != -1) {
		cb(null, false);
	}
	else {
  		cb(null, true);
  	}
}

var upload = multer({ limits: { fileSize: maxFileSize }, storage: storage, fileFilter: fileFilter });

app.use(express.urlencoded());
app.set('views', __dirname + '/public');
app.set('view engine', 'ejs');
app.engine('html', consolidate.swig);

app.get('/', (req, res) => {
	res.render('index.html', { url: rootUrl, maxFileSize: maxFileSize / (1024 * 1024), doNotAllow: doNotAllow });
});

app.post('/', upload.single('file'), (req, res) => {
	if (req.file) {
		res.send(rootUrl + req.file.filename + '\n');
	}
	else {
		res.sendStatus(400);
	}
});

app.get('/:fileId', (req, res) => {
	var fileToSend = path.join(__dirname, '/uploads', req.params.fileId);
	if (fs.existsSync(fileToSend)) {
    	res.sendFile(fileToSend);
	}
	else {
		res.sendStatus(404);
	}
});

app.listen(port, () => { console.log('listening on port ' + port) });