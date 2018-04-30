const {app,shell, ipcRenderer} = require('electron')
const remote = require('electron').remote
const VersionChecker = require('./utils/versionChecker')
const HtmlTranslate = require('./utils/htmlTranslate')

document.addEventListener('DOMContentLoaded', event => {
  new HtmlTranslate(document).translate()
})

document.getElementById('versioner').innerHTML('v'+app.getVersion())

document.addEventListener('dragover', event => event.preventDefault())
document.addEventListener('drop', event => event.preventDefault())

document.getElementById('close-btn').addEventListener('click', function (e) {
  window.close()
})