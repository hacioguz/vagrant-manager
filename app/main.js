const {app, Menu, Tray, BrowserWindow, ipcMain, shell, nativeImage, dialog} = require('electron')
const i18next = require('i18next')
const Backend = require('i18next-node-fs-backend')
const vagrant = require('node-vagrant')
const heartbeats = require('heartbeats')
let VersionChecker = require('./utils/versionChecker')
const {autoUpdater} = require('electron-updater')
const log = require('electron-log')

startI18next()

log.transports.file.level = 'debug'
log.transports.console.level = 'debug'

const AppSettings = require('./utils/settings')
const defaultSettings = require('./utils/defaultSettings')
const command = require('shelljs/global')
const jquery = require('jquery')
const shellPath = require('shell-path')
const fs = require('fs')
const path = require('path')
const proc = require('child_process')
process.env.PATH = shellPath.sync()
autoUpdater.autoDownload = true

function getIcon(path_icon) {
    return nativeImage.createFromPath(path_icon).resize({width: 16})
}

const trayActive = getIcon(path.join(__dirname,'assets/logo/trayIcon.png'))
const trayWait = getIcon(path.join(__dirname,'assets/logo/trayIconWait.png'))
const icon = path.join(__dirname,'/assets/logo/windowIcon.png')
const heart = heartbeats.createHeart(7000)

let aboutUs = null
let appIcon = null
let aboutWin = null
let tray = null
let settingsWin = null
let settings
var contextMenu 

global.shared = {
	isNewVersion: false
  }
  
  let shouldQuit = app.makeSingleInstance(function (commandLine, workingDirectory) {
	if (appIcon) {
		dialog.showMessageBox({
			buttons: [i18next.t('main.yes')],
			message: 'Already running'
		})
	}
  })
  
  if (shouldQuit) {
	log.info('Vagrant Manager is already running.')
	app.quit()
	return
  }


if(process.platform === 'darwin') {
    app.dock.hide()
}

if (process.platform === 'win32') {
	process.on('SIGINT', function () {
	//graceful shutdown
		vagrant.globalStatus(function(err, data) 
		{
		if (err) {
			errorBox('Shutdown',err)
			log.error(err)
		} 
		var jsonData = JSON.parse(JSON.stringify(data))
		for(var index in jsonData) { 
				machine = vagrant.create({ cwd: jsonData[index]['cwd']})
				machine.halt(function(err, out) {})
				}
		})
	}
)}

