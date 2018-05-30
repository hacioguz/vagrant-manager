const {app, shell, ipcRenderer, electron} = require('electron')
const remote = require('electron').remote
const open = require('open')
const VersionChecker = require('./utils/versionChecker')
const HtmlTranslate = require('./utils/htmlTranslate')
const packager = require('./package.json')
var details = []

document.addEventListener('DOMContentLoaded', event => {
  new HtmlTranslate(document).translate()
})

details.push('v ' + packager.version)
details.push(i18next.t('about.copyright') +' \u00A9 ' + new Date().getFullYear() + ' ' + packager.author )
details.push(i18next.t('about.sponsor') + ' ' + packager.companyName)

document.getElementById('versioner').innerHTML = details.join('<br />')
document.addEventListener('dragover', event => event.preventDefault())
document.addEventListener('drop', event => event.preventDefault())

document.on('new-window', function(event, url){
  event.preventDefault()
  open(url)
})

document.getElementById('close-btn').addEventListener('click', function (e) {
  window.close()
})