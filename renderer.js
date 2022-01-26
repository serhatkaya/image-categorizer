const { ipcRenderer } = require("electron");
let $ = (jQuery = require("jquery"));
const Swal = require("sweetalert2");
var images = [];
var currentIndex = 0;
var body = $("body");
var modal = $("#myModal");
var categoryList = $("#categoryList tbody");
var settings = [];
var keyCombines = [];

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
			getMeAnotherFile(index);
		}
	});

	ipcRenderer.on("settingsFileFound", (event, settingsToapp) => {
		applySettings(settingsToapp, true);
	});

	$(document).on("keyup", function (e) {
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
});

function toggleModal() {
	body.toggleClass("modal-open");
	modal.toggleClass("show");
	modal.toggleClass("in");
}

async function createCategory() {
	const { value: categoryName } = await Swal.fire({
		title: "Category name",
		input: "text",
		showCancelButton: true,
		inputValidator: (value) => {
			if (!value) {
				return "You need to write something!";
			}
		},
	});

	const { value: categoryKey } = await Swal.fire({
		title: "Category key",
		input: "text",
		showCancelButton: true,
		inputValidator: (value) => {
			if (!value) {
				return "You need to write something!";
			}
		},
	});

	if (categoryKey && categoryName) {
		const category = {
			name: categoryName,
			key: categoryKey,
		};

		const mySettings = [...settings];
		mySettings.push(category);
		applySettings(mySettings, false);
	}
}

function getMeAnotherFile(index) {
	if (images[index + 1]) {
		const nextFileName = images[index + 1].path;
		images.splice(index, 1);
		const newIndex = images.findIndex((x) => x.path == nextFileName);
		if (newIndex > -1) {
			currentIndex = newIndex;
		} else {
			currentIndex = 0;
		}
	} else if (images[index - 1]) {
		const prevFileName = images[index - 1].path;
		images.splice(index, 1);
		const newIndex = images.findIndex((x) => x.path == prevFileName);
		if (newIndex > -1) {
			currentIndex = newIndex;
		} else {
			currentIndex = 0;
		}
	}

	readFile(images[currentIndex].path);
}

function readFile(path) {
	ipcRenderer.send("readFile", path);
}

function applySettings(settingsToApply, onlyRead) {
	settings = settingsToApply;
	categoryList.html("");
	$.each(settings, function (i, category) {
		categoryList.append(`
		<tr id="category-${i}">
			<td>${category.name}</td>
			<td><span class="badge text-primary badge-pill"> ${category.key}</span></td>
			<td class="text-danger" style="cursor:pointer" onclick="removeCategory(${i})">&times;</td>
		</tr>`);
	});

	if (!onlyRead) {
		ipcRenderer.send("writeSettingsFile", settings);
	}
}

function removeCategory(index) {
	settings.splice(index, 1);
	applySettings(settings, false);
}

function handlePress(key) {
	const category = settings.find((r) => r.key == key);
	if (category) {
		moveFileToCategory(images[currentIndex].path, category.name);
	}
}

function moveFileToCategory(path, category) {
	ipcRenderer.send("moveFileToCategory", { path: path, category: category });
}

ipcRenderer.on("fileMoved", (event, moved) => {
	const index = images.findIndex((r) => r.name == moved.name);
	if (index > -1) {
		images.splice(index, 1);
		getMeAnotherFile();
		Swal.fire({
			toast: true,
			timer: 3000,
			position: "top-end",
			text: `File: ${moved.name} moved to ${moved.movedTo}`,
		});
	}
});

function deleteFile() {
	ipcRenderer.send("deleteFile", images[currentIndex].path);
}

function nextImage() {
	if (images[currentIndex + 1]) {
		currentIndex = currentIndex + 1;
		readFile(images[currentIndex].path);
	}
}

function previousImage() {
	if (images[currentIndex - 1]) {
		currentIndex = currentIndex - 1;
		readFile(images[currentIndex].path);
	}
}