function startI18next () {
	i18next
	  .use(Backend)
	  .init({
		lng: 'en',
		fallbackLng: 'en',
		debug: true,
		backend: {
		  loadPath: `${__dirname}/locales/{{lng}}.json`,
		  jsonIndent: 2
		}
	  }, function (err, t) {
		if (err) {
			log.error(err.stack)
			errorBox('i18',err.stack)
		}
		if (appIcon) {
		  buildMenu()
		}
	  })
  }
  
  i18next.on('languageChanged', function (lng) {
	if (appIcon) {
	  buildMenu()
	}
  })


  function startPowerMonitoring () {
	const electron = require('electron')
	electron.powerMonitor.on('suspend', () => {
		log.info('The system is going to sleep')
	})
	electron.powerMonitor.on('resume', () => {
		log.info('The system is resuming')
	})
	}

	function checkForLatestUpdate () {
		const oldVersion = app.getVersion()
		new VersionChecker()
			.latest()
			.then(version => {
				const semantic = /^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?$/
				if (version.match(semantic) && oldVersion !== version) {
					updateTrayForDownload()
				}
			})
			.catch(exception => console.error(exception))
	}
	
	function updateTrayForDownload () {
		processWin.webContents.send('showNotification', i18next.t('main.newVesionAvailable'))
		isNewVersionAvailable = true
		buildTray()
		buildMenu()
	}
	
	function downloadLatestUpdate () {
		autoupdate.checkForUpdates()
		autoupdate.on('update-available', () => {
			dialog.showMessageBox({
				type: 'info',
				title: i18next.t('about.checking')+' '+ i18next.t('about.vm'),
				message: i18next.t('main.downloadLatest')+'?',
				buttons: [i18next.t('main.yes'), i18next.t('main.no')]
			}, (buttonIndex) => {
				if (buttonIndex !== 0) return
				autoupdate.downloadUpdate()
				let downloadProgressWindow = new BrowserWindow({
					width: 400,
					height: 70,
					useContentSize: false,
					autoHideMenuBar: true,
					maximizable: false,
					fullscreen: false,
					resizable: false
				})
	
				downloadProgressWindow.loadURL(`file://${__dirname}/autoUpdate.html`)
				downloadProgressWindow.on('closed', () => {
					downloadProgressWindow = null
				})
				let downloadProgress
	
				autoupdate.on('download-progress', (d) => {
					downloadProgress = d.percent
				})
	
				ipcMain.on('download-progress-request', (e) => {
					e.returnValue = downloadProgress
				})
	
				autoupdate.on('update-downloaded', () => {
					if (downloadProgressWindow) {
						downloadProgressWindow.close()
					}
	
					dialog.showMessageBox({
						type: 'info',
						title: i18next.t('about.checking')+' '+ i18next.t('about.vm'),
						message: i18next.t('main.update')+': '+ i18next.t('main.areYouSure'),
						buttons: [i18next.t('main.yes'), i18next.t('main.no')]
					}, (buttonIndex) => {
						if (buttonIndex === 0) {
							autoupdate.quitAndInstall()
						}
					})
				})
			})
		})
	}
	
	
	function checkVersion () {
		processWin.webContents.send('checkVersion', `${app.getVersion()}`, settings.get('notifyNewVersion'))
		planVersionCheck(3600 * 5)
	}

	function winStyle(title) {
		window = new BrowserWindow({
		 width : 400,
		 height : 600,
		 resizable : false,
		 fullscreen : false,
		 frame: false,
		 titleBarStyle: 'customButtonsOnHover',		
		 icon : icon,
		 title: i18next.t(title)
	 })
	 return window 
 }

 function addMachine () {
	dialog.showOpenDialog({ filters: [
		{ title: i18next.t('main.add'), name: 'Vagrantfile'}]},
		(fileNames) => {
    // fileNames is an array that contains all the selected
    if(fileNames === undefined){
				log.warn('No file selected')
        return
    } 

		if(fileNames[0].includes('Vagrantfile') === true) {
				var cwder = fileNames[0].replace('Vagrantfile','')
				machiner = vagrant.create({ cwd: cwder})
				machiner.up(function(err, out) {})
			}
		})
 	}

  function showAboutWindow () {
	if (aboutWin) {
	  aboutWin.show()
	  return
	}
	const modalPath = `file://${__dirname}/about.html`
	aboutWin = winStyle('main.aboutVM', {version: app.getVersion()})
	aboutWin.loadURL(modalPath)
	aboutWin.on('closed', () => {
	  aboutWin = null
	})
	}
	
function showSettingsWindow () {
  if (settingsWin) {
    settingsWin.show()
    return
  }
  const modalPath = `file://${__dirname}/settings.html`
  settingsWin = winStyle('main.settings')
  settingsWin.loadURL(modalPath)
  settingsWin.on('closed', () => {
    settingsWin = null
  })
}

function saveDefaultsFor (array, next) {
  for (let index in array) {
    settings.set(array[index], defaultSettings[array[index]])
  }
}

function boxOptions(note,box,index,contextMenu, action)
{
	console.log(contextMenu)
	var text = 	{
					label: note,
					box: index,
					id: box['path'],
					click: function(menuItem)
					{
						runMachine(contextMenu, menuItem,action)
					}
				}
	return text
}

function boxStatus(index,note,box,value) 
{
	var text =   {
					label : note+' : '+box[index][value],
					enabled: false
				}
	return text
}

function errorBox(code,stderr) 
{
	dialog.showMessageBox({
		type: 'error',
		buttons: [i18next.t('main.yes')],
		message: 'Code ' + code,
		detail : stderr
	})
}

function sept() 
{
	var text  = {
					type: 'separator'
				}
	return text
}

