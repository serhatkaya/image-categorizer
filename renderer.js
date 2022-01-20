const { ipcRenderer } = require("electron");
let $ = (jQuery = require("jquery"));
var remote = require("electron").remote;
var fs = remote.require("fs");
var images = [];

$(function () {
	ipcRenderer.send("select-dirs");

	ipcRenderer.on("fileList", (event, files) => {
		images = files;
		console.log(files);
		readFile(files[0].path);
	});

	ipcRenderer.on("fileResponse", (event, base64) => {
		$("#image_container").html(
			'<img src="' + `data:image/jpg;base64,${base64}` + '" />'
		);
	});

	function readFile(path) {
		ipcRenderer.send("readFile", path);
	}

	$(document).on("keydown", function (e) {
		console.log(e);
	});
});
