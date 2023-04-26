import { createElement, render } from './mini-react';
import { useState } from './mini-react/render';

const container = document.getElementById('root');

const Counter = () => {
  const [state, setState] = useState(1);
  return createElement(
    'h1',
    { onclick: () => setState(prev => prev + 1) },
    state
    );
};


const element = createElement(Counter);
render(element, container);
