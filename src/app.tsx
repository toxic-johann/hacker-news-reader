import * as React from 'react';
import hackerNews, { pageSize } from './hacker-news';
import Item from './item';
import { IItem } from "hacker-news-api-types";
import { isScrollAtBottom } from './utils';

export interface AppState {
  idList: number[];
  itemMap: { [propName: number]: IItem };
  itemCursor: number;
  loadedCount: number;
}

const idMap: { [propName: number]: boolean} = {};
let isLoadingNextPage = false;

class App extends React.Component<any, AppState> {
  constructor(props: any) {
    super(props);
    this.state = {
      idList: [],
      itemMap: {},
      itemCursor: 0,
      loadedCount: 0,
    };
    window.addEventListener('scroll', () => {
      if (isScrollAtBottom(1.25)) {
        const { loadedCount, idList } = this.state;
        if (idList.length && loadedCount + 5 >= idList.length) {
          this.getNextPage();
        }
      }
    });
  }

  public render() {
    return (
      <div className="App">
        { this.state.idList.map((id, index) => this.state.itemMap[id]
          ? <Item index={index} item={this.state.itemMap[id]} key={id}></Item>
          : <div key={id}></div>)}
      </div>
    );
  }

  public componentDidMount() {
    this.getNextPage();
  }

  private async getNextPage() {
    const { idList: currentIdList, itemCursor } = this.state;
    if (isLoadingNextPage) return;
    isLoadingNextPage = true;
    const page = Math.floor(currentIdList.length / pageSize) + 1;
    const rawIdList = await hackerNews.getNewStories(page);
    const idList = rawIdList.filter(id => {
      const isDuplicate = idMap[id];
      idMap[id] = true;
      return !isDuplicate;
    });
    const newIdList = currentIdList.concat(idList);
    await this.setState({ idList: newIdList });
    isLoadingNextPage = false;
    const idSlice = newIdList.slice(itemCursor, newIdList.length);
    await this.setState({ itemCursor: newIdList.length });
    idSlice.forEach(id => this.getItem(id));
  }

  private async getItem(id: number) {
    const item = await hackerNews.getItem(id);
    const { itemMap, loadedCount } = this.state;
    itemMap[id] = item;
    await this.setState({ itemMap, loadedCount: loadedCount + 1 });
  }
}

export default App;
