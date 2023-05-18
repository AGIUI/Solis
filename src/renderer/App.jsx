import React, { useEffect } from 'react';

import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { getConfigFromUrl } from '@/components/Utils';
import Main from './pages/content/Main';
import backgroundHandle from './pages/background';

import './App.css';

const { databaseId, blockId, reader, fullscreen, userInput, from, agents } =
  getConfigFromUrl();

export default function App() {
  useEffect(() => {
    let backFn = backgroundHandle();
    return () => {
      if (backFn) {
        backFn();
      }
    };
  }, []);
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Main
              appName="earth"
              // 代理器
              agents={agents === '1'}
              // 暂无用
              databaseId={databaseId || ''}
              // 读取预处理数据
              blockId={blockId}
              // 阅读模式
              readability={false}
              // 是否全屏
              fullscreen
              // 默认传参
              userInput={{
                prompt: decodeURI(userInput || ''),
                tag: decodeURI(userInput || ''),
              }}
              // 默认是否开启
              initIsOpen
              // 初始引擎
              initChatBotType={from}
            />
          }
        />
      </Routes>
    </Router>
  );
}
