import * as React from 'react';
import { IItem } from "hacker-news-api-types";
import './item.css';
import timeago from 'timeago.js';

export interface ItemProps {
  index: number;
  item: IItem;
}

class Item extends React.Component<ItemProps> {
  constructor(props: ItemProps) {
    super(props);
  }

  public render() {
    return (
      <div className="item">
        <div className="item-index">{this.props.index + 1}.</div>
        <p className="item-title"><a href={this.props.item.url}>{this.props.item.title}</a></p>
        <p className="item-info">by {this.props.item.by} {timeago().format((this.props.item.time || 0) * 1000)}</p>
      </div>
    );
  }
}

export default Item;