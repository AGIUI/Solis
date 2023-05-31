/* eslint import/prefer-default-export: off */
import { URL } from 'url';
import path from 'path';

export function resolveHtmlPath(htmlFileName: string, opts: any) {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    if (opts?.hash) {
      url.hash = opts.hash;
    }
    return url.href;
  }
  return path.resolve(__dirname, '../renderer/', htmlFileName);
}