function getUserHome() {
	return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME']
}

function boxDetails(callback)
{
	var box = []

	vagrant.globalStatus(function(err, data) 
		{

			if (err) {
				errorBox(err)
				log.error(err)
			}
		
			var jsonData = JSON.parse(JSON.stringify(data))
			for(var index in jsonData) { 
				var short_path = jsonData[index]['cwd']
				short_path = short_path.split('/').reverse().filter((v, i) => {
					return i < 1
				}).reverse().join('/')
				box.push({
					'short_path': short_path,
					'path' 		: jsonData[index]['cwd'],
					'state' 	: jsonData[index]['state'],
					'name' 		: jsonData[index]['name'],
					'provider'	: jsonData[index]['provider']
				})
			}	
			return callback(box)
		})
}

function buildTray() {
	tray = new Tray(trayActive)
	return tray
}

function buildMenu(event) {
	let menu = []
		
	tray.setImage(trayActive)
	boxDetails( function(box)
	{
		if (global.shared.isNewVersion) {
			menu.push({
				label: i18next.t('main.downloadLatest'),
				click: function () {
					downloadLatestUpdate()
				}
			})
		}

		for(var index in box) {
			menu.push(
			{
				label: box[index]['short_path'],
				icon: getIcon(path.join(__dirname,'/assets/logo/'+box[index]['state']+'.png')),
				submenu: [
					{
					label: i18next.t('main.up'),
					box: index,
					id: box[index]['path'],
					click: function(menuItem)
					{
						runMachine(contextMenu, menuItem, 'up')
					}
				},
				{
					label: i18next.t('main.provision'),
					box: index,
					id: box[index]['path'],
					click: function(menuItem)
					{
						runMachine(contextMenu, menuItem, 'provision')
					}
				},					
				{
					label: i18next.t('main.suspend'),
					box: index,
					id: box[index]['path'],
					click: function(menuItem)
					{
						runMachine(contextMenu, menuItem, 'suspend')
					}
				},
				{
					label:i18next.t('main.resume'),
					box: index,
					id: box[index]['path'],
					click: function(menuItem)
					{
						runMachine(contextMenu, menuItem, 'resume')
					}
				},
				{
					label:i18next.t('main.reload'),
					box: index,
					id: box[index]['path'],
					click: function(menuItem)
					{
						runMachine(contextMenu, menuItem, 'reload')
					}
				},				
				{
					label: i18next.t('main.halt'),
					box: index,
					id: box[index]['path'],
					click: function(menuItem)
					{
						runMachine(contextMenu, menuItem, 'halt')
					}
				},
				{
					label: i18next.t('main.update'),
					box: index,
					id: box[index]['path'],
					click: function(menuItem)
					{
						runMachine(contextMenu, menuItem, 'update')
					}
				},
				{
					label: i18next.t('main.repair'),
					box: index,
					id: box[index]['path'],
					click: function(menuItem)
					{
						runMachine(contextMenu, menuItem, 'repair')
					}
				},													
				{
											label: i18next.t('main.destroy'),
											box: index,
											id: box[index]['path'],
											click: function(menuItem)
											{
													function getDialog() {
															dialog.showMessageBox({
																	type: 'warning',
																	buttons: [i18next.t('main.yes'), i18next.t('main.no')],
																	message:  i18next.t('main.areYouSure'),
																	cancelId: 1,
																	defaultId: 1
															}, function(response) {
																	if(response === 0) {
																		runMachine(contextMenu, menuItem, 'destroy')
																	}
															})
													}
													getDialog()
											}
				},
				sept(),
				boxStatus(index,i18next.t('main.box'),box,'name'),
				boxStatus(index,i18next.t('main.provider'),box,'provider'),
				boxStatus(index,i18next.t('main.status'),box,'state')
				]
			})
		}

		menu.push(
		sept(),
		{
			label: i18next.t('main.settings'),
			click: function (menuItem)
			{
				showSettingsWindow()
			}
		},
		{
			label: i18next.t('main.add'),
			click: function (menuItem)
			{
				addMachine()
			}
		},		
		{
			label: i18next.t('main.about'),
			click: function (menuItem)
			{
				showAboutWindow()
			}
		})	

		if (process.platform === 'darwin' || process.platform === 'win32') {
			let loginItemSettings = app.getLoginItemSettings()
			let openAtLogin = loginItemSettings.openAtLogin
			menu.push({
				label: i18next.t('main.startAtLogin'),
				type: 'checkbox',
				checked: openAtLogin,
				click: function () {
				app.setLoginItemSettings({openAtLogin: !openAtLogin})
				}
			})
		}

		menu.push(
			{
				label: i18next.t('main.quit'),
				click: function (menuItem)
				{
						app.quit()
				}
			})

		contextMenu = Menu.buildFromTemplate(menu)
		tray.setToolTip(i18next.t('main.header'))
		tray.setContextMenu(contextMenu)
		return contextMenu

	})
	
}

