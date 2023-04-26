import { createElement, render } from './mini-react';
 
const App = (props) => {
  return createElement('h1', null,'Hi',props.name);
}

const container = document.getElementById('root');
const element = createElement(App,{name:'Lee'});
render(element, container);
