const { ipcRenderer } = require("electron");
let $ = (jQuery = require("jquery"));
var remote = require("electron").remote;
var fs = remote.require("fs");
var images = [];
var currentIndex = 0;

$(function () {
	ipcRenderer.send("select-dirs");
	ipcRenderer.on("fileList", (event, files) => {
		images = files;
		readFile(files[0]?.path);
	});

	ipcRenderer.on("fileResponse", (event, base64) => {
		$("#image_container").html(
			'<img src="' + `data:image/jpg;base64,${base64}` + '" />'
		);
	});

	ipcRenderer.on("fileDeleted", (event, path) => {
		images = images.filter((r) => r.path != path);
		if (currentIndex == images.length - 1) {
			previousImage();
		} else {
			nextImage();
		}
	});

	function readFile(path) {
		ipcRenderer.send("readFile", path);
	}

	$(document).on("keydown", function (e) {
		const key = e.key.toLowerCase();
		switch (key) {
			case "arrowleft":
				previousImage();
				break;
			case "arrowright":
				nextImage();
				break;
			case "delete":
				deleteFile();
				break;
		}
	});

	function deleteFile() {
		ipcRenderer.send("deleteFile", images[currentIndex].path);
	}

	function nextImage() {
		if (images[currentIndex + 1]) {
			currentIndex += 1;
			readFile(images[currentIndex].path);
		}
	}

	function previousImage() {
		if (images[currentIndex - 1]) {
			currentIndex -= 1;
			readFile(images[currentIndex].path);
		}
	}
});
