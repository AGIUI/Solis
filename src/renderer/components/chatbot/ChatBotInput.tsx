import * as React from 'react'

import { Card, Button, Input } from 'antd'
import {
  PlusOutlined,
  SendOutlined,
  SettingOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import { defaultCombo, defaultPrompt } from '../combo/ComboData'

const { TextArea } = Input

/**
 * <ChatBotInput callback={({data,cmd})=>{console.log(cmd,data)}} isLoading={false} leftButton={label:'My Prompts'}/>
 *
 */

type PropType = {
  /** 回调
   * 返回cmd：New-talk、Send-talk、Stop-talk、left-button-action
   * {cmd,data:{ prompt,tag,}}
   */
  callback: any

  /** isLoading 正在加载
   * 状态：true - 禁用输入 、 false - 可以输入
   */
  isLoading: boolean

  /**
   * leftButton
   */
  leftButton: {
    label: string
  }

  [propName: string]: any
}

type StateType = {
  name: string
  isLoading: boolean
  userInput: {
    prompt: string
    tag: string
  }
  placeholder: string
  userSelected: boolean
}

interface ChatBotInput {
  state: StateType
  props: PropType
}

const buttonStyle = {
  outline: 'none',
  border: 'none'
}
const buttonMainStyle = {
  outline: 'none',
  border: 'none',
  color: '#fff',
  backgroundColor: '#1677ff',
  boxShadow: '0 2px 0 rgb(5 145 255 / 10%)'
}
const flexStyle = {
  display: 'flex',
  justifyContent: 'start',
  alignItems: 'center',
  marginTop: '4px'
}

class ChatBotInput extends React.Component {
  constructor (props: any) {
    super(props)
    this.state = {
      name: 'ChatBotInput',
      isLoading: this.props.isLoading,
      userInput: {
        prompt: '',
        tag: ''
      },
      placeholder: 'Ask or search anything',
      userSelected: false
    }

    document.addEventListener('selectionchange', () => {
      const text = this._userSelection()

      this.setState({
        placeholder:
          text.length > 0 ? this._userSelection() : 'Ask or search anything',
        userSelected: text.length > 0
      })
    })
  }

  componentDidUpdate (prevProps: any, prevState: any) {
    if (this.props.isLoading != prevState.isLoading) {
      this.setState(
        {
          isLoading: this.props.isLoading
        },
        () => {
          if (!this.props.isLoading && this.inputRef) {
            this.inputRef.focus()
          }
        }
      )
    }
  }

  _userSelection () {
    const selObj: any = window.getSelection()
    // let textContent = selObj.type !== 'None' ? (selObj.getRangeAt(0)).startContainer.textContent : '';
    const textContent = selObj.toString()
    return textContent.trim()
  }

  _newTalk () {
    this.props.callback({
      cmd: 'new-talk'
    })
  }

  _sendTalk (userInput: any = {}) {
    // console.log(userInput)
    const prompt = (
      userInput && userInput.prompt ? userInput.prompt : ''
    ).trim()
    const tag = (userInput && userInput.tag ? userInput.tag : '').trim()

    if (prompt) {
      const combo = {
        ...defaultCombo,
        prompt: {
          ...defaultPrompt,
          text: prompt
        }
      }
      this.props.callback({
        cmd: 'send-talk',
        data: {
          prompt: combo.prompt,
          tag,
          _combo: combo
        }
      })
      this.setState({
        userInput: {
          prompt: '',
          tag: ''
        },
        isLoading: true
      })
    }
  }

  _userSelectionAdd () {
    this.setState({
      userInput: {
        prompt: this.state.placeholder,
        tag: this.state.placeholder
      }
    })
  }

  _leftBtnClick () {
    // window.postMessage({cmd: 'left-button-action'}, '*')
    window.electron.ipcRenderer.send('notion_prompts')
    this.props.callback({
      cmd: 'left-button-action'
    })
  }

  _onPressEnter (e: any) {
    if (e.shiftKey === false && e.key == 'Enter' && !this.state.isLoading) {
      this._sendTalk(this.state.userInput)
    }
  }

  _sendBtnClick () {
    if (this.state.isLoading) {
      this.props.callback({
        cmd: 'stop-talk'
      })
      this.setState({
        isLoading: false
      })
    } else {
      this._sendTalk(this.state.userInput)
    }
  }

  render () {
    return (
      <Card
        type='inner'
        bordered={false}
        translate='no'
        style={{ boxShadow: 'none' }}
        bodyStyle={{
          padding: '4px',
          background: 'rgb(238, 238, 238)',
          marginBottom: '16px',
          border: 'none'
        }}
        actions={[
          <div style={flexStyle}>
            {this.props.leftButton && this.props.leftButton.label ? (
              <Button
                style={buttonStyle}
                type='dashed'
                icon={<SettingOutlined />}
                onClick={() => this._leftBtnClick()}
                disabled={this.state.isLoading}
              >
                {this.props.leftButton.label}
              </Button>
            ) : (
              ''
            )}
          </div>,
          <div
            style={{
              ...flexStyle,
              justifyContent: 'flex-end'
            }}
          >
            {/* {
                            this.state.userSelected ? <Button
                                style={buttonStyle}
                                type="dashed"
                                icon={<PlusOutlined />}
                                onClick={() => this._userSelectionAdd()}
                            >已选 {this.state.placeholder.length}</Button> : ''
                        } */}

            <Button
              style={{
                ...buttonStyle,
                marginRight: '12px'
              }}
              icon={<PlusOutlined />}
              onClick={() => this._newTalk()}
              disabled={this.state.isLoading}
            >
              新建
            </Button>

            <Button
              style={buttonMainStyle}
              type='primary'
              icon={
                this.state.isLoading ? (
                  <LoadingOutlined />
                ) : (
                  <SendOutlined key='ellipsis' />
                )
              }
              onClick={() => this._sendBtnClick()}
            >
              {!this.state.isLoading ? '发送' : '停止'}
            </Button>
          </div>
        ]}
      >
        <TextArea
          maxLength={2000}
          allowClear
          showCount
          ref={x => (this.inputRef = x)}
          value={this.state.userInput.prompt}
          onPressEnter={(e: any) => this._onPressEnter(e)}
          onChange={(e: { target: { value: any } }) => {
            this.setState({
              userInput: {
                prompt: e.target.value,
                tag: e.target.value
              }
            })
          }}
          placeholder={this.state.placeholder}
          autoSize={{ minRows: 2, maxRows: 15 }}
          disabled={this.state.isLoading}
        />
      </Card>
    )
  }
}

export default ChatBotInput
