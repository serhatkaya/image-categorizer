"use strict";
const path = require("path");
const { app, BrowserWindow, Menu, shell } = require("electron");
/// const {autoUpdater} = require('electron-updater');
const { is } = require("electron-util");
const unhandled = require("electron-unhandled");
const debug = require("electron-debug");
const contextMenu = require("electron-context-menu");
const menu = require("./menu.js");
const { ipcMain, dialog } = require("electron");
const fs = require("fs");

let outputhPath = "";

unhandled();
debug();
contextMenu();

// Note: Must match `build.appId` in package.json
app.setAppUserModelId("com.serhatkaya.ImageCategorizer");

// Uncomment this before publishing your first version.
// It's commented out as it throws an error if there are no published versions.
// if (!is.development) {
// 	const FOUR_HOURS = 1000 * 60 * 60 * 4;
// 	setInterval(() => {
// 		autoUpdater.checkForUpdates();
// 	}, FOUR_HOURS);
//
// 	autoUpdater.checkForUpdates();
// }

// Prevent window from being garbage collected
let mainWindow;

const createMainWindow = async () => {
	const win = new BrowserWindow({
		title: app.name,
		show: false,
		webPreferences: {
			enableRemoteModule: true,
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	win.on("ready-to-show", () => {
		win.show();
	});

	win.on("closed", () => {
		// Dereference the window
		// For multiple windows store them in an array
		mainWindow = undefined;
	});

	await win.loadFile(path.join(__dirname, "index.html"));

	return win;
};

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
	app.quit();
}

app.on("second-instance", () => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}

		mainWindow.show();
	}
});

app.on("window-all-closed", () => {
	if (!is.macos) {
		app.quit();
	}
});

app.on("activate", async () => {
	if (!mainWindow) {
		mainWindow = await createMainWindow();
	}
});

ipcMain.on("chooseFile", (event, arg) => {
	const result = dialog.showOpenDialog({
		properties: ["openFile"],
		filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg"] }],
	});

	result.then(({ canceled, filePaths, bookmarks }) => {
		const base64 = fs.readFileSync(filePaths[0]).toString("base64");
		event.reply("chosenFile", base64);
	});
});
//0 for soft 1 for hard.
var deleteMode = 0;
ipcMain.on("deleteFile", async (event, arg) => {
	if (deleteMode == 0) {
		shell.trashItem(path.normalize(arg));
	} else {
		fs.unlink(arg, (err) => {
			if (err) throw err;
			console.log(arg + " was deleted");
		});
	}
	event.reply("fileDeleted", arg);
});

ipcMain.on("moveFileToCategory", async (event, request) => {
	const baseFolder = path.dirname(path.normalize(request.path));
	const fileName = path.basename(request.path);
	const categoryFolderPath = path.normalize(
		path.join(baseFolder, request.category)
	);
	const categoryFolderFileFullPath = path.normalize(
		path.join(categoryFolderPath, fileName)
	);
	if (!fs.existsSync(categoryFolderPath)) {
		fs.mkdirSync(categoryFolderPath);
		fs.renameSync(request.path, categoryFolderFileFullPath);
	} else {
		fs.renameSync(request.path, categoryFolderFileFullPath);
	}

	event.reply("fileMoved", request.path);
});

ipcMain.on("select-dirs", async (event, arg) => {
	const result = await dialog.showOpenDialog(mainWindow, {
		properties: ["openDirectory"],
	});

	const normalizedPath = path.normalize(result.filePaths[0]);
	fs.readdir(normalizedPath, (err, files) => {
		const settingsFile = files.find((r) => r == "icsettings.json");
		if (settingsFile) {
			mainWindow.webContents.send(
				"settingsFileFound",
				readJsonFile(path.join(normalizedPath, settingsFile))
			);
		}

		const replyFiles = [];
		files.forEach((file) => {
			const extension = file
				.split(".")
				[file.split(".").length - 1].toLowerCase();
			if (["jpg", "jpeg", "png"].includes(extension)) {
				replyFiles.push({
					name: file,
					path: path.join(normalizedPath, file),
				});
			}
		});

		event.reply("fileList", replyFiles);
	});
});

function readJsonFile(f) {
	try {
		let rawdata = fs.readFileSync(f);
		return JSON.parse(rawdata);
	} catch (error) {
		console.log(error);
		return {};
	}
}

ipcMain.on("readFile", async (event, arg) => {
	event.reply("fileResponse", fs.readFileSync(arg).toString("base64"));
});

(async () => {
	await app.whenReady();
	Menu.setApplicationMenu(menu);
	mainWindow = await createMainWindow();
})();
