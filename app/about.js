const {shell, ipcRenderer} = require('electron')
const remote = require('electron').remote
const VersionChecker = require('./utils/versionChecker')
const HtmlTranslate = require('./utils/htmlTranslate')

document.addEventListener('DOMContentLoaded', event => {
  new HtmlTranslate(document).translate()
})

document.addEventListener('dragover', event => event.preventDefault())
document.addEventListener('drop', event => event.preventDefault())

document.getElementById('close').addEventListener('click', function (e) {
  var window = remote.getCurrentWindow();
  window.close();
})
