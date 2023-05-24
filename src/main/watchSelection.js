import { getSelection, checkAccessibilityPermissions } from 'node-selection';

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms || 0);
  });
}

async function wa(modalWindow) {
  if (await checkAccessibilityPermissions({ prompt: true })) {
    let res = await getSelection().catch((e) => e);
    // 如果当前主窗口是显示的 则往住窗口发数据 否则显示menu弹窗
    if (res?.text) {
      const { text } = res;
      modalWindow.webContents.send('win_selection_txt', {
        text,
        code: 200,
      });
    }
  }

  await delay(500);
  await wa(modalWindow);
}

export default wa;
