import { ipcMain, app, BrowserWindow, shell } from 'electron'
import _ from 'lodash'
import axios from 'axios'
function delay (ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, ms || 0)
  })
}

const processHandler = {
  async dbt_close_app () {
    app.quit()
    process.exit(0)
  },
  bing_login () {
    return new Promise((resolve, reject) => {
      const authWindow = new BrowserWindow({
        width: 1024,
        height: 900,
        show: false,
        frame: false,
        'node-integration': false,
        'web-security': false,
        'title-bar-style': 'hidden'
      })

      authWindow.webContents.openDevTools()

      authWindow.loadURL('https://www.bing.com/')
      // authWindow.loadURL('https://login.live.com/login.srf?wa=wsignin1.0&rpsnv=13&id=264960&wreply=https%3a%2f%2fwww.bing.com%2fsecure%2fPassport.aspx%3fedge_suppress_profile_switch%3d1%26requrl%3dhttps%253a%252f%252fwww.bing.com%252f%253fwlexpsignin%253d1%2526wlexpsignin%253d1%26sig%3d3716467290926F613DA9556691DE6E54&wp=MBI_SSL&lc=2052&CSRFToken=52092b4c-a8fd-4b98-b988-78a7f4e38a6b&aadredir=1');
      authWindow.show()

      authWindow.webContents.on('will-redirect', async (t, url) => {
        console.log('urlurl', url)
        if (url.includes('https://www.bing.com/?wlexpsignin=1')) {
          await delay(150)
          resolve({
            code: 200,
            data: 'ok'
          })

          authWindow.destroy()
        }
      })

      authWindow.on('closed', () => {
        reject(new Error('bing login was cancelled.'))
      })
    })
  },
  open_url (evt, data) {
    if (data.url) {
      shell.openExternal(data.url)
    }
  },
  async notion_prompts (event) {
    let res = await axios
      .post(
        'https://api.notion.com/v1/databases/b7d67071722b4bd88546ea31b4841f6b/query', {page_size: 100},
        {
          headers: {
            Authorization: `Bearer secret_4XmIRpKPA5AP4h9PaHW49MTMGxeWYEGuIPBmUWtbHee`,
            accept: 'application/json',
            'Notion-Version': '2022-06-28'
          }
        }
      )
      .then(res => res.data)
      .catch(e => null)
      event.reply('notion_prompts_back', res);
  }
}

export default function ipc () {
  Object.keys(processHandler).forEach(key => {
    if (_.isFunction(processHandler[key])) {
      ipcMain.on(key, processHandler[key])
    }
  })
}
