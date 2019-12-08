
// https://zestedesavoir.com/tutoriels/996/vos-applications-avec-electron/
// https://electronjs.org/docs/tutorial/debugging-main-process-vscode
// https://stackoverflow.com/questions/30381450/open-external-file-with-electron


const electron = require('electron');
const {app, dialog, BrowserWindow, remote, ipcMain} = electron;
const ipc = ipcMain;
const path = require('path')
const isProd = false;                                  //todo change for prod.

let mainWindow;


function createWindow () 
{
    mainWindow = new BrowserWindow(
    {
        width: 800,
        height: 600,
        webPreferences: { nodeIntegration: true }
    });

    mainWindow.loadURL(`file://${__dirname}/index.html`);

    mainWindow.on('closed', () => 
    {
        mainWindow = null;
    });

    if(!isProd)
        mainWindow.webContents.openDevTools();


    

    //test load save file
    ipc.on("openFileDialog", (event) => 
    {
        let ret = dialog.showOpenDialog(mainWindow, 
        {
            properties: ['openFile'],
            title: 'Load a file',
            filters: 
            [
                {name: 'unreal', extensions: ['uasset', 'uexp', 'san', "prm", "flw", "fld", "sad", "lip", "frmd", "srdp", "stx"]},
                //{name: 'text', extensions: ['txt']},
                //{name: 'All formats', extensions: ['*']}
            ]
        }).then(result => {
            console.log(result.canceled);
            console.log(result.filePaths);

            event.sender.send("selectedFile", result);
        }).catch(err => {
            console.log(err);
        });
    });


    ipc.on("saveFileDialog", (event, defaultFilename) => 
    {
        dialog.showSaveDialog(mainWindow, 
        {
            title: 'Save file',
            defaultPath: (defaultFilename!=null) ? defaultFilename : undefined,
            filters: 
            [
                {name: 'unreal', extensions: ['uasset', 'uexp', 'san', "prm", "flw", "fld", "sad", "lip", "frmd", "srdp", "stx"]},
                //{name: 'text', extensions: ['txt']},
                //{name: 'All formats', extensions: ['*']}
            ]
        }).then(result => {
            event.sender.send("savedFile", result);
        }).catch(err => {
            console.log(err);
        });
    });


    //drag and drop
    ipc.on("dragstart", (event, filepath) => 
    {
        event.sender.startDrag({
            file: filepath,
            icon: path.join(__dirname, "/img/drag_file.png")
        });
    });

}

app.on('ready', createWindow);

app.on('window-all-closed', () => 
{
  if (process.platform !== 'darwin') 
    app.quit();
});

app.on('activate', () => 
{
  if (mainWindow === null)
    createWindow();
});






