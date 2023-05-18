import React from 'react';
import {
  Space,
  Divider,
  Tag,
  Typography,
  Input,
  Button,
  Select,
  Popover,
  Spin,
  Card,
} from 'antd';

import { QuestionCircleOutlined, CloseOutlined } from '@ant-design/icons';
import chrome from '@/utils/chrome';
import { chromeStorageGet, chromeStorageSet } from '@/components/Utils';

const { Title, Text } = Typography;

class Setup extends React.Component<
  {
    callback: any;
  },
  {
    os: any;
    chatGPTToken: string;
    chatGPTAPIs: any;
    chatGPTAPI: string;
    chatGPTModels: any;
    chatGPTModel: string;
    status: any;
    shortcut: string;
    loading: boolean;
    checked: boolean;
  }
> {
  constructor(props: any) {
    super(props);
    this.state = {
      os: 'win',
      chatGPTToken: '',
      chatGPTAPIs: ['https://api.openai.com'],
      chatGPTAPI: 'https://api.openai.com',
      chatGPTModels: ['gpt-3.5-turbo'],
      chatGPTModel: 'gpt-3.5-turbo',
      status: {
        Bing: '-',
        ChatGPT: '-',
      },
      shortcut: '',
      loading: false,
      checked: false,
    };

    // window.onstorage = () => {
    //   console.log('onstorageonstorageonstoragezzzzzzzzzzzzzzzz')
    //   this._updateChatBotAvailables();

    // }

    // chrome.storage.sync.onChanged.addListener(() => {
    //   this._updateChatBotAvailables();
    // });

    // setTimeout(() => this._updateChatBotAvailables(), 3000);
  }

  handleMessage = (evt: any) => {
    const { cmd, data } = evt.data || {};

    if (cmd === 'chat-bot-init-result') {
      this._updateChatBotAvailables();
    }
  };

  _check(data = {}, checked = false) {
    if (checked === false) {
      localStorage.removeItem('chatBotAvailables');
      chrome.runtime.sendMessage({
        cmd: 'chat-bot-init',
        data,
      });

      this.setState({
        checked: true,
      });
    }
  }

  _update() {
    if (this.state.loading) {
      this.setState({
        loading: false,
      });
      return;
    }
    const { chatGPTAPI, chatGPTModel, chatGPTToken } = this.state;
    const myConfig = { chatGPTAPI, chatGPTModel, chatGPTToken };
    chromeStorageSet({ myConfig });

    // bg 初始化chatbot
    this._check(myConfig, false);

    this.setState({
      loading: true,
    });
  }

  _updateChatBotAvailables() {
    let chatBotAvailables = window.localStorage.getItem('chatBotAvailables');
    const myPoints = window.localStorage.getItem('myPoints');
    try {
      if (chatBotAvailables) {
        chatBotAvailables = JSON.parse(chatBotAvailables);
      }
    } catch (e) {}
    if (chatBotAvailables) {
      // 判断 c.available.success == false or true
      // UnauthorizedRequest
      // Forbidden
      // ChatGPT API key not set
      const status: any = {};
      Array.from(chatBotAvailables, (c: any) => {
        if (c && c.available && c.available.success) {
          status[c.type] = 'OK';
        } else if (c && c.available && c.available.success == false) {
          status[c.type] = c.available.info || '';
        }
      });
      console.log(status);
      this.setState({
        status,
        loading: false,
      });
    }
    if (myPoints) {
      // api2d
      console.log(myPoints);
    }
  }

  componentDidMount() {
    window.addEventListener('message', this.handleMessage);
    chromeStorageGet('myConfig').then((res: any) => {
      const { myConfig } = res || {};
      if (
        myConfig &&
        myConfig.chatGPTAPI &&
        !this.state.chatGPTAPIs.includes(myConfig.chatGPTAPI)
      ) {
        this.state.chatGPTAPIs.push(myConfig.chatGPTAPI);
      }
      this.setState(myConfig, () => {
        this._update();
      });
    });
    chrome.runtime.sendMessage({ cmd: 'get-my-points-for-api2d' });
  }

  componentWillUnmount(): void {
    window.removeEventListener('message', this.handleMessage);
  }

  render(): JSX.Element {
    return (
      <Card
        title="设置"
        className="head-dragalbe"
        bordered
        headStyle={{
          userSelect: 'none',
          border: 'none',
          fontSize: 24,
          fontWeight: 'bold',
        }}
        bodyStyle={{
          // flex: 1,
          padding: '24px 24px 8px 24px',
          height: '100%',
          overflowY: 'scroll',
          paddingBottom: '99px',
        }}
        extra={
          <div>
            <Button
              icon={<CloseOutlined style={{ fontSize: 20 }} />}
              style={{
                position: 'absolute',
                top: 10,
                right: 20,
                border: 0,
                zIndex: 22,
                boxShadow: 'none',
              }}
              className="nodragarea"
              onClick={() => {
                if (this.props.callback)
                  this.props.callback({
                    cmd: 'close-setup',
                  });
              }}
            />
          </div>
        }
        style={{
          width: '100vw',
          padding: '0px',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}
      >
        <Spin spinning={this.state.loading}>
          {/* <Title level={4} style={{ marginTop: 0 }}>
            快捷键设置
          </Title>
          <Space direction="horizontal" align="center">
            <Text style={{ fontSize: 'medium', marginRight: 10 }}>
              {this.state.shortcut}
            </Text>
            <Button
              onClick={() =>
                chrome.runtime.sendMessage({
                  cmd: 'set-shortcuts',
                })
              }
            >
              修改
            </Button>
          </Space>

          <Divider style={{ marginTop: 10, marginBottom: 10 }} /> */}
          <Title level={4} style={{ marginTop: 0 }}>
            Bing Chat设置
          </Title>
          {(() => {
            if (this.state.status.Bing == 'OK') {
              return <Tag color="#87d068">当前可用</Tag>;
            }
            return (
              <Space direction="vertical">
                <Space
                  direction="horizontal"
                  size={0}
                  style={{ marginBottom: 10 }}
                >
                  <Tag color="#cd201f">Bing未授权</Tag>
                  <Popover
                    zIndex={1200}
                    content={<div>Bing Chat无法使用，请重新登录Bing账号</div>}
                    title="相关建议"
                  >
                    <QuestionCircleOutlined
                      style={{ fontSize: 20, color: '#cd201f' }}
                    />
                  </Popover>
                </Space>
                <Button
                  onClick={() => {
                    window.electron.ipcRenderer.send('bing_login');
                    // chrome.runtime.sendMessage({
                    //   cmd: 'open-url',
                    //   data: { url: 'https://www.bing.com' },
                    // });
                    // setTimeout(() => chrome.runtime.sendMessage({
                    //     cmd: 'chat-bot-init'
                    // }), 2000)
                  }}
                >
                  登录Bing账号
                </Button>
              </Space>
            );
            // return (
            //   <Space
            //     direction="horizontal"
            //     size={0}
            //     style={{ marginBottom: 0 }}
            //   >
            //     <Tag color="#cd201f">环境异常 {this.state.status.Bing}</Tag>
            //     <Popover
            //       zIndex={1200}
            //       content={<div>Bing Chat无法使用，请检查网络配置</div>}
            //       title="相关建议"
            //     >
            //       <QuestionCircleOutlined
            //         style={{ fontSize: 20, color: '#cd201f' }}
            //       />
            //     </Popover>
            //   </Space>
            // );
          })()}
          <Divider style={{ marginTop: 10, marginBottom: 10 }} />
          <Title level={4} style={{ marginTop: 0 }}>
            ChatGPT设置
          </Title>
          {(() => {
            if (this.state.status.ChatGPT == 'OK') {
              return <Tag color="#87d068">当前可用</Tag>;
            }
            return (
              <Space direction="horizontal" size={0}>
                <Tag color="#cd201f">暂不可用 {this.state.status.ChatGPT}</Tag>
                <Popover
                  zIndex={1200}
                  content={
                    <div>ChatGPT无法使用，请检查网络或者重新配置API Key</div>
                  }
                  title="相关建议"
                >
                  <QuestionCircleOutlined
                    style={{ fontSize: 20, color: '#cd201f' }}
                  />
                </Popover>
              </Space>
            );
          })()}
          <Space direction="vertical" size="small" style={{ display: 'flex' }}>
            <Title level={5} style={{ marginTop: 0, marginBottom: 0 }}>
              API Key设置
            </Title>
            <Input.Password
              placeholder="input token"
              value={this.state.chatGPTToken}
              onChange={(e: any) => {
                this.setState({
                  chatGPTToken: e.target.value,
                });
              }}
            />

            <Title level={5} style={{ marginTop: 10, marginBottom: 0 }}>
              API Host设置
            </Title>
            <Select
              maxTagCount={3}
              mode="tags"
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="https://api.openai.com"
              value={this.state.chatGPTAPI}
              onChange={(e: any) => {
                console.log(e);
                this.setState({
                  chatGPTAPI: e[0],
                });
              }}
              options={Array.from(this.state.chatGPTAPIs, (c) => {
                return {
                  value: c,
                  label: c,
                };
              })}
            />
            <Title level={5} style={{ marginTop: 10, marginBottom: 0 }}>
              API Model设置
            </Title>

            <Select
              maxTagCount={3}
              mode="tags"
              optionFilterProp="label"
              placeholder={this.state.chatGPTModels[0]}
              style={{ width: '100%' }}
              value={this.state.chatGPTModel}
              onChange={(value: any) => {
                console.log(value);
                this.setState({
                  chatGPTModel: value[0],
                });
              }}
              options={Array.from(this.state.chatGPTModels, (c) => {
                return {
                  value: c,
                  label: c,
                };
              })}
            />
          </Space>
        </Spin>
        <Space direction="horizontal">
          <Button style={{ marginTop: 10 }} onClick={() => this._update()}>
            {this.state.loading ? '更新中' : '更新状态'}
          </Button>
        </Space>
      </Card>
    );
  }
}

export default Setup;
