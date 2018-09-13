import { HackerNews } from './hacker-news';
import { IItem } from "hacker-news-api-types";

const MAX_REQUEST_NUMBER = 6;

class RequestController {
  list: Function[];
  requestCount: number;
  loadedCount: number;

  constructor() {
    this.list = [];
    this.loadedCount = 0;
    this.requestCount = 0;
    this.poll();
  }

  add(fn: Function, isPush: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      this.list[isPush ? 'push' : 'unshift'](this.getRunner(fn, resolve, reject));
    });
  }

  getRunner(fn: Function, resolve: Function, reject: Function): () => Promise<any> {
    return async () => {
      try {
        this.requestCount++;
        const result = await fn();
        this.loadedCount++;
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
  }

  push(fn: Function): Promise<any> {
    return this.add(fn, true);
  }

  async poll(): Promise<void> {
    const { list, requestCount, loadedCount } = this;
    if (list.length === 0 || requestCount > loadedCount + MAX_REQUEST_NUMBER) {
      await sleep();
      return this.poll();
    }
    const slice = list.splice(0, Math.min(MAX_REQUEST_NUMBER - (requestCount - loadedCount), list.length));
    const tasks: Promise<any>[] = slice.map(fn => fn());
    await Promise.race(tasks);
    return this.poll();
  }

  unshift(fn: Function) {
    return this.add(fn, false);
  }
}

const requestController = new RequestController();

export function sleep() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

export function isScrollAtBottom(bias: number = 1) {
  const pageHeight=document.documentElement.offsetHeight;
  const windowHeight = window.innerHeight;
  const scrollPosition= window.scrollY || window.pageYOffset || document.body.scrollTop + (document.documentElement && document.documentElement.scrollTop || 0);
  return pageHeight <= windowHeight * bias + scrollPosition
}

/**
 * A decorator to let user use cache in localStorage first
 * @param {string} prefix 
 */
export function cacheFirst({prefix, needUnshift = false }: { prefix: string, needUnshift?: boolean }) {
  return function(target: HackerNews, property: string, descriptor: PropertyDescriptor) {
    const {value: originFn} = descriptor;
    const fn = (id: number) => {
      const key = prefix + id.toString();
      const rawCacheItem = localStorage.getItem(key);
      const asyncResponse = requestController[(!needUnshift || rawCacheItem) ? 'push' : 'unshift'](() => originFn.bind(target)(id)
        .then((asyncItem: IItem) => {
          localStorage.setItem(key, JSON.stringify(asyncItem));
          return asyncItem;
        })
      );
      return rawCacheItem
        ? Promise.resolve(JSON.parse(rawCacheItem))
        : asyncResponse;
    }
    descriptor.value = fn;
  }
}
