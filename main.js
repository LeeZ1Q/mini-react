import { createElement } from './mini-react';


const element = createElement(
  'h1',
  {id: 'title', class: 'hello'},
  'hello',
  createElement('span', null, 'world')
);

console.log(element);