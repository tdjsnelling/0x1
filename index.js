var path = require('path');
var express = require('express');
var app = express();
var multer  = require('multer');
var mime = require('mime-types');
var crypto = require('crypto');
var fs = require('fs');
var swig = require('swig');
var consolidate = require('consolidate');
var mongoose = require('mongoose');

var config = require('./config');

var port = config.port;
var rootUrl = config.rootUrl;
var uploadPath = config.uploadPath;
var maxFileSize = config.maxFileSize;
var doNotAllow = config.doNotAllow;
var filePersistence = config.filePersistence;
var abuseEmail = config.abuseEmail;

mongoose.connect('mongodb://localhost/uploads', { promiseLibrary: global.Promise });

var uploadRecord = mongoose.model('upload', {
	ip: String,
	originalFilename: String,
	filename: String,
	timestamp: Number
});

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadPath)
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
var uploadFunc = upload.single('file');

app.use(express.urlencoded({ extended: true }));
app.set('views', __dirname + '/public');
app.set('view engine', 'ejs');
app.engine('html', consolidate.swig);

app.get('/', (req, res) => {
	res.render('index.html', { url: rootUrl, maxFileSize: maxFileSize / (1024 * 1024), doNotAllow: doNotAllow, filePersistence: filePersistence, abuseEmail: abuseEmail });
});

app.post('/', (req, res) => {
	uploadFunc(req, res, (err) => {
		if (err) {
			if (err.code == 'LIMIT_FILE_SIZE') {
				res.sendStatus(413);
			}
			else {
				res.sendStatus(400);
			}
			return;
		}

		if (req.file) {
			var ip = req.ip;
			if (ip.substr(0, 7) == '::ffff:') {
				ip = ip.substr(7)
			}

			var newUploadRecord = new uploadRecord({
				ip: ip,
				originalFilename: req.file.originalname,
				filename: req.file.filename,
				timestamp: + new Date()
			});

			newUploadRecord.save((err) => {
				if (err) {
					console.error(err);
					res.sendStatus(500);
				}
				else {
					res.send(rootUrl + req.file.filename + '\n');
				}
			});
		}
		else {
			res.sendStatus(400);
		}
	});
});

app.get('/:fileId', (req, res) => {
	var fileToSend = path.join(__dirname, uploadPath, req.params.fileId);
	if (fs.existsSync(fileToSend)) {
		res.sendFile(fileToSend);
	}
	else {
		res.sendStatus(404);
	}
});

app.listen(port, () => { console.log('listening on port ' + port) });