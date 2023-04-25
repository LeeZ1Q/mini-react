import { createElement, render } from './mini-react';
 

const element = createElement(
  'h1',
  {id: 'title', style : 'background:orange'},
  'Hello',
  createElement('a',{href: 'https://bilibili.com',style:'color:yellow'},'bilibili')
);

const container = document.getElementById('root');
render(element, container);

console.log(element);