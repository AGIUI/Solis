import { v4 } from 'uuid';
import WebSocketAsPromised from 'websocket-as-promised';
import _ from 'lodash';
import axios from 'axios'
import { chromeStorageGet, chromeStorageSet } from '../Utils';

function delay(ms) {
  return new Promise((res) => {
    setTimeout(() => {
      res()
    }, ms ||0)
  })
}

const websocketUtils = {
  packMessage(data) {
    const RecordSeparator = String.fromCharCode(30);
    return `${JSON.stringify(data)}${RecordSeparator}`;
  },
  unpackMessage(data) {
    const RecordSeparator = String.fromCharCode(30);
    return data
      .toString()
      .split(RecordSeparator)
      .filter(Boolean)
      .map((s) => JSON.parse(s));
  },
};

// new bing TODO 错误要立马传给前端 采用chrome stor
async function createConversation() {
  const headers = {
    'x-forwarded-for': '1.1.1.1',
    'x-ms-client-request-id': v4(),
    'x-ms-useragent':
      'azsdk-js-api-client-factory/1.0.0-beta.1 core-rest-pipeline/1.10.0 OS/Win32',
  };

  let resp, info;

  try {
    resp = await axios.get('https://www.bing.com/turing/conversation/create', {
      withCredentials: true,
      // headers,
    }).then(res => res.data);
    if (!resp.result) {
      console.log('bing/conversation/create', resp);
      resp = await axios.get(
        'https://edgeservices.bing.com/edgesvc/turing/conversation/create',
        { withCredentials: true, headers }
      ).then(res => res.data);
    }
  } catch (err) {
    console.log('createConversation===================>', info, resp);
    // localStorage.removeItem('chatBotAvailables');
    return { resp: null, info: 'UnauthorizedRequest' };
  }

  if (_.get(resp, 'result.value') !== 'Success') {
    const message = `${resp.result.value}: ${resp.result.message}`;
    if (resp.result.value === 'UnauthorizedRequest') {
      info = 'UnauthorizedRequest';
    } else if (resp.result.value === 'Forbidden') {
      info = 'Forbidden';
    } else {
      info = message;
    }
    // 登录失败 清理数据
    // localStorage.removeItem('chatBotAvailables');
    // console.error(message)
    resp = null;
  }

  return { resp, info };
}

class NewBing {
  constructor(bingConversationStyle = 'Balanced') {
    this.type = 'Bing';

    this.conversationContext = undefined;

    this.bingConversationStyles = {
      Creative: 'creative',
      Balanced: 'balanced',
      Precise: 'precise',
    };
    this.conversationStyle = this.bingConversationStyles[bingConversationStyle];
    this.updateStyleOption(this.conversationStyle);
    this.init();
  }

  // loadFromLocal() {
  //     // const myConfig = { bingStyle, chatGPTAPI, chatGPTModel, chatGPTToken }
  //     chrome.storage.local.get('myConfig').then(data => {
  //         if (data.myConfig) {
  //             this.token = data.myConfig.bingStyle
  //         }
  //     })
  // }

  async init() {
    if (!this.conversationContext) {
      const { resp: conversation, info } = await createConversation();
      if (conversation == null) {
        this.available = null;
        return {
          success: false,
          info: info,
        };
      }
      this.conversationContext = {
        conversationId: conversation.conversationId,
        conversationSignature: conversation.conversationSignature,
        clientId: conversation.clientId,
        invocationId: 0,
        conversationStyle: this.conversationStyle,
      };
    }

    this.available = {
      success: true,
      style: 'Creative',
      styles: [
        { en: 'Creative', zh: '创造力', value: 'Creative', label: 'Creative' },
        { en: 'Balanced', zh: '平衡', value: 'Balanced', label: 'Balanced' },
        { en: 'Precise', zh: '严谨', value: 'Precise', label: 'Precise' },
      ],
      conversationContext: this.conversationContext,
    };
    // console.log(this.available)
    return this.available;
  }

  async getAvailable() {
    let res = {
      success: false,
      info: '',
    };

    if (!this.available) res = await this.init();
    if (this.available && this.available.success == false)
      res = await this.init();
    if (this.available && this.available.success) res = this.available;
    return res;
  }

  updateStyleOption(type = 'creative') {
    const json = {
      balanced: 'harmonyv3',
      creative: 'h3imaginative',
      precise: 'h3precise',
    };

    this.styleOption = json[type];
  }

  async saveChatBotByPrompt(prompt, result) {
    let key = `p_${prompt}`;
    let data = await chromeStorageGet(key), // chrome.storage.local.get(key);
    if (!data[key]) data[key] = [];
    data[key].push(result);
    await chromeStorageSet(data);
  }

  convertMessageToMarkdown(message) {
    if (message) {
      if (message.messageType === 'InternalSearchQuery') {
        return message.text;
      }
      for (const card of message.adaptiveCards || []) {
        for (const block of card.body) {
          if (block.type === 'TextBlock') {
            return block.text;
          }
        }
      }
    }

    return '';
  }

