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
		const index = images.findIndex((r) => r.path == path);
		if (index > -1) {
			images.splice(index, 1);
			getMeAnotherFile();
		}
	});

	function getMeAnotherFile() {
		if (images[currentIndex - 1]) {
			previousImage();
		} else if (images[currentIndex + 1]) {
			nextImage();
		}
	}

	ipcRenderer.on("settingsFileFound", (event, settingsToapp) => {
		applySettings(settingsToapp);
	});

	categoryList = $("#category-list");

	function applySettings(settingsToApply) {
		settings = settingsToApply;
		settings.forEach((category) => {
			categoryList.html("");
			categoryList.append(`
			<li class="list-group-item d-flex justify-content-between align-items-center">
						  ${category.name}
						  <span class="badge text-primary badge-pill">Key: ${category.key}</span>
						</li>`);
		});
	}

	settings = [];

	keyCombines = [];

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
			default:
				handlePress(e.key);
				break;
		}
	});

	function handlePress(key) {
		const category = settings.find((r) => r.key == key);
		if (category) {
			moveFileToCategory(images[currentIndex].path, category.name);
		}
	}

	function moveFileToCategory(path, category) {
		ipcRenderer.send("moveFileToCategory", { path: path, category: category });
	}

	ipcRenderer.on("fileMoved", (event, filepath) => {
		const index = images.findIndex((r) => r.path == filepath);
		if (index > -1) {
			images.splice(index, 1);
			getMeAnotherFile();
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
