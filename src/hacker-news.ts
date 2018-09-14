import axios from 'axios';
import { IItem } from "hacker-news-api-types";
import { cacheFirst, networkFirst } from './utils';
export const pageSize = 30;
const instance = axios.create({
  baseURL: 'https://hacker-news.firebaseio.com/v0/',
});

export class HackerNews {
  /**
   * get the latest stories of hacker news
   * @param {number} [page=1]
   */
  @networkFirst('newstories-')
  async getNewStories(page: number = 1): Promise<number[]> {
    const { data = [] } = await instance.get(`newstories.json?orderBy="$key"&startAt="${pageSize * (page - 1)}"&endAt="${pageSize * page - 1}"`);
    return Object.keys(data).map(key => data[key]);
  }
  /**
   * get item accroding id
   * @param {number} id
   */
  @cacheFirst('item-')
  async getItem(id: number): Promise<IItem> {
    const { data }: { data: IItem} = await instance.get(`item/${id}.json`);
    return data;
  }
}
export default new HackerNews();