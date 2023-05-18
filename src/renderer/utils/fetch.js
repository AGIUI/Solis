// 将js对象转换为URL查询字符串
import { urlCodec, AesDecode } from './commonEncrypt.js';
import systemEvent from '../libs/systemEvent.js';

class FetchRequest {
  constructor() {
    // this.baseUrl = 'https://ejcvirv.belikehub.com';
    this.baseUrl = 'https://chat.easyhelpai.com';
    // this.baseUrl = 'http://192.168.211.77:9007'
    this.headers = {
      platform: 'H5',
      appid: 'y6570wjbxyzvvmgr98907741',
      lang: 'en',
      ver: '1.2',
    };
  }

  async getHttpHeader() {
    return Promise.resolve({
      ...this.headers,
      token: localStorage.getItem('dbt_ext_token'),
    });
  }

  async postFile(url, data = {}, params = {}) {
    let currHeader = await this.getHttpHeader();
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: 'POST',
      headers: {
        ...currHeader,
      },
      credentials: 'include',
      body: data,
      ...params,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}`);
    }

    const responseData = await response.json();

    return responseData;
  }

  async getEncrypt(url, params = {}) {
    let xBase = this.baseUrl;
    if (url && url.indexOf('http') == 0) {
      xBase = '';
    }

    let sendParams = '';

    if (params && Object.keys(params).length) {
      sendParams = {
        encode_data: urlCodec(JSON.stringify(params)),
      };
    }

    url = new URL(`${xBase}${url}`);
    url.search = new URLSearchParams(sendParams).toString();
    let currHeader = await this.getHttpHeader();
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...currHeader,
      },
      ...params,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}`);
    }

    const responseData = await response.json();

    if (responseData?.data?.data) {
      try {
        responseData.data.data = JSON.parse(
          AesDecode(responseData.data.data || '')
        );
      } catch (e) {}
    } else {
      try {
        responseData.data = JSON.parse(AesDecode(responseData.data || ''));
      } catch (e) {}
    }

    console.log('responseData=>>>>', responseData);

    return responseData;
  }

  async postEncrypt(url, data = {}, params = {}) {
    let xBase = this.baseUrl;
    if (url && url.indexOf('http') == 0) {
      xBase = '';
    }

    let sendParams = null;

    if (data && Object.keys(data).length) {
      sendParams = {
        encode_data: urlCodec(JSON.stringify(data)),
      };
    }

    const currHeader = await this.getHttpHeader();
    const response = await fetch(`${xBase}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...currHeader,
      },
      credentials: 'include',
      body: sendParams ? JSON.stringify(sendParams) : null,
      ...params,
    });

    if (!response.ok) {
      if (response.status === 401) {
        systemEvent.emit('dbt_auth_failed');
      }
      throw new Error(`Failed to fetch ${url}`);
    }

    const responseData = await response.json();

    if (responseData?.data?.data) {
      try {
        responseData.data.data = JSON.parse(
          AesDecode(responseData.data.data || '')
        );
      } catch (e) {}
    } else {
      try {
        responseData.data = JSON.parse(AesDecode(responseData.data || ''));
      } catch (e) {}
    }

    console.log('responseData=>>>>', responseData);
    return responseData;
  }
}

export default FetchRequest;
