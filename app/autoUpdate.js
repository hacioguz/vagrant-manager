const { ipcRenderer } = require('electron')

document.addEventListener('DOMContentLoaded', event => {
    new HtmlTranslate(document).translate()
})

setInterval(() => {
  let progress = ipcRenderer.sendSync('download-progress-request')
  const progressElement = document.getElementById('progressElement')
  progressElement.value = progress
}, 1000)