import React from 'react';

import MarkdownIt from 'markdown-it';
import * as _ from 'lodash';
import { message } from 'antd';
import chrome from '@/utils/chrome';
import ChatBotConfig from '@/components/chatbot/ChatBotConfig';
import { FlexColumn } from '@/components/Style';

import ChatBotPanel from '@/components/chatbot/ChatBotPanel';

import ComboEditor from '@/components/combo/ComboEditor';
import ComboModal from '@/components/combo/ComboModal';
import { defaultCombo, defaultPrompt } from '@/components/combo/ComboData';
import { Readability } from '@mozilla/readability';

import Setup from '@/components/Setup';
import { comboParse, comboDataUpdate } from '@/components/notionHelper';

import { chromeStorageGet, chromeStorageSet } from '@/components/Utils';

const defaultChatbots: any = ChatBotConfig.get();

const Talks = {
  save: (value: any) => {
    const talks = Array.from(value, (v: any, index: number) => {
      // 去除user==true的连续重复
      if (v.user && value[index - 1] && v.html == value[index - 1].html) {
        return;
      }
      return v;
    }).filter((m) => m);
    if (talks && talks.length > 0) {
      // console.log('_currentTalks save', talks)
      chromeStorageSet({
        _currentTalks: {
          talks,
        },
      });
    }
  },
  clear: () => {
    chromeStorageSet({ _currentTalks: null });
  },
  clearThinking: (talks: any) => {
    return [...talks].filter((n: any) => n.type != 'thinking');
  },
  updateThinking: (text: string, talks: any) => {
    const talksNew = [...talks].filter((n: any) => n.type != 'thinking');
    talksNew.push(ChatBotConfig.createTalkData('thinking', { hi: text }));
    return talksNew;
  },
  get: async () => {
    const data: any = await chromeStorageGet(['_currentTalks']);
    if (data && data._currentTalks && data._currentTalks.talks) {
      // 只保留type==markdown talk
      const talks = data._currentTalks.talks.filter(
        (t: any) => t.type == 'talk' || t.type == 'markdown' || t.type == 'done'
      );
      return talks;
    }
    return [];
  },
  getLaskTalk: (talks: any) => {
    const getTalkInnerText = (data: any) => {
      const json = { ...data };
      const dom = document.createElement('div');
      if (json && json.html) dom.innerHTML = json.html;
      return dom.innerText;
    };
    const lastTalks = talks.filter(
      (talk: any) =>
        (talk.type == 'markdown' || talk.type == 'done') && !talk.user
    );
    const laskTalk = lastTalks.slice(-1)[0];
    // console.log('laskTalk:', laskTalk)
    return getTalkInnerText(laskTalk);
  },
  createTalkBubble: (text: string) => {
    const dom = document.createElement('div');

    const md = new MarkdownIt();
    dom.innerHTML = md.render(text);

    Array.from(dom.querySelectorAll('a'), (a: any) => {
      a.innerText = a.innerText.replace(/\^/gi, '');
      a.style = `background: #1677ff;
            color: white;
            width: 16px;
            height: 16px;
            display: inline-block;
            font-size: 12px;
            text-align: center;
            margin: 4px;
            border-radius: 8px;`;
    });

    const json = { html: dom.innerHTML };
    return json;
  },
};

function sendMsg(args: any) {
  const { cmd, data } = args || {};
  // console.log('sendMsgsendMsg', cmd, data);

  chrome.runtime.sendMessage({
    cmd,
    data,
  });
  return '';
}

const sendMessageToBackground = {
  'chat-bot-talk': (data: any) =>
    sendMsg({
      cmd: 'chat-bot-talk',
      data,
    }),
  'chat-bot-talk-new': (data: any) =>
    sendMsg({
      cmd: 'chat-bot-talk-new',
      data,
    }),
  'chat-bot-talk-stop': (data: any) =>
    sendMsg({
      cmd: 'chat-bot-talk-stop',
      data,
    }),
  'run-agents': (data: any) =>
    sendMsg({
      cmd: 'run-agents',
      data,
    }),
  'open-url': (data: any) =>
    sendMsg({
      cmd: 'open-url',
      data,
    }),
};

class Main extends React.Component<
  {
    appName: string;
    agents: any;
    databaseId: any;
    blockId: any;
    readability: any;
    fullscreen: boolean;
    initIsOpen: boolean;
    userInput: any;
    initChatBotType: string;
  },
  {
    appName: string;
    title: string;
    // 默认是否开启
    initIsOpen: boolean;
    // 总面板开关
    loading: boolean;
    // 是否全屏
    fullscreen: boolean;
    // 预处理的cot数据
    cardsLoaded: boolean;

    // 全局的禁止操作
    disabledAll: boolean;
    // 加载机器人，初始化
    loadingChatBot: boolean;
    chatBotType: string;
    // 聊天服务是否可用
    chatBotIsAvailable: any;
    // 聊天风格 chatgpt bing
    chatBotStyle: any;
    // 告诉chatbot当前网页的信息
    chatbotInitPrompt: string;

    // 默认的输入
    userInput: any;

    // 是否显示Edit页面
    showEdit: boolean;

    activeIndex: any;
    cards: Array<{}>;
    talks: Array<{}>;
    mixedCards: Array<{}>;

    inputCardDisplay: string;
    promptDisplay: string;
    buttonsDisplay: string;
    expirationTime: number;

    toggleSetup: boolean;
    openMyPrompts: boolean;
    myPrompts: any;

    currentPrompt: any;

    // 当前Prompts内有多少个prompt
    PromptIndex: number;
  }
