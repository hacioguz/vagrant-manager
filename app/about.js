const {app, shell, ipcRenderer, electron} = require('electron')
const remote = require('electron').remote
const open = require('open')
const VersionChecker = require('./utils/versionChecker')
const HtmlTranslate = require('./utils/htmlTranslate')
const packager = require('./package.json')

document.addEventListener('DOMContentLoaded', event => {
  new HtmlTranslate(document).translate()
})

document.getElementById('versioner').innerHTML = packager.version
document.getElementById('copyier').innerHTML = ' \u00A9 ' + new Date().getFullYear() + ' ' + packager.author
document.getElementById('sponsor').innerHTML = packager.companyName
document.addEventListener('dragover', event => event.preventDefault())
document.addEventListener('drop', event => event.preventDefault())

document.on('new-window', function(event, url){
  event.preventDefault()
  open(url)
})

document.getElementById('close-btn').addEventListener('click', function (e) {
  window.close()
})