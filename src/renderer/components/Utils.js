import { Md5 } from 'ts-md5';
import _ from 'lodash';

function chromeStorageGet(k) {
  let keys = k;
  if (_.isString(k)) {
    keys = [k];
  }
  let res = {};
  keys.forEach((key) => {
    let data = localStorage.getItem(key);
    try {
      data = JSON.parse(data);
    } catch (e) {}

    res[key] = data;
  });
  return Promise.resolve(res);
}

function chromeStorageSet(json) {
  if (_.isEmpty(json)) {
    return Promise.resolve();
  }

  Object.keys(json).forEach((key) => {
    let val = json[key];
    try {
      val = JSON.stringify(val);
    } catch (e) {}

    localStorage.setItem(key, val);
  });
  return Promise.resolve();
}

function chromeStorageSyncGet(k) {
  return chromeStorageGet(k);
}

function chromeStorageSyncSet(json) {
  return chromeStorageSet(json);
}

function md5(text) {
  return Md5.hashStr(text);
}

const parseUrl = () => {
  let paramsString = window.location.href.split('?')[1];
  let searchParams = new URLSearchParams(paramsString);
  let res = {};
  for (let p of searchParams) {
    res[p[0]] = p[1];
  }
  return res;
};

// from Bing,ChatGPT 初始化对话框 采用哪个引擎
// const { databaseId, blockId, reader, fullscreen, userInput, from } = parseUrl();
const getConfigFromUrl = () => {
  const { databaseId, blockId, reader, fullscreen, userInput, from, agents } =
    parseUrl();
  return { databaseId, blockId, reader, fullscreen, userInput, from, agents };
};

const getConfig = () => {
  return {
    app: 'Earth',
    version: '0.1.1',
    browsers: ['chrome'],
    notionToken: 'secret_4XmIRpKPA5AP4h9PaHW49MTMGxeWYEGuIPBmUWtbHee',
    databaseId: 'a98063d9f09044c7be65efc7ebb7d283',
    databaseId2: '6ffc01c4549d47a09483141ac2a06bce',
    databaseId3: 'b7d67071722b4bd88546ea31b4841f6b',
    discord: 'https://discord.gg/SGwA9anUrr',
  };
};

export {
  chromeStorageGet,
  chromeStorageSet,
  chromeStorageSyncGet,
  chromeStorageSyncSet,
  md5,
  parseUrl,
  getConfig,
  getConfigFromUrl,
};
