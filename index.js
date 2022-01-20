"use strict";
const path = require("path");
const { app, BrowserWindow, Menu } = require("electron");
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
app.setAppUserModelId("com.company.AppName");

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

ipcMain.on("select-dirs", async (event, arg) => {
	const result = await dialog.showOpenDialog(mainWindow, {
		properties: ["openDirectory"],
	});

	fs.readdir(result.filePaths[0], (err, files) => {
		const replyFiles = [];
		files.forEach((file) => {
			const extension = file
				.split(".")
				[file.split(".").length - 1].toLowerCase();
			if (["jpg", "jpeg", "png"].includes(extension)) {
				replyFiles.push({
					name: file,
					path: result.filePaths[0] + "\\" + file,
				});
			}
		});
		event.reply("fileList", replyFiles);
	});
});

ipcMain.on("readFile", async (event, arg) => {
	event.reply("fileResponse", fs.readFileSync(arg).toString("base64"));
});

(async () => {
	await app.whenReady();
	Menu.setApplicationMenu(menu);
	mainWindow = await createMainWindow();
})();