  buildChatRequest(conversation, message) {
    const styleOption = this.styleOption;
    // console.log(styleOption)
    return {
      arguments: [
        {
          source: 'cib',
          optionsSets: [
            'deepleo',
            'nlu_direct_response_filter',
            'disable_emoji_spoken_text',
            'responsible_ai_policy_235',
            'enablemm',
            'dtappid',
            'rai253',
            'dv3sugg',
            styleOption,
          ],
          allowedMessageTypes: ['Chat', 'InternalSearchQuery'],
          isStartOfSession: conversation.invocationId === 0,
          message: {
            author: 'user',
            inputMethod: 'Keyboard',
            text: message,
            messageType: 'Chat',
          },
          conversationId: conversation.conversationId,
          conversationSignature: conversation.conversationSignature,
          participant: { id: conversation.clientId },
        },
      ],
      invocationId: conversation.invocationId.toString(),
      target: 'chat',
      type: 4,
    };
  }

  async doSendMessage(params) {
    if (!this.conversationContext) {
      const { success, info } = await this.init();
      if (success == false) {
        params.onEvent({ type: 'ERROR', data: info });
      }
    }

    // style 传参进来
    if (params.style) {
      //creative balanced precise
      this.updateStyleOption(params.style);
    }

    const conversation = this.conversationContext;

    const wsp = new WebSocketAsPromised(
      'wss://sydney.bing.com/sydney/ChatHub',
      {
        packMessage: websocketUtils.packMessage,
        unpackMessage: websocketUtils.unpackMessage,
      }
    );

    wsp.onUnpackedMessage.addListener((events) => {
      for (const event of events) {
        if (JSON.stringify(event) === '{}') {
          try {
            wsp.sendPacked({ type: 6 });
            wsp.sendPacked(this.buildChatRequest(conversation, params.prompt));
            conversation.invocationId += 1;
            params.onEvent({ type: 'BUILD_CHAT_REQUEST', data: { event } });
          } catch (error) {
            params.onEvent({ type: 'ERROR', data: 'BUILD_CHAT_REQUEST fail' });
          }
        } else if (event.type === 6) {
          wsp.sendPacked({ type: 6 });
        } else if (event.type === 3) {
          params.onEvent({ type: 'DONE', data: { event } });
          wsp.removeAllListeners();
          wsp.close();
        } else if (event.type === 1) {
          const text = this.convertMessageToMarkdown(
            event.arguments && event.arguments[0] && event.arguments[0].messages
              ? event.arguments[0].messages[0]
              : ''
          );
          params.onEvent({ type: 'UPDATE_ANSWER', data: { text, event } });
        } else if (event.type === 2) {
          const messages = event.item.messages;
          if (messages) {
            const limited = messages.some(
              (message) => message.contentOrigin === 'TurnLimiter'
            );
            if (limited) {
              params.onEvent({
                type: 'ERROR',
                data: 'Sorry, you have reached chat turns limit in this conversation.',
              });
            }
          } else if (
            event.item.result &&
            event.item.result.error == 'UnauthorizedRequest'
          ) {
            params.onEvent({
              type: 'ERROR',
              data: 'UnauthorizedRequest',
            });
          }

          console.log(' messages.some', event);
        }
      }
    });

    wsp.onClose.addListener(() => {
      params.onEvent({ type: 'DONE' });
    });

    params.signal.addEventListener('abort', () => {
      wsp.removeAllListeners();
      wsp.close();
    });

    // wsp.open().then(() => {
    //   wsp.sendPacked({ protocol: 'json', version: 1 });
    //   return ''
    // }).catch(e => {
    //   console.log('wsp open error', e.message)
     
    // });
    let x = await this.tryOpen(wsp, 1)
    if (x) {
      wsp.sendPacked({ protocol: 'json', version: 1 });
    } else {
      console.log('wsp open error')
    }
  }

  async tryOpen(wsp, times) {
    console.log(`ws tryOpen times ${times}`)
    if (wsp.isOpened) {
      return true;
    }

    if (times >= 4) {
      return null;
    }
    try {
      let evt = await wsp.open();
      return evt;
    } catch (e) {
      await delay(50);
      let res = await this.tryOpen(wsp, times + 1);
      return res;
    }
  }

  stop() {
    try {
      this.controller.abort();
      console.log('bing bot stop')
    } catch (error) {
      console.log('bing bot stop', error);
    }
  }

  resetConversation() {
    this.conversationContext = undefined;
    this.available = null;
  }

  async doSendMessageForBg(prompt, style, callback) {
    // 支持传style
    if (!style) style = this.conversationStyle;
    style = style.toLowerCase();

    let id = v4();

    const controller = new AbortController();
    const signal = controller.signal;
    // controller.abort();
    this.controller = controller;

    try {
      this.doSendMessage({
        prompt: prompt,
        style,
        signal,
        onEvent: async (d) => {
          let nd = { ...d, id, prompt };

          callback(d.type != 'ERROR', {
            type: 'ws',
            data: nd,
          });
        },
      });
    } catch (error) {
      callback(false, error);
    }
  }
}

export default NewBing;
