require('v8-compile-cache')
const {app, Menu, Tray, ipcMain, nativeImage, BrowserWindow, shell, powerMonitor, dialog} = require('electron')
const i18next = require('i18next')
const Backend = require('i18next-sync-fs-backend')
startI18next()
const vagrant = require('node-vagrant')
const commandExists = require('command-exists')
const heartbeats = require('heartbeats')
let VersionChecker = require('./utils/versionChecker')
const Store = require('electron-store')
const store = new Store()
const log = require('electron-log')
log.transports.file.format = '{h}:{i}:{s}:{ms} {text}'
log.transports.file.maxSize = 5 * 1024 * 1024
log.transports.console.format = '{h}:{i}:{s}:{ms} {text}'

if (process.platform === 'win32') {
/*
const autoUpdater = require('electron')
const server = 'hazel-server-nzhfigowai.now.sh'
const feed = `${server}/update/${process.platform}/${app.getVersion()}`

autoUpdater.setFeedURL(feed)
*/
}
	


log.transports.file.level = 'silly'
log.transports.console.level = 'silly'

const command = require('shelljs/global')
const jquery = require('jquery')
const shellPath = require('shell-path')
const fs = require('fs')
const path = require('path')
const proc = require('child_process')
process.env.PATH = shellPath.sync()

if (process.platform === 'win32') {
/*
autoUpdater.autoDownload = true
*/
}

function getIcon(path_icon) {
    return nativeImage.createFromPath(path_icon).resize({width: 16})
}

const trayActive = getIcon(path.join(__dirname,'assets/logo/trayIcon.png'))
const trayWait = getIcon(path.join(__dirname,'assets/logo/trayIconWait.png'))
const icon = path.join(__dirname,'/assets/logo/windowIcon.png')
const heart = heartbeats.createHeart(7000)
const gotTheLock = app.requestSingleInstanceLock()

let appIcon = null
let aboutWin = null
let tray = null
let settingsWin = null
let settings
var contextMenu 

app.setAppUserModelId('net.absalomedia.vagrant-manager')

global.shared = {
	isNewVersion: false
  }
  
if (!gotTheLock) {
	log.info('Vagrant Manager is already running.')
	app.quit()
} else {
	app.on('second-instance', (event, commandLine, workingDirectory) => {
		if (appIcon) {
			dialog.showMessageBox({
				buttons: [i18next.t('main.quit')],
				message: 'Already running'
			})
		}
	})
}


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
			errorBox('i18n',err.stack)
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
	powerMonitor.on('suspend', () => {
		log.info('The system is going to sleep')
	})
	powerMonitor.on('resume', () => {
		log.info('The system is resuming')
	})
	powerMonitor.on('shutdown', () => {
		log.info('The system is shutting down')
		shutDownState()
	})
}
	
if (process.platform === 'win32') {
	/*
	autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
		const dialogOpts = {
			type: 'info',
			buttons: [i18next.t('main.yes'), i18next.t('main.no')],
			title: i18next.t('about.checking') + ' ' + i18next.t('about.vm'),
			message: process.platform === 'win32' ? releaseNotes : releaseName,
			detail: i18next.t('main.update') + ': ' + i18next.t('main.areYouSure')
	}

	dialog.showMessageBox(dialogOpts, (response) => {
		if (response === 0) autoUpdater.quitAndInstall()
		})
	})
	*/
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
		 title: i18next.t(title),
		 webPreferences: {
			nodeIntegration: true
		  }
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
				machiner.up(function(err, out) { responseOutput(out,err) })
			}
		})
 	}

  function showAboutWindow () {
	if (aboutWin) {
	  aboutWin.show()
	  return
	}
	const modalPath = 'about.html'
	aboutWin = winStyle('main.aboutVM', {version: app.getVersion()})
	aboutWin.loadFile(modalPath)
	aboutWin.on('closed', () => {
	  aboutWin = null
	})
	}
	
function showSettingsWindow () {
  if (settingsWin) {
    settingsWin.show()
    return
  }
  const modalPath = 'settings.html'
  settingsWin = winStyle('main.settings')
  settingsWin.loadFile(modalPath)
  settingsWin.on('closed', () => {
    settingsWin = null
  })
}

function shutDownState () {
	//graceful shutdown
	commandExists('vagrant').then(function(command) {
	vagrant.globalStatus(function(err, data) 
	{
	if (err) {
		errorBox('Shutdown',err)
		log.error(err)
	} 
	var jsonData = JSON.parse(JSON.stringify(data))
	for(var index in jsonData) { 
			machine = vagrant.create({ cwd: jsonData[index]['cwd']})
			machine.halt(function(err, out) { responseOutput(out,err) })
			}
		})
	}).catch(function(command) {})
}


function saveDefaults () {
	store.set({  
		language: 'en',
		consoleview: true,
		boxupdate: false,
		notifyNewVersion: true
	})
}

