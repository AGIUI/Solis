export default {
  storage: {
    local: {
      get: () => {
        return {};
      },
      set: () => {},
    },
    sync: {
      get: () => {
        return {};
      },
      set: () => {},
    },
  },
  runtime: {
    lastError: '',
    sendMessage: (data) => {
      console.log('===========>send', data);
      window.postMessage(data, '*');
    },
    onMessage: {
      addListener: (cb) => {
       
      },

      removeListener: (cb) => {
        window.removeEventListener('message', cb);
      },
    },
  },
};
