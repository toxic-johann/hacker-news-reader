import { HackerNews } from './hacker-news';
import { IItem } from "hacker-news-api-types";

const MAX_REQUEST_NUMBER = 3;

class RequestController {
  microTasks: Function[];
  macroTasks: Function[];
  requestCount: number;
  loadedCount: number;

  constructor() {
    this.microTasks = [];
    this.macroTasks = [];
    this.loadedCount = 0;
    this.requestCount = 0;
    this.poll();
  }

  add(fn: Function, isMicro: boolean): Promise<any> {
    const { macroTasks, microTasks } = this;
    return new Promise((resolve, reject) => {
      (isMicro ? microTasks : macroTasks).push(this.getRunner(fn, resolve, reject));
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

  async poll(): Promise<void> {
    const { microTasks, macroTasks, requestCount, loadedCount } = this;
    const unstartTasksLength = microTasks.length + macroTasks.length;
    if (unstartTasksLength === 0 || requestCount > loadedCount + MAX_REQUEST_NUMBER) {
      await sleep();
      return this.poll();
    }
    const list = microTasks.length ? microTasks : macroTasks;
    const slice = list.splice(0, Math.min(MAX_REQUEST_NUMBER - (requestCount - loadedCount), list.length));
    const tasks: Promise<any>[] = slice.map(fn => fn());
    await Promise.race(tasks);
    return this.poll();
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
export function cacheFirst(prefix: string) {
  return function(target: HackerNews, property: string, descriptor: PropertyDescriptor) {
    const {value: originFn} = descriptor;
    const fn = (id: number) => {
      const key = prefix + id.toString();
      const rawCacheItem = localStorage.getItem(key);
      const fn = () => originFn.bind(target)(id)
      .then((asyncItem: IItem) => {
        localStorage.setItem(key, JSON.stringify(asyncItem));
        return asyncItem;
      });
      const asyncResponse = requestController.add(fn, !rawCacheItem);
      return rawCacheItem
        ? Promise.resolve(JSON.parse(rawCacheItem))
        : asyncResponse;
    }
    descriptor.value = fn;
  }
}

export function networkFirst(prefix: string) {
  return function(target: HackerNews, property: string, descriptor: PropertyDescriptor) {
    const {value: originFn} = descriptor;
    const fn = (id: number) => {
      const key = prefix + id.toString();
      return originFn.bind(target)(id)
        .then((asyncItem: IItem) => {
          localStorage.setItem(key, JSON.stringify(asyncItem));
          return asyncItem;
        }).catch(() => {
          const rawCacheItem = localStorage.getItem(key);
          if (!rawCacheItem) throw new Error('No network and no cache');
          return JSON.parse(rawCacheItem);
        });
    }
    descriptor.value = fn;
  }
}
