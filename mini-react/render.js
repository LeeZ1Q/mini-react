function createDOM(fiber) {
	//创建元素
	const dom =
		fiber.type === "TEXT_ELEMENT"
			? document.createTextNode("")
			: document.createElement(fiber.type);

	//添加属性
	Object.keys(fiber.props)
		.filter((key) => key !== "children")
		.forEach((key) => {
			dom[key] = fiber.props[key];
		});

	return dom;
}

// root fiber
function render(element, container) {
	// 创建根节点
	wipRoot = {
		dom: container,
		props: {
			children: [element],
		},
		sibling: null,
		child: null,
		parent: null,
		alternate: currentRoot,
	};
	deletions = [];
	nextUnitOfWork = wipRoot;
}

let nextUnitOfWork = null;
let wipRoot = null;
let currentRoot = null;
let deletions = null;

// 提交阶段
function commitRoot() {
	deletions.forEach(commitWork);
	commitWork(wipRoot.child);
	currentRoot = wipRoot;
	wipRoot = null;
}

// 递归提交 fiber 同步
function commitWork(fiber) {
	if (!fiber) {
		return;
	}

	// 找到最近的有dom的fiber
	let parentDOMFiber = fiber.parent;
	while (!parentDOMFiber.dom) {
		parentDOMFiber = parentDOMFiber.parent;
	}
	// 找到父元素
	const parentDOM = parentDOMFiber.dom;

	if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
		// 添加元素
		parentDOM.appendChild(fiber.dom);
	} else if (fiber.effectTag === "DELETION" && fiber.dom != null) {
		// 删除元素
		commitDeletion(fiber, parentDOM)
	} else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
		// 更新元素
		updateDOM(fiber.dom, fiber.alternate.props, fiber.props);
	}

	// 递归子元素
	commitWork(fiber.child);
	// 递归兄弟元素
	commitWork(fiber.sibling);
}

// 删除元素
function commitDeletion(fiber, parentDOM) {
	if (fiber.dom) {
		parentDOM.removeChild(fiber.dom);
	} else {
		commitDeletion(fiber.child, parentDOM);
	}
}

// 更新props
function updateDOM(dom, prevProps, nextProps) {
	const isEvent = (key) => key.startsWith("on");
	// 删除已经不存在或者变化的事件处理函数
	Object.keys(prevProps)
		.filter(isEvent)
		.filter((key) => !(key in nextProps) || nextProps[key] !== prevProps[key])
		.forEach((key) => {
			const eventType = key.toLowerCase().substring(2);
			dom.removeEventListener(eventType, prevProps[key]);
		});

	// 添加或更新事件处理函数
	Object.keys(nextProps)
		.filter(isEvent)
		.filter((key) => !(key in prevProps) || nextProps[key] !== prevProps[key])
		.forEach((key) => {
			const eventType = key.toLowerCase().substring(2);
			dom.addEventListener(eventType, nextProps[key]);
		});



	// 删除已经不存在props
	Object.keys(prevProps)
		.filter((key) => key !== "children")
		.filter((key) => !(key in nextProps))
		.forEach((key) => {
			dom[key] = "";
		});

	// 更新或添加props
	Object.keys(nextProps)
		.filter((key) => key !== "children")
		.filter((key) => prevProps[key] !== nextProps[key])
		.forEach((key) => {
			dom[key] = nextProps[key];
		});

}

// 调度函数
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

	// 没有任务了，提交
	if (!nextUnitOfWork && wipRoot) {
		commitRoot();
	}

	// 没有足够的时间，请求下一次空闲时间处理
	requestIdleCallback(workLoop);
}

// 启动 空闲时间处理
requestIdleCallback(workLoop);

// 任务执行
function performUnitOfWork(fiber) {


	const isFunctionComponent = fiber.type instanceof Function;
	if (isFunctionComponent) {
		updateFunctionComponent(fiber);
	} else {
		updateHostComponent(fiber);
	}

	//  返回下一个任务  先找儿子
	if (fiber.child) {
		return fiber.child;
	}
	// 没有儿子找兄弟
	let nextFiber = fiber;
	while (nextFiber) {
		if (nextFiber.sibling) {
			return nextFiber.sibling;
		}
		nextFiber = nextFiber.parent;
	}
}

// 非函数组件更新
function updateHostComponent(fiber) {
		// 创建元素
		if (!fiber.dom) {
			fiber.dom = createDOM(fiber);
		}
		// 创建子任务 (fiber)
	const elements = fiber.props.children;
	// 新建newFiber，添加到fiber树上
	reconcileChildren(fiber, elements);
}

// 函数组件更新
function updateFunctionComponent(fiber) {
	const children = [fiber.type(fiber.props)];
	reconcileChildren(fiber, children);
}

// fiber diff
function reconcileChildren(wipFiber, elements){
		let index = 0;
		let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
		let prevSibling = null;

		while(index < elements.length || oldFiber != null ){
				const element = elements[index];
				let newFiber = null;

				const sameType = oldFiber && element && element.type === oldFiber.type;

				if(sameType){
						// 更新节点
						newFiber = {
								type: oldFiber.type,
								props: element.props,
								// 继承旧节点的 dom 性能优化
								dom: oldFiber.dom,
								parent: wipFiber,
								alternate: oldFiber,
								effectTag: 'UPDATE',
								sibling: null,
								child: null,
						}
				}

				if(element && !sameType){
						// 新建节点
						newFiber = {
								type: element.type,
								props: element.props,
								dom: null,
								parent: wipFiber,
								alternate: null,
								effectTag: 'PLACEMENT',
								sibling: null,
								child: null,
						}
				}

				if(oldFiber && !sameType){
						// 删除节点
						oldFiber.effectTag = 'DELETION';
						deletions.push(oldFiber);
				}

				if(oldFiber){
						oldFiber = oldFiber.sibling;
				}

				if(index === 0){
						wipFiber.child = newFiber;
				}else{
						prevSibling.sibling = newFiber;
				}

				prevSibling = newFiber;
				index++;
		}

}

export default render;