function runMachine(contextMenu, menuItem, command)
{
	machine = vagrant.create({ cwd: menuItem.id})
	tray.setImage(trayWait)
	contextMenu.items[0].enabled = false
	var parentID = menuItem.box
	contextMenu.items[parentID].enabled = false
	tray.setContextMenu(contextMenu)
	switch(command) {
		case 'up': machine.up(function(err, out) {})
							 break
		case 'provision': machine.provision(function(err, out) {})
							 break
    case 'suspend': machine.suspend(function(err, out) {})
							 break
	  case 'resume': machine.resume(function(err, out) {})
							 break							 
		case 'halt': machine.halt(function(err, out) {})
							 break
		case 'reload': machine.reload(function(err, out) {})
							 break
		case 'destroy': machine.destroy(function(err, out) {})
							 break
		case 'update': machine.pluginUpdate(function(err, out) {})
							 break							 
		case 'repair': machine.pluginRepair(function(err, out) {})
							 break							 
	}	
}

function trackMenu () {
	boxDetails( function(box)
	{
		if (Object.keys(box).length === 0 && box.constructor === Object) {
			// Don't rebuild menu when box list is empty
			heart.kill()
		} else {
			heart.createEvent(1, function(count, last) {
				if (typeof contextMenu !== 'undefined' && contextMenu !== null) {
					contextMenu.destroy
					buildMenu()
				if (heart.age === 10285) {
					app.relaunch()
					app.exit()
						}
		 			}
			})
		}
	})
}

app.on('ready', loadSettings)
app.on('ready', buildTray)
app.on('ready', buildMenu)
app.on('ready', startPowerMonitoring)
app.on('ready', trackMenu)
app.on('window-all-closed', () => {
  // do nothing, so app wont get closed
})

app.on('before-quit', () => {
  heart.kill()
})

function loadSettings () {
	const dir = app.getPath('userData')
	const settingsFile = '${dir}/config.json'
	settings = new AppSettings(settingsFile)
	i18next.changeLanguage(settings.get('language'))
}

ipcMain.on('save-setting', function (event, key, value) {
  settings.set(key, value)
  settingsWin.webContents.send('renderSettings', settings.data)
  buildMenu()
})

ipcMain.on('update-tray', function (event) {
	buildMenu()
})

ipcMain.on('set-default-settings', function (event, data) {
  const options = {
    type: 'info',
    title: i18next.t('main.resetToDefaults'),
    message: i18next.t('main.areYouSure'),
    buttons: [i18next.t('main.yes'), i18next.t('main.no')]
  }
  dialog.showMessageBox(options, function (index) {
    if (index === 0) {
      saveDefaultsFor(data)
      settingsWin.webContents.send('renderSettings', settings.data)
    }
  })
})

ipcMain.on('send-settings', function (event) {
  settingsWin.webContents.send('renderSettings', settings.data)
})

ipcMain.on('show-debug', function (event) {
  const dir = app.getPath('userData')
  const settingsFile = `${dir}/config.json`
  aboutWin.webContents.send('debugInfo', settingsFile)
})

ipcMain.on('change-language', function (event, language) {
  i18next.changeLanguage(language)
  if (settingsWin) {
    settingsWin.webContents.send('renderSettings', settings.data)
  }
})
