import _ from 'lodash'

function sendMessage (cmd, data, success) {
  window.postMessage({ cmd, success, data }, '*')
}

export default ({ chatBot, notion, json } = {}) => {
  const processHandler = {
    'chat-bot-talk': ({ cmd, data }) => {
      if (!data) {
        return
      }
      const initTalksResult = chatBot.doSendMessage(
        data.prompt,
        data.style,
        data.type,
        data.newTalk,
        (success, res) => {
          // 处理数据结构
          let dataNew = chatBot.parseData(res)
          sendMessage('chat-bot-talk-result', dataNew, success)
        }
      )

      // sendResponse(initTalksResult);
    },
    'open-url': ({ data }) => {
      window.electron.ipcRenderer.send('open_url', data)
    },
    'chat-bot-talk-stop': ({ data }) => {
      chatBot.stop(data.type)
    },
    'chat-bot-init': async ({ data }) => {
      const { chatGPTAPI, chatGPTModel, chatGPTToken } = data || {}

      if (chatGPTAPI && chatGPTModel && chatGPTToken) {
        await chatBot
          .init('ChatGPT', chatGPTToken, chatGPTAPI, chatGPTModel)
          .catch(e => null)
      }
      await chatBot.init('Bing').catch(e => null)

      let availables = await chatBot.getAvailables().catch(e => '')

      sendMessage(
        'chat-bot-init-result',
        availables,
        availables && availables.length > 0
      )
    },
    'left-button-action': async () => {
      
    }
  }

  window.addEventListener('message', evt => {
    const { cmd } = evt.data || {}
    if (_.isFunction(processHandler[cmd])) {
      processHandler[cmd](evt.data)
    }
  })
}
