console.log('Service Worker');
import eventHandler from './eventHandler';

import Notion from '@/components/background/Notion';
import NewBing from '@/components/background/NewBing';
import ChatGPT from '@/components/background/ChatGPT';
import ChatBot from '@/components/background/ChatBot';
// import Agent from '@/components/background/Agent';
// import Api2d from '@/components/background/Api2d';
// import Common from '@/components/background/Common';

import { getConfig } from '@/components/Utils';
import _ from 'lodash';

function sendMessage(cmd, data, success) {
  window.postMessage({ cmd, success, data }, '*');
}

function backgroundHandle() {
  // let json = getConfig();

  // const notion = new Notion(json.notionToken);

  const chatBot = new ChatBot({
    items: [],
  });

  const chatGPT = new ChatGPT();
  const bingBot = new NewBing();
  chatBot.add(bingBot);
  chatBot.add(chatGPT);
  // 初始化
  chatBot.getAvailables();

  const processHandler = {
    'chat-bot-talk': ({ cmd, data }) => {
      if (!data) {
        return;
      }
      const initTalksResult = chatBot.doSendMessage(
        data.prompt,
        data.style,
        data.type,
        data.newTalk,
        (success, res) => {
          // 处理数据结构
          let dataNew = chatBot.parseData(res);
          sendMessage('chat-bot-talk-result', dataNew, success);
        }
      );

      // sendResponse(initTalksResult);
    },
    'open-url': ({ data }) => {
      window.electron.ipcRenderer.send('open_url', data);
    },
    'chat-bot-talk-stop': ({ data }) => {
      chatBot.stop(data.type);
    },
    'chat-bot-init': async ({ data }) => {
      const { chatGPTAPI, chatGPTModel, chatGPTToken } = data || {};

      if (chatGPTAPI && chatGPTModel && chatGPTToken) {
        await chatBot
          .init('ChatGPT', chatGPTToken, chatGPTAPI, chatGPTModel)
          .catch((e) => null);
      }
      await chatBot.init('Bing').catch((e) => null);

      let availables = await chatBot.getAvailables().catch((e) => '');

      sendMessage(
        'chat-bot-init-result',
        availables,
        availables && availables.length > 0
      );
    },
    'left-button-action': async () => {},
  };

  function evtHandle(evt) {
    const { cmd } = evt.data || {};
    if (_.isFunction(processHandler[cmd])) {
      processHandler[cmd](evt.data);
    }
  }

  window.addEventListener('message', evtHandle);

  return () => {
    window.removeEventListener('message', evtHandle);
  };
}

export default backgroundHandle;