function responseOutput(out,err) {
	if (err) {
		errorBox('Halt',err)
		log.error(err)
	}
	log.info(out)
	consoler = store.get('consoleview')
	if (consoler === true) {
		dialog.showMessageBox({
			type: 'info',
			buttons: [i18next.t('main.quit')],
			message: i18next.t('main.console'),
			detail : out
		})
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
		buttons: [i18next.t('main.quit')],
		message: 'Code: ' + code,
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

	commandExists('vagrant').then(function(command) {

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
			consoler = store.get('consoleview')
			if (consoler === true) {
				log.info(box)
			}	
			return callback(box)
		})
	}).catch(function(){
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

		if (global.shared.isNewVersion) {
			menu.push({
				label: i18next.t('main.downloadLatest'),
				click: function () {
					downloadLatestUpdate()
				}
			})
		}

	boxDetails( function(box)
	{
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
					label: i18next.t('main.snapshot'),
					submenu: [
						{
						label: i18next.t('main.push'),
						box: index,
						id: box[index]['path'],
						click: function(menuItem)
						{
							runMachine(contextMenu, menuItem, 'push')
						}
					 },
					 {
						label: i18next.t('main.pop'),
						box: index,
						id: box[index]['path'],
						click: function(menuItem)
						{
							runMachine(contextMenu, menuItem, 'pop')
						}
					 },
					 {
						label: i18next.t('main.list'),
						box: index,
						id: box[index]['path'],
						click: function(menuItem)
						{
							runMachine(contextMenu, menuItem, 'list')
						}
					 },
					],
				},
				{
					label: i18next.t('main.plugin'),
					submenu: [
						{
						label: i18next.t('main.updater'),
						box: index,
						id: box[index]['path'],
						click: function(menuItem)
						{
							runMachine(contextMenu, menuItem, 'update')
						}
					 },
					 {
						label: i18next.t('main.repairer'),
						box: index,
						id: box[index]['path'],
						click: function(menuItem)
						{
							runMachine(contextMenu, menuItem, 'repair')
						}
					 },
					 {
						label: i18next.t('main.expunge'),
						box: index,
						id: box[index]['path'],
						click: function(menuItem)
						{
							runMachine(contextMenu, menuItem, 'expunge')
						}
					 },
					],
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

	})
	
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
				click: function (menuItem) {
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
}

function boxChecking() {
	vagrant.boxOutdated(null, function(err, out) {
		if (err) {
			errorBox(err)
			log.error(err)
		}

		var jsonData = JSON.parse(JSON.stringify(out))
		for(var index in jsonData) { 
			var boxStatus = jsonData[index]['status']
			var boxName =  jsonData[index]['name']
			if (boxStatus === 'out of date') {
				vagrant.boxUpdate(boxName, null, function(err, out) { responseOutput(out,err) } )
							.on('progress', function(out) { responseOutput(out, null) } )
				}
		}
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
		case 'up': 
							 boxCheck = store.get('boxupdate')
							 if (boxCheck === true) {
							 	boxChecking()
							 }
							 machine.up(function(err, out) { responseOutput(out,err)})
							 break
		case 'provision': machine.provision(function(err, out) { responseOutput(out,err) })
							 break
    	case 'suspend': machine.suspend(function(err, out) { responseOutput(out,err) })
							 break
	  	case 'resume': machine.resume(function(err, out) {responseOutput(out,err) })
							 break							 
		case 'halt': machine.halt(function(err, out) {responseOutput(out,err) })
							 break
		case 'reload': machine.reload(function(err, out) {responseOutput(out,err) })
							 break
		case 'destroy': machine.destroy(function(err, out) {responseOutput(out,err) })
							 break
		case 'update': machine.plugin().update(function(err, out) {responseOutput(out,err)})
							 break							 
		case 'repair': machine.plugin().repair(function(err, out) {responseOutput(out,err)})
							 break
		case 'expunge': machine.plugin().expunge(function(err, out) {responseOutput(out,err)})
							 break							 
		case 'push': machine.snapshots().push(function(err, out) {responseOutput(out,err)})
							 break
		case 'pop': machine.snapshots().pop(function(err, out) {responseOutput(out,err)})
							 break
		case 'list': machine.snapshots().list(function(err, out) {responseOutput(out,err)})
							 break					 							 
	}	
}

function trackMenu () {
	boxDetails( function(box)
	{
		/*
		if (Object.keys(box).length === 0 && box.constructor === Object) {
			// Don't rebuild menu when box list is empty
			heart.kill()
		} else { */	
			heart.createEvent(1, function(count, last) {
				if (typeof contextMenu !== 'undefined' && contextMenu !== null) {
					contextMenu.destroy/*
					if (process.platform === 'win32') {
							autoUpdater.checkForUpdates()
					}*/
					buildMenu()
				if (heart.age === 10285) {
					app.relaunch()
					app.exit()
						}
		 			}
			})
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
	i18next.changeLanguage(store.get('language'))
	consoler = store.get('consoleview')
	if (consoler === true) {
		process.env.NODE_DEBUG = true
	}
}

ipcMain.on('save-setting', function (event, key, value) {
  store.set(key,value)
  settingsWin.webContents.send('renderSettings', store.store)
  buildMenu()
})

ipcMain.on('update-tray', function (event) {
	buildMenu()
})

ipcMain.on('set-default-settings', function (event, store) {
  const options = {
    type: 'info',
    title: i18next.t('main.resetToDefaults'),
    message: i18next.t('main.areYouSure'),
    buttons: [i18next.t('main.yes'), i18next.t('main.no')]
  }
  dialog.showMessageBox(options, function (index) {
    if (index === 0) {
      saveDefaults()
      settingsWin.webContents.send('renderSettings', store.store)
    }
  })
})

ipcMain.on('send-settings', function (event) {
  settingsWin.webContents.send('renderSettings', store.store)
})

ipcMain.on('change-language', function (event, language) {
  i18next.changeLanguage(language)
  if (settingsWin) {
    settingsWin.webContents.send('renderSettings', store.store)
  }
})
