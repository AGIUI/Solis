import React, { useState, useEffect } from 'react';
import { Input, Dropdown, Space } from 'antd';
import {
  DownOutlined,
  RightCircleOutlined,
  MoreOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import './index.css';

import bingSvg from '@/assets/bing.svg';
import chatgptPng from '@/assets/chatgpt.png';
import chromePng from '@/assets/g-logo.png';
import baiduLogo from '@/assets/baidu.jpg';
import logoicon from '@/assets/logo.png';

export default function PopWindow() {
  const [keyword, setKeyword] = useState('');
  const [isFocus, setFocus] = useState('');
  const [isMoving, setMoving] = useState(false);
  const [selectedId, setSelectedId] = useState('ChatGPT');

  useEffect(() => {
    // 与主窗口同步数据
    window.electron.ipcRenderer.send('dbt_pop_typechange', {
      type: selectedId,
    });
    let fn = window.electron.ipcRenderer.on('dbt_main_typechange', (evt) => {
      if (evt?.type) {
        setSelectedId(evt?.type);
      }
    });

    function handleMove(event) {
      let flag = event.target === document.documentElement;
      window.electron.ipcRenderer.send('click_through', { flag });
    }

    window.addEventListener('mousedown', () => {
      setMoving(true);
    });
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', () => {
      setMoving(false);
    });
    return () => {
      if (fn) {
        fn();
      }
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mousemove', handleMove);
    };
  }, []);

  let imgMap = {
    Bing: bingSvg,
    Google: chromePng,
    Baidu: baiduLogo,
    ChatGPT: chatgptPng,
  };
  const items = [
    {
      label: (
        <div className="drop-item">
          <img src={chatgptPng} className="drop-item-img" alt=" " />
          ChatGPT
        </div>
      ),
      key: 'ChatGPT',
    },
    {
      label: (
        <div className="drop-item">
          <img src={bingSvg} className="drop-item-img" alt=" " /> Bing
        </div>
      ),
      key: 'Bing',
    },
    {
      label: (
        <div className="drop-item">
          <img src={chromePng} className="drop-item-img" alt=" " />
          Google
        </div>
      ),
      key: 'Google',
    },
    {
      label: (
        <div className="drop-item">
          <img src={baiduLogo} className="drop-item-img" alt=" " />
          Baidu
        </div>
      ),
      key: 'Baidu',
    },
  ];

  const menus = [
    {
      label: <div className="drop-item">快捷键：CTRL+SHIFT+F</div>,
      key: 'shortcut',
    },
    {
      label: (
        <div className="drop-item">
          <CloseCircleOutlined className="close-img" />
          关闭搜索栏
        </div>
      ),
      key: 'close',
    },
  ];

  const handleChange = (evt) => {
    setKeyword(evt.target.value);
  };

  const handleSend = (e) => {
    if (!keyword || !keyword.trim()) {
      return;
    }
    if (selectedId === 'Baidu') {
      let url = `https://www.baidu.com/s?wd=${keyword}`;
      window.electron.ipcRenderer.send('open_url', {
        url,
      });
    } else if (selectedId === 'Google') {
      let url = `https://www.google.com/search?q=${keyword}`;
      window.electron.ipcRenderer.send('open_url', {
        url,
      });
    } else {
      window.electron.ipcRenderer.send('dbt_pop_search', {
        text: keyword,
        type: selectedId,
      });
    }

    setKeyword('');
  };

  const handleItemClick = (evt) => {
    setSelectedId(evt.key);
    if (['Baidu', 'Google'].indexOf(evt.key) >= 0) {
      return;
    }
    window.electron.ipcRenderer.send('dbt_pop_typechange', {
      type: evt.key,
    });
  };

  const handleMenuClick = (evt) => {
    if (evt.key !== 'close') {
      return;
    }
    setTimeout(() => {
      window.electron.ipcRenderer.send('dbt_pop_close');
    }, 350);
  };

  return (
    <div className={`popPage ${isFocus ? 'focus' : ''}`}>
      <div className="pt-list">
        <Dropdown
          overlayClassName="dbt_drop"
          menu={{
            items,
            onClick: handleItemClick,
          }}
        >
          <div className="drop-menu-selectbox">
            <img src={imgMap[selectedId]} alt="" className="selected-img" />
            <DownOutlined />
          </div>
        </Dropdown>
      </div>
      <Input
        className="txtInput"
        value={keyword}
        onChange={handleChange}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onPressEnter={handleSend}
        placeholder={`Search by ${selectedId}`}
      />
      <img alt="" src={logoicon} className="send-img" onClick={handleSend} />

      <Dropdown
        overlayClassName="dbt_drop"
        menu={{
          items: menus,
          onClick: handleMenuClick,
        }}
      >
        <MoreOutlined className="btn-send btn-more" />
      </Dropdown>
    </div>
  );
}
