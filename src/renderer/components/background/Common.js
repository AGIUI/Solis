/**
 * background里的监听事件的定义
 *
 */

class Common {
  constructor(json, notion, chatBot, Agent, Api2d) {
    this.appName = json.app;

    this.init();
    this.onMessage(json, notion, chatBot, Agent, Api2d);
  }

  init() {
    chrome.runtime.getPlatformInfo().then((res) => (this.platformInfo = res));
  }

  onMessage(json, notion, chatBot, Agent, Api2d) {
    // 用于监听发到bg的消息
    chrome.runtime.onMessage.addListener(
      async (request, sender, sendResponse) => {
        const { cmd, data } = request,
          tabId = sender.tab.id;

        if (cmd == 'get-block') {
          // 查询block的数据
          notion.getBlock(data.blockId).then((data) => {
            this.sendMessage(
              'get-block-result',
              data.status == 200,
              data,
              tabId
            );
          });
        } else if (cmd == 'get-block-children') {
          // 获取block的子数据
          notion
            .getBlockChildren(data.blockId, data.expirationTime || 1000 * 60)
            .then((data) => {
              this.sendMessage(
                'get-block-children-result',
                data.status == 200,
                data,
                tabId
              );
            });
        } else if (cmd == 'get-data-from-notion') {
          const type = data.type;
          let databaseId;
          if (type == 'news') databaseId = json.databaseId;
          if (type == 'copilots') databaseId = json.databaseId2;
          if (type == 'prompts') databaseId = json.databaseId3;

          // 查询database
          if (databaseId)
            notion
              .queryDatabase(databaseId, data.expirationTime || 1000 * 60 * 60)
              .then((res) => {
                res = { ...res, type };
                this.sendMessage(
                  'get-data-from-notion-result',
                  res.status == 200,
                  res,
                  tabId
                );
              });
        } else if (cmd == 'chat-bot-init') {
          // 初始化 chatbot
          const { chatGPTAPI, chatGPTModel, chatGPTToken } = data || {};

          if (chatGPTAPI && chatGPTModel && chatGPTToken) {
            await chatBot.init(
              'ChatGPT',
              chatGPTToken,
              chatGPTAPI,
              chatGPTModel
            );
          }

          await chatBot.init('Bing');

          let availables = await chatBot.getAvailables();
          sendResponse({ cmd: 'chat-bot-init-result', data: availables });
          this.sendMessage(
            'chat-bot-init-result',
            availables && availables.length > 0,
            availables,
            tabId
          );
        } else if (cmd == 'chat-bot-init-by-type') {
          let available = await chatBot.getAvailable(data.type);
          sendResponse({
            cmd: 'chat-bot-init-by-type-result',
            data: available,
          });
        } else if (cmd == 'chat-bot-talk') {
          // console.log(cmd, data)
          // prompt, style, type, callback
          const initTalksResult = chatBot.doSendMessage(
            data.prompt,
            data.style,
            data.type,
            data.newTalk,
            (success, res) => {
              // 处理数据结构
              let dataNew = chatBot.parseData(res);
              this.sendMessage('chat-bot-talk-result', success, dataNew, tabId);
            }
          );

          sendResponse(initTalksResult);
        } else if (cmd == 'chat-bot-talk-new') {
          if (data.newTalk) {
            chatBot.reset(data.type);
          }
        } else if (cmd == 'chat-bot-talk-stop') {
          chatBot.stop(data.type);
        }  else if (cmd == 'open-url') {
          chrome.tabs.create({
            url: data.url,
          });
        } else if (cmd == 'run-agents') {
          Agent.executeScript(data.url, data.query, data.combo);
        } else if (cmd == 'get-my-points-for-api2d') {
          // 获取我的积分
          Api2d.getPoints().then((res) => {
            chrome.storage.sync.set({ myPoints: res });
          });
        }

        sendResponse('我是后台，已收到消息：' + JSON.stringify(request));
        return true;
      }
    );
  }

  sendMessage(cmd, success, data, tabId) {
    window.postMessage({ cmd, success, data }, '*');
  }
}

export default Common;
