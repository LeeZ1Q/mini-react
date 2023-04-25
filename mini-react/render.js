function render(element, container) {
	//创建元素
	const dom =
		element.type === "TEXT_ELEMENT"
			? document.createTextNode("")
			: document.createElement(element.type);

  //添加属性
  Object.keys(element.props)
    .filter((key) => key !== "children")
    .forEach((key) => {dom[key] = element.props[key]});

  // 递归渲染子节点
  // element.props.children.forEach((child) => render(child, dom));
  
	//追加到父节点
	container.appendChild(dom);
}

let nextUnitOfWork = null;

// 任务调度
function workLoop(deadline) {
  // 是否需要让出时间片
  let shouldYield = false;
  // 任务执行
  while (nextUnitOfWork && !shouldYield) {
    // 执行任务
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    // 判断是否剩余足够时间
    shouldYield = deadline.timeRemaining() < 1;
  }
  // 没有足够的时间，请求下一次空闲时间处理
  requestIdleCallback(workLoop);
}

// 启动空闲时间处理
requestIdleCallback(workLoop);

// 任务执行
function performUnitOfWork(nextUnitOfWork) {
  // TODO
}

export default render;
