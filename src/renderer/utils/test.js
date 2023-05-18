import { ofetch, FetchError } from 'ofetch';
import axios from 'axios';
import { v4 } from 'uuid';

async function tes() {
  axios
    .get('https://www.bing.com/turing/conversation/create', {
      withCredentials: true,
    })
    .then((res) => {
      console.log('aa', res);
    })
    .catch((e) => {
      console.log('ee', e);
    });
}

export default tes;