> {
  constructor(props: any) {
    super(props);

    const defaultChatbot = {
      chatBotType: defaultChatbots[0].type,
      chatBotStyle: {
        label: defaultChatbots[0].style.label,
        value: defaultChatbots[0].style.values[0]?.value,
      },
    };

    // 缓存
    const { chatBotStyle, chatBotType } = JSON.parse(
      localStorage.getItem('_chatBotSelect') || JSON.stringify(defaultChatbot)
    );
    // console.log('缓存', chatBotStyle, chatBotType)
    this.notionFn = null;
    this.state = {
      appName: this.props.appName,
      title: '',
      initIsOpen: this.props.initIsOpen,
      loading: !this.props.initIsOpen,
      fullscreen: this.props.fullscreen,
      activeIndex: undefined,
      cards: [],
      talks: [],

      mixedCards: [],
      // 预处理数据加载
      cardsLoaded: false,
      // 禁止点击
      disabledAll: true,

      loadingChatBot: true,
      chatBotType: this.props.initChatBotType || chatBotType,
      chatBotIsAvailable: undefined,
      chatBotStyle,
      chatbotInitPrompt: '',
      userInput: {
        prompt: '',
        tag: '',
      },

      // 界面控制
      inputCardDisplay: 'none',
      buttonsDisplay: 'none',
      promptDisplay: 'flex',
      // 缓存控制
      expirationTime: 1000 * 60,
      toggleSetup: false,
      openMyPrompts: false,
      myPrompts: [],
      showEdit: false,

      currentPrompt: {},
      PromptIndex: 0,
      output: 'default',
    };

    this.init();

    if (this.props.agents) {
      this.updateChatBotStatus(true);

      // nTalks.push(ChatBotConfig.createTalkData('agents', {}));

      this._getAgentsResult();
      // chrome.storage.local.onChanged.addListener((changes) => {
      //     console.log(changes)
      //     if (changes['run-agents-result'] && changes['run-agents-result'].newValue && !changes['run-agents-result'].oldValue) {
      //         this._getAgentsResult();
      //     }
      // })
    }
  }

  componentDidMount(): void {
    this.props.initIsOpen && message.info('Init Is Open');

    //  is auto open
    const isOpen =
      this.props.fullscreen &&
      this.props.userInput &&
      this.props.userInput.prompt &&
      this.props.initChatBotType;
    // 打开任何网站都会初始化

    this._initBlockAndBot(false);
    if (!this.state.chatBotIsAvailable) this.initChatBot(isOpen);

    if (isOpen || this.props.initIsOpen) {
      // 传参过来的页面
      this.show(false);
    }
    window.addEventListener('message', this.updateList);
    this.notionFn = window.electron.ipcRenderer.on(
      'notion_prompts_back',
      this.getNotionPrompts
    );
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.updateList);
    if (this.notionFn) {
      this.notionFn();
    }
  }

  componentDidUpdate(prevProps: any, prevState: any) {
    // 更新状态
    if (prevState.chatBotType != this.state.chatBotType) {
      this.initChatBot();
    }
  }

  getNotionPrompts = (data, x) => {
    let xData = comboParse(data.results) || [];
    comboDataUpdate(xData);
    chromeStorageGet('user').then((res) => {
      let x = res.user || [];
      this.setState({
        myPrompts: [...xData, ...x],
      });
    });
  };

  _promptOutput(prompt: string, type: string) {
    if (type == 'markdown') {
      prompt = `${prompt},按照markdown格式，输出结果`;
    } else if (type == 'json') {
      prompt = `${prompt},按照json格式，输出结果`;
    }
    return prompt;
  }

  updateList = (evt: any) => {
    const { cmd, data } = evt.data || {};
    if (cmd === 'chat-bot-talk-result') {
      this._updateChatBotTalksResult(data);
    } else if (cmd === 'chat-bot-init-result') {
      this.initChatBot(false);
    }
  };

  init() {
    window.onfocus = (e) => {
      if (document.readyState == 'complete') {
        console.log('激活状态！');
        // _.throttle(() => this._initBlockAndBot(false), 3000)
        // _.throttle(() => this.initChatBot(false), 3000)
        this._updateCurrentTalks();
      }
    };

    // 监听当前页面的显示状态
    document.addEventListener(
      'visibilitychange',
      function () {
        const visibilityState = document.visibilityState == 'hidden' ? 0 : 1;
        if (visibilityState === 0) {
        }
      },
      false
    );

    const titleStyle = `margin: 0;padding: 0;font-size: 16px;border-left: 4px solid #10aeff;padding-left: 6px;font-weight: 800;`;
    const aNumStyle = `color: blue;font-weight: 400; font-size: small;`;
    const linkStyle = `color: blue;background: transparent;width: max-content;`;
    const divStyle = `overflow-x: hidden;white-space: nowrap;text-overflow: ellipsis;`;

    const that = this;

    // 缓存
    let localData: any = localStorage.getItem('_mk003_data');
    if (localData) {
      localData = JSON.parse(localData);
      that.setState(localData);
      console.log('缓存');
    }

    // chrome.runtime.onMessage.addListener(async (
    //     request,
    //     sender,
    //     sendResponse
    // ) => {

    //     const {
    //         cmd, data, success
    //     } = request;

    //     if (cmd == 'open-readability') {
    //         window.location.href = window.location.origin + window.location.pathname + window.location.search + '&reader=1'
    //     } else if (cmd == 'toggle-insight') {
    //         this.setState({ initIsOpen: true });
    //         this.show(false);
    //     } else if (cmd == 'get-block-children-result') {
    //         // 失败
    //         if (!success) return this.show(true);
    //         this.setState({
    //             cardsLoaded: success
    //         });
    //         let result = data.results;
    //         let cards: any = [];
    //         // console.log(result)
    //         for (const r of result) {
    //             let type = r.type;
    //             let content = r[type];
    //             let richText = content.rich_text;

    //             let has_children = r.has_children;
    //             // console.log(type,content)

    //             // 是标题，用于分割内容块
    //             let isTitle = (type === 'heading_1');

    //             // console.log('------', richText)
    //             let text = Array.from(richText, (r: any) => r.plain_text).join('\n'),
    //                 html = '';

    //             if (richText && richText.length > 0) {
    //                 if (type == 'code') {
    //                     // md渲染成html
    //                     let md = new MarkdownIt();
    //                     let result = md.render(text);
    //                     // 处理a标签
    //                     let div = document.createElement('div');
    //                     div.innerHTML = result;
    //                     Array.from(div.querySelectorAll('a'), a => a.setAttribute('target', '_blank'))
    //                     html = div.innerHTML
    //                 } else {
    //                     let richTextResult = [];
    //                     for (const text of richText) {
    //                         if (text.type == 'text') {
    //                             let t = text.href ? `<a
    //       style="${parseInt(text.plain_text.trim()) > 0 ? aNumStyle : linkStyle}"
    //       href='${encodeURI(text.href)}' target='_blank'
    //       >${text.plain_text}</a>` : text.plain_text;
    //                             richTextResult.push(isTitle ? `<h4 style="${titleStyle}">${t}</h4>` : `<span style="${text.href ? divStyle : ''}">${t}</span>`)
    //                         }
    //                     }
    //                     html = richTextResult.join('')
    //                 }
    //                 // console.log(type,text,html)
    //                 cards.push({
    //                     isTitle,
    //                     type,
    //                     text,
    //                     html,
    //                     // 是否有嵌套
    //                     hasChildren: has_children
    //                 })
    //             }
    //         }
    //         ;

    //         // 对cards里的数据分组，根据isTitle
    //         let group = [];
    //         for (const card of cards) {
    //             if (card.isTitle) group.push(new Array());
    //             group[group.length - 1].push(card);
    //         }
    //         ;

    //         // console.log(cards,group)
    //         // 需要嵌入到文章里
    //         let mixedCards: any = [];
    //         // 放到右侧tab里
    //         cards = [];

    //         // 不需要嵌入到文章
    //         for (const g of group) {
    //             cards.push(g)
    //         }

    //         // console.log(mixedCards, cards)
    //         // 判断数据是否正常，决定缓存时长
    //         if (mixedCards.length <= 1 && cards.length <= 0) {
    //             that.setState({
    //                 expirationTime: mixedCards.length <= 1 && cards.length <= 0 ? 1000 : 1000 * 60 * 60 * 24 * 7
    //             })
    //         }
    //         ;

    //         let title = document.title;

    //         let d = {
    //             title,
    //             mixedCards,
    //             cards,
    //             activeIndex: cards.length > 0 ? 0 : undefined,
    //             inputCardDisplay: 'flex',
    //             buttonsDisplay: 'flex'
    //         }
    //         that.setState(d);

    //         // 缓存用来加速
    //         localStorage.setItem('_mk003_data', JSON.stringify(d))

    //         // 显示
    //         that.show(false);
    //     } else if (cmd == 'chat-bot-init-result') {
    //         that.initChatBot(false);
    //     }

    //     sendResponse('我是content，已收到消息')
    //     // sendResponse()
    //     return true;
    // });
  }

  async show(loading: boolean) {
    this.setState({
      loading,
    });
    if (loading == false) {
      Talks.get()
        .then((talks) => {
          if (talks) {
            // 正好要打开面板才会询问
            if (talks && talks.length > 0) {
              const oldTalks = this.state.talks.filter(
                (t: any) => !(t.subType && t.subType == 'current-article')
              );
              if (oldTalks.length == 0) {
                this.setState({
                  talks,
                });
              }
            }
          }
        })
        .catch((e) => null);
    }
  }

  _updateCurrentTalks() {
    Talks.get().then((talks) => {
      this.setState({
        talks,
      });
    });
  }

  _initBlockAndBot(isAutoShow = true) {
    if (this.props.blockId && !this.state.cardsLoaded) {
      // chrome.runtime.sendMessage({
      //     cmd: 'get-block-children',
      //     data: {
      //         blockId: this.props.blockId,
      //         expirationTime: this.state.expirationTime
      //     }
      // },
      //     response => {
      //         // 解决偶尔获取不到的情况
      //         if (!response) setTimeout(() => this._initBlockAndBot(), 100)
      //     }
      // );
    } else if (isAutoShow) {
      this.show(false);
    }
  }

  _getChatBotFromLocal() {
    let chatBotAvailables = localStorage.getItem('chatBotAvailables');
    try {
      chatBotAvailables = JSON.parse(chatBotAvailables);
    } catch (e) {}
    console.log('chatBotAvailables==========>', chatBotAvailables);
    if (chatBotAvailables && chatBotAvailables.length > 0) {
      chatBotAvailables = chatBotAvailables.filter(
        (n: any) => n && n.type == this.state.chatBotType && n.available
      );
      const isHas = chatBotAvailables.length > 0;
      console.log(
        '##聊天服务状态',
        Array.from(chatBotAvailables, (a: any) => {
          if (a && a.available) {
            return `${a.available.success} ${a.type}`;
          }
        }).join('\n')
      );
      if (isHas) {
        return Promise.resolve({
          // 获取this.state.chatBotType
          type: chatBotAvailables[0].type,
          available: chatBotAvailables[0].available,
        });
      }
    }
    return Promise.resolve(null);
  }

  // 用来判断聊天是否有效
  initChatBot(isAutoShow = true) {
    return new Promise((res: any, rej) => {
      this._getChatBotFromLocal()
        .then((data: any) => {
          if (data) {
            this.setState({
              // 先获取第一个
              chatBotType: data.type,
              chatBotIsAvailable: data.available.success,
              chatBotStyle: data.available.style,
              chatbotInitPrompt:
                this.props.userInput && this.props.userInput.prompt
                  ? this.props.userInput.prompt
                  : '',
              loadingChatBot: false,
              disabledAll: !!this.props.agents,
              // initIsOpen: true
            });
            // console.log('chatbotInitPrompt', this.state.chatbotInitPrompt);
            if (isAutoShow) {
              // 自动显示，从newtab过来的
              this.show(false);
            }

            res(data.available && data.available.success);
          } else if (!data) {
            setTimeout(
              () =>
                this.setState({
                  disabledAll: !!this.props.agents,
                  loadingChatBot: false,
                  // initIsOpen: true
                }),
              3000
            );
          }

          res(data);
        })
        .catch((e) => null);
    });
  }

  updateChatBotStatus(isLoading: boolean) {
    this.setState({
      disabledAll: isLoading,
    });
  }

  /**
   * 绑定当前页面信息
   */
  _promptBindCurrentSite(prompt: string) {
    // 获取当前网页正文信息
    const { length, title, textContent, href } = this._extractArticle();
    if (prompt) {
      prompt = `<tag>标题:${title},网址:${href},正文:${textContent.slice(
        0,
        1000
      )}</tag>${prompt}`;
    }
    return prompt;
  }

  async _getPromptsData() {
    const prompts: any[] = [];
    const res: any = await chromeStorageGet(['user', 'official']);

    if (res && res.user)
      for (const userPrompt of res.user) {
        prompts.push(userPrompt);
      }

    if (res && res.official)
      for (const officialPrompt of res.official) {
        prompts.push(officialPrompt);
      }

    // console.log(prompts)

    return prompts;
  }

  // TODO 需要放到某个监听里，来更新对话数据
  _updateChatBotTalksResult(items: any) {
    // 对话数据
    const { talks } = this.state;
    // 更新到这里
    let nTalks = [...talks];

    let promptFromLocal = null;

    /* eslint-disable-next-line */
    for (const data of items) {
      // 是否清楚思考状态
      let isCanClearThinking = false;

      // 如果是本地缓存
      if (data.from === 'local' && !promptFromLocal) {
        promptFromLocal = data.prompt;
        // console.log('对话状态关闭')
        isCanClearThinking = true;
        setTimeout(() => this.updateChatBotStatus(false), 100);
      }

      if (data.type == 'start') {
        // 需补充此状态
        // 对话状态开启
        console.log('对话状态开启');
        this.updateChatBotStatus(true);
      } else if (data.type == 'markdown' || data.type == 'done') {
        // markdown 如果 data.from == 'local' 则isNew=true
        isCanClearThinking = !!data.markdown;

        // 检查talk的id，type，需要做对话原文的更新
        let isNew = true;
        for (let index = 0; index < talks.length; index++) {
          const talk: any = talks[index];
          if (
            talk.tId == data.tId &&
            talk.type == 'markdown' &&
            data.markdown
          ) {
            nTalks[index] = {
              ...nTalks[index],
              ...Talks.createTalkBubble(data.markdown),
            };
            isNew = false;
          }
        }

        if ((isNew || data.from == 'local') && data.markdown) {
          // 新对话
          const d = { ...data, ...Talks.createTalkBubble(data.markdown) };
          nTalks.push(d);
          // 对话状态开启
          // console.log('对话状态开启')
          this.updateChatBotStatus(true);
        }

        if (data.type == 'done') {
          let { PromptIndex } = this.state;
          let isNextUse = false;
          // console.log('done', this.state.currentPrompt.combo, PromptIndex)
          // 无限循环功能
          if (
            this.state.currentPrompt.combo &&
            this.state.currentPrompt.isInfinite &&
            this.state.currentPrompt.combo > 1
          ) {
            if (this.state.currentPrompt.combo <= PromptIndex) {
              // 结束的时候，循环起来
              // 当前的prompt
              const currentPrompt =
                this.state.currentPrompt[
                  `prompt${this.state.currentPrompt.combo}`
                ];
              isNextUse = !!currentPrompt.isNextUse;
              PromptIndex = 0;
            }
          }
          // console.log('1无限循环功能', isNextUse, PromptIndex);
          // this.state.isAuto == true
          if (this.state.currentPrompt.combo > PromptIndex) {
            if (PromptIndex > 0) {
              const prePrompt =
                this.state.currentPrompt[
                  `prompt${PromptIndex > 1 ? PromptIndex : ''}`
                ];
              // 如果有isNextUse
              isNextUse = !!prePrompt.isNextUse;
            }

            PromptIndex += 1;
            const prompt = JSON.parse(
              JSON.stringify(
                this.state.currentPrompt[
                  `prompt${PromptIndex > 1 ? PromptIndex : ''}`
                ]
              )
            );

            if (isNextUse) {
              const laskTalk = Talks.getLaskTalk([...nTalks]);
              prompt.text = `${
                laskTalk ? `\`\`\`背景信息：${laskTalk}\`\`\`,` : ''
              }${prompt.text}`;
            }
            // console.log('prompt', prompt,PromptIndex);
            // 下一个prompt
            const data: any = {
              prompt,
              newTalk: true,
            };
            if (prompt.queryObj && prompt.queryObj.isQuery) {
              data._combo = this.state.currentPrompt;
            }

            this.setState({
              PromptIndex,
              disabledAll: true,
            });

            setTimeout(
              () =>
                this._control({
                  cmd: 'send-talk',
                  data,
                }),
              500
            );
          } else {
            // this._promptControl({ cmd: 'stop-combo' });
            setTimeout(() => {
              this._control({ cmd: 'stop-talk' });
            }, 500);
          }
        }
      } else if (data.type == 'urls') {
        // console.log(data)

        nTalks.push(
          ChatBotConfig.createTalkData('urls', {
            buttons: Array.from(data.urls, (url: any) => {
              return {
                from: url.from,
                data: {
                  ...url,
                },
              };
            }),
          })
        );

        // 推荐的链接
        // {"tId":"434d59ee-3742-4172-8d31-67e0af0ec0c9","id":"434d59ee-3742-4172-8d31-67e0af0ec0c92","morePrompts":[{"tag":"谢谢你，这很有帮助。","prompt":"谢谢你，这很有帮助。","from":"Bing"},{"tag":"新必应有什么优势？","prompt":"新必应有什么优势？","from":"Bing"},{"tag":"新必应如何保护我的隐私？","prompt":"新必应如何保护我的隐私？","from":"Bing"}],"user":false,"type":"suggest","from":"ws"}
      } else if (data.type == 'suggest') {
        // 提示词
        // console.log(data)

        nTalks.push(
          ChatBotConfig.createTalkData('more-prompts', {
            buttons: Array.from(data.morePrompts, (prompt: any) => {
              return {
                from: prompt.from,
                data: {
                  ...prompt,
                },
              };
            }),
          })
        );
      } else if (data.type == 'error') {
        const d = { ...data, ...Talks.createTalkBubble(data.markdown) };
        nTalks.push(d);

        // 错误状态，把信息吐给用户
        isCanClearThinking = true;
        this.updateChatBotStatus(false);
      }

      // 清空type thinking 的状态
      if (isCanClearThinking) nTalks = Talks.clearThinking(nTalks);
    }

    if (promptFromLocal) {
      // 因为是从本地获取的数据,需要添加是否新建对话?

      nTalks.push(
        ChatBotConfig.createTalkData('send-talk-refresh', {
          data: {
            tag: '刷新',
            prompt: {
              text: promptFromLocal,
            },
            // 用来强制刷新获取新的对话
            newTalk: true,
          },
        })
      );
    }
    // console.log('nTalks:', nTalks)
    this.setState({
      talks: nTalks, // 保存对话内容 一句话也可以是按钮
    });

    // 把对话内容保存到本地
    Talks.save(nTalks);
  }

  _chatBotSelect(res: any) {
    if (res.type == 'ChatGPT' || res.type == 'Bing') {
      const data = {
        chatBotType: res.type,
        chatBotStyle: res.style,
      };
      this.setState({
        ...data,
      });
      console.log(data);
      localStorage.setItem('_chatBotSelect', JSON.stringify(data));
    }
  }

  sendPropmt(promptData: any) {
    const combo = {
      ...defaultCombo,
      prompt: {
        ...defaultPrompt,
        text: promptData?.prompt,
      },
    };

    let xData = {
      prompt: combo.prompt,
      tag: promptData?.tag,
      _combo: combo,
    };

    this._control({
      cmd: 'send-talk',
      data: xData,
    });
  }

  async _control(event: any) {
    // 从ChatBotInput输入里返回的数据
    // cmd: new-talk、stop-talk、left-button-action、send-talk
    //    {cmd:'send-talk' ,data:{prompt,tag}}
    console.log('_control:', event);
    if (event && event.cmd) {
      const { cmd, data } = event;
      // 对话数据
      const { talks } = this.state;
      // 更新到这里
      let nTalks = [...talks];

      const sendTalk = () => {
        let { prompt, tag, newTalk } = data;
        prompt = JSON.parse(JSON.stringify(prompt));
        const combo = data._combo ? data._combo.combo : -1;

        // 清空type thinking && suggest 的状态
        nTalks = nTalks.filter(
          (n) => n.type === 'talk' || n.type === 'markdown'
        );
        this.updateChatBotStatus(true);

        if (tag)
          nTalks.push(ChatBotConfig.createTalkData('tag', { html: tag }));

        // 增加思考状态
        nTalks.push(ChatBotConfig.createTalkData('thinking', {}));

        this.setState({
          userInput: {
            prompt: '',
            tag: '',
          },
          chatbotInitPrompt: '',
          openMyPrompts: false,
        });

        // console.log(`prompt需要改造数据格式：{text,isNextUse,bindCurrentPage,queryObj}`, prompt, data)
        // return
        if (prompt.bindCurrentPage) {
          prompt.text = this._promptBindCurrentSite(prompt.text);
        }

        if (combo > 0 && prompt.output != 'default') {
          prompt.text = this._promptOutput(prompt.text, prompt.output);
        } else if (combo == -1 && this.state.output != 'default') {
          // 从输入框里输入的
          prompt.text = this._promptOutput(prompt.text, this.state.output);
        }

        if (prompt.queryObj && prompt.queryObj.isQuery && !this.props.agents) {
          // 如果是query，则开始调用网页代理 ,&& 避免代理页面也发起了新的agent
          //
          this.updateChatBotStatus(false);

          const agentsJson = JSON.parse(
            JSON.stringify({
              url: prompt.queryObj.url,
              query: prompt.queryObj.query,
              combo: {
                ...data._combo,
                PromptIndex: cmd == 'combo' ? 1 : this.state.PromptIndex,
              }, // 用来传递combo数据
            })
          );

          // 需要把当前面板的状态停止
          this._promptControl({ cmd: 'stop-combo' });

          sendMessageToBackground['run-agents'](agentsJson);
        } else {
          sendMessageToBackground['chat-bot-talk']({
            prompt: prompt.text,
            type: this.state.chatBotType,
            style: this.state.chatBotStyle.value,
            newTalk: !!newTalk,
          });
        }
      };

      switch (cmd) {
        // 打开配置
        case 'open-setup':
          this.setState({
            toggleSetup: true,
          });
          return;
        case 'close-setup':
          this.setState({
            toggleSetup: false,
          });
          return;
        case 'copy-action':
          // console.log(`copy success`)
          message.info(`copy success`);
          return;
        // 打开官网
        case 'open-url':
          sendMessageToBackground['open-url']({ url: data.url });
          return;
        // 打开我的prompts
        case 'left-button-action':
          this._getPromptsData().then((prompts: any) => {
            this.setState({
              openMyPrompts: true,
              myPrompts: prompts,
            });
          });
          return;
        case 'chatbot-select':
          this._chatBotSelect(data);
          return;
        case 'close-chatbot-panel':
          window.electron.ipcRenderer.send('dbt_close_app', {
            a: 1,
            b: { d: 'c' },
          });
          // this.show(!this.state.loading);
          return;
        // case "toggle-fullscreen":
        //     this.setState({
        //         fullscreen: !this.state.fullscreen
        //     });
        //     return
        case 'activate-chatbot':
          console.log('activate-chatbot');
          return;
        case 'show-combo-modal':
          this._promptControl({ cmd, data });
          return;
        case 'close-combo-editor':
          this._promptControl({ cmd });
          return;
        case 'Bing':
          // urls,prompts
          console.log('Bing:::', data);
          if (data.url) {
            sendMessageToBackground['open-url']({ url: data.url });
          } else if (data.prompt) {
            this.sendPropmt(data);
          }
          return;
        // 用户点击建议
        case 'combo':
          // console.log('combo:开始运行:', data)
          this._promptControl({
            cmd: 'update-prompt-for-combo',
            data: { prompt: { ...data._combo }, from: 'fromFlow' },
          });
          sendTalk();
          break;
        // 用户发送对话
        case 'send-talk':
          if (data._combo)
            this._promptControl({
              cmd: 'update-prompt-for-combo',
              data: { prompt: data._combo, from: 'fromFlow' },
            });
          sendTalk();
          break;
        case 'send-talk-refresh':
          sendTalk();
          break;
        // 终止对话
        case 'stop-talk':
          sendMessageToBackground['chat-bot-talk-stop']({
            type: this.state.chatBotType,
          });
          this.updateChatBotStatus(false);
          // 清空type thinking 的状态
          nTalks = Talks.clearThinking(nTalks);

          break;
        // 新建对话
        case 'new-talk':
          nTalks = [];
          // 先获取
          const buttons = Array.from(await this._getPromptsData(), (d) => {
            // TODO 改造逻辑
            // const nd = this._promptBindCurrentSite(d)
            // console.log('改造逻辑', d)
            return d.checked
              ? {
                  from: 'combo',
                  data: {
                    combo: d.combo,
                    tag: d.tag,
                    prompt: d.prompt,
                    // 强制刷新
                    newTalk: true,
                    _combo: d,
                  },
                }
              : null;
          }).filter((b: any) => b);

          if (buttons && buttons.length > 0) {
            nTalks = [ChatBotConfig.createTalkData('new-talk', { buttons })];
          }

          sendMessageToBackground['chat-bot-talk-new']({
            type: this.state.chatBotType,
            newTalk: true,
          });

          break;

        case 'output-change':
          this.setState({
            output: data.output,
          });
          break;

        default:
          console.log('default');
        // // 初始化bing
      }

      this.setState({
        talks: nTalks, // 保存对话内容 一句话也可以是按钮
      });

      // 把对话内容保存到本地
      Talks.save(nTalks);
    }
  }

  /**
   *
   * @param type add 、 delete
   * @param data { tag,checked,bind,owner,combo,prompt,prompt2... }
   */
  _promptUpdateUserData(type = 'add', data: any) {
    const { id } = data;
    chromeStorageGet(['user']).then((items: any) => {
      const oldData = items.user || [];
      const newData = oldData.filter((od: any) => od.id != id);

      if (type === 'add') newData.push(data);

      if (newData.length > 5) {
        message.info('已达到最大存储数量');
        // message.error('已达到最大存储数量');
      }

      chromeStorageSet({ user: newData }).then(() => this._promptRefreshData());
    });
  }

  _promptRefreshData() {
    chromeStorageGet(['user', 'official']).then((res: any) => {
      let prompts: any = [];

      if (res.user) {
        prompts = [...res.user];
      }

      if (res.official) {
        prompts = [...prompts, ...res.official];
      }
      console.log('_promptRefreshData', prompts);
      this.setState({
        myPrompts: prompts,
        showEdit: false,
      });
    });
  }

  /*
    bind: false,checked: true,combo:2,id:"187a3184aab",owner:"user",prompt: "1",prompt2: "2",tag:"test"
    */

  _promptControl = (event: any) => {
    const { cmd, data } = event;

    if (cmd == 'update-prompt-for-combo') {
      const { prompt, from } = data;

      const d = {
        PromptIndex: prompt.PromptIndex != undefined ? prompt.PromptIndex : 1,
        currentPrompt: prompt,
        disabledAll: true,
      };
      console.log('update-prompt-for-combo', prompt, from, d);
      this.setState(d);
    } else if (cmd == 'show-combo-modal') {
      // console.log("show-combo-modal",data)
      const { prompt, from } = data;
      if (prompt)
        this.setState({
          showEdit: true,
          openMyPrompts: true,
          currentPrompt: prompt,
        });
    } else if (cmd == 'edit-combo-finish') {
      console.log('edit-on-finish', data);
      const { prompt, from } = data;
      if (data) this._promptUpdateUserData('add', prompt);
    } else if (cmd == 'edit-combo-cancel') {
      // 取消，关闭即可
      this.setState({
        showEdit: false,
        openMyPrompts: this.state.openMyPrompts,
      });
    } else if (cmd == 'delete-combo-confirm') {
      const { prompt, from } = data;
      // 删除
      this._promptUpdateUserData('delete', prompt);
    } else if (cmd == 'close-combo-editor') {
      this.setState({
        showEdit: false,
        openMyPrompts: false,
      });
    } else if (cmd == 'stop-combo') {
      this.setState({
        PromptIndex: 0,
        currentPrompt: null,
      });
      this.updateChatBotStatus(false);
    }
  };

  _getAgentsResult() {
    chromeStorageGet('run-agents-result')
      .then((res: any) => {
        console.log('_getAgentsResult', res);
        if (res && res['run-agents-result']) {
          const { combo } = res['run-agents-result'];

          this._promptControl({
            cmd: 'update-prompt-for-combo',
            data: { prompt: combo, from: 'fromFlow' },
          });
          setTimeout(() => {
            this._updateChatBotTalksResult([
              {
                type: 'done',
                markdown: res['run-agents-result'].markdown,
                tId: new Date().getTime(),
              },
            ]);
            chromeStorageSet({ 'run-agents-result': null });
          }, 1000);
        }
      })
      .catch((e) => null);
  }

  _extractArticle() {
    const documentClone: any = document.cloneNode(true);
    const article: any = new Readability(documentClone, {
      nbTopCandidates: 2,
    }).parse();
    article.href = window.location.href.replace(/\?.*/gi, '');
    return article;
  }

  _doChatBotData() {
    const cards: any = this.state.cards || [];

    const subjects = [
      {
        type: 'chatbot',
        text: '聊天',
        index: -1,
      },
      ...Array.from(cards, (cs: any, index) => {
        return { ...cs.filter((c: any) => c.isTitle)[0], index };
      }),
    ];

    let activeIndex =
      this.state.activeIndex === undefined ? 0 : this.state.activeIndex;

    if (cards.length == 0) activeIndex = -1;

    let talks: any = [...this.state.talks];

    // content内容展示预处理还是聊天
    // let datas: any = ((cards[subjects.filter((s: any) => s.index == activeIndex)[0]?.index] || []).filter((f: any) => !f.isTitle)) || [];
    // if (activeIndex == -1) datas = [...this.state.talks];

    // console.log(this.state.chatBotIsAvailable, activeIndex)

    // 聊天服务无效,补充提示
    if (!this.state.chatBotIsAvailable && activeIndex == -1) {
      talks = talks.filter(
        (d: any) => d.type == 'markdown' || d.type == 'talk' || d.type == 'done'
      );
      talks.push(
        ChatBotConfig.createTalkData('chatbot-is-available-false', {
          hi: this.state.chatBotType,
        })
      );
    }

    const datas = [talks, ...cards];

    // 添加prompts , 服务有效，聊天tab
    // if (datas.length === 0 && this.state.chatBotIsAvailable && activeIndex == -1) {
    //     // this._control({
    //     //     cmd: 'new-talk'
    //     // })
    // }

    const tabList = Array.from(subjects, (subject) => {
      return {
        key: subject.text,
        tab: subject.text,
        index: subject.index,
      };
    });
    // console.log(tabList, datas)
    return {
      tabList,
      datas,
      activeIndex,
    };
  }

  render() {
    const { tabList, datas, activeIndex } = this._doChatBotData();
    const { initIsOpen, loading, toggleSetup, openMyPrompts, showEdit } =
      this.state;
    return (
      <FlexColumn
        translate="no"
        style={{ pointerEvents: 'auto' }}
        display={
          this.state.initIsOpen
            ? this.state.loading
              ? 'none'
              : 'flex'
            : 'none'
        }
      >
        {!this.state.loadingChatBot && this.state.openMyPrompts ? (
          <ComboEditor
            myPrompts={this.state.myPrompts}
            callback={(event: any) => this._control(event)}
          />
        ) : (
          ''
        )}
        {this.state.showEdit && (
          <ComboModal
            currentPrompt={this.state.currentPrompt}
            callback={(e: any) => this._promptControl(e)}
          />
        )}
        {this.state.toggleSetup && (
          <Setup callback={(event: any) => this._control(event)} />
        )}
        {!this.state.toggleSetup && !this.state.openMyPrompts && (
          <ChatBotPanel
            name={this.state.appName}
            tabList={tabList}
            activeIndex={activeIndex}
            datas={datas}
            fullscreen={this.state.fullscreen}
            disabled={this.state.disabledAll}
            callback={(e: any) => this._control(e)}
            config={Array.from(defaultChatbots, (c: any) => {
              c.checked = c.type == this.state.chatBotType;
              return c;
            })}
          />
        )}
      </FlexColumn>
    );
  }
}

export default Main;
