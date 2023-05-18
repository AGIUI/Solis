import FetchRequest from '@/utils/fetch.js';

const request = new FetchRequest();

function postFn(url) {
  return (data) => {
    return request.postEncrypt(url, data);
  };
}

function getFn(url) {
  return (data) => {
    return request.getEncrypt(url, data);
  };
}
export default {
  getMsgList: postFn('/api/web/session/getMsgList'), // 获取对话消息列表
  createSession: postFn('/api/web/session/createSession'), // 创建对话
  sendMsg: postFn('/api/web/session/sendMsg'), // 发送消息
};
