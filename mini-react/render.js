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

// 开始渲染
function render(element, container) {
	// root fiber
	wipRoot = {
		dom: container,
		props: {
			children: [element],
		},
		child: null,
		alternate: currentRoot,
	};
	deletion = [];
	nextUnitOfWork = wipRoot;
}

// 提交阶段
function commitRoot() {
	deletion.forEach((item) => commitWork(item));
	commitWork(wipRoot.child);
	currentRoot = wipRoot;
	wipRoot = null;
}

// 更新props
function updateDOM(dom, prevProps, nextProps) {
	const isEvent = (key) => key.startsWith("on");
	// 删除已经不存在props
	Object.keys(prevProps)
		.filter((key) => key !== "children" && !isEvent(key))
		.filter((key) => !key in nextProps)
		.forEach((key) => {
			dom[key] = "";
		});

	// 更新或添加props
	Object.keys(nextProps)
		.filter((key) => key !== "children" && !isEvent(key))
		.filter((key) => !key in prevProps || prevProps[key] !== nextProps[key])
		.forEach((key) => {
			dom[key] = nextProps[key];
		});
	// 删除已经不存在或者变化的事件处理函数
	Object.keys(prevProps)
		.filter(isEvent)
		.filter((key) => !key in nextProps || prevProps[key] !== nextProps[key])
		.forEach((key) => {
			const eventType = key.toLowerCase().substring(2);
			dom.removeEventListener(eventType, prevProps[key]);
		});

	// 添加或更新事件处理函数
	Object.keys(nextProps)
		.filter(isEvent)
		.filter((key) => prevProps[key] !== nextProps[key])
		.forEach((key) => {
			const eventType = key.toLowerCase().substring(2);
			dom.addEventListener(eventType, nextProps[key]);
		});
}

// 递归提交 fiber 同步
function commitWork(fiber) {
	if (!fiber) {
		return;
	}

	// 找到最近的有dom的fiber
	let domParentFiber = fiber.parent;
	while (!domParentFiber.dom) {
		domParentFiber = domParentFiber.parent;
	}
	// 找到父元素
	const domParent = domParentFiber.dom;

	if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
		// 添加元素
		domParent.appendChild(fiber.dom);
	} else if (fiber.effectTag === "DELETION" && fiber.dom != null) {
		// 删除元素
		commitDeletion(fiber, domParent);
	} else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
		// 更新元素
		updateDOM(fiber.dom, fiber.alternate.props, fiber.props);
	}

	commitWork(fiber.child);
	commitWork(fiber.sibling);
}

// 删除元素
function commitDeletion(fiber, domParent) {
	if (fiber.dom) {
		domParent.removeChild(fiber.dom);
	} else {
		// 向下寻找最近的DOM
		commitDeletion(fiber.child, domParent);
	}
}

let nextUnitOfWork = null;
// 正在进行的渲染
let wipRoot = null;
// 上次渲染
let currentRoot = null;
// 要删除的fiber
let deletion = null;

// 调度函数
function workLoop(deadline) {
	// 是否需要让出时间片  shouldYield 表示线程繁忙，应该中断渲染
	let shouldYield = false;
	// 任务执行
	while (nextUnitOfWork && !shouldYield) {
		nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
		// 检查线程是否繁忙
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

	//  如果有child，就返回child fiber
	if (fiber.child) {
		return fiber.child;
	}
	// 没有就优先返回sibling，向上查找
	// 如果没有，就不返回，返回值为undefined
	let nextFiber = fiber;
	while (nextFiber) {
		// 找到sibling
		if (nextFiber.sibling) {
			return nextFiber.sibling;
		}
		// 没有sibling找parent
		nextFiber = nextFiber.parent;
	}
}

// 记住上一次的fiber
let wipFiber = null;
let hookIndex = null;

// 函数组件更新
function updateFunctionComponent(fiber) {
	wipFiber = fiber;
	hookIndex = 0;
	wipFiber.hooks = [];
	const children = [fiber.type(fiber.props)];
	reconcileChildren(fiber, children);
}

// useState 实现
export function useState(initial) {
	// 旧hook
	const oldHook =
		wipFiber.alternate &&
		wipFiber.alternate.hooks &&
		wipFiber.alternate.hooks[hookIndex];
	// 新hook
	const hook = {
		state: oldHook ? oldHook.state : initial,
		queue: [],
	};

	// 执行action，更新state
	const actions = oldHook ? oldHook.queue : [];
	actions.forEach((action) => {
		hook.state = action(hook.state);
	});

	const setState = (action) => {
		hook.queue.push(action);
		// 重新设定wipRoot，触发渲染更新
		wipRoot = {
			dom: currentRoot.dom,
			props: currentRoot.props,
			alternate: currentRoot,
		};
		nextUnitOfWork = wipRoot;
		deletion = [];
	};

	wipFiber.hooks.push(hook);
	hookIndex++;
	return [hook.state, setState];
}

// 非函数组件更新
function updateHostComponent(fiber) {
	// 创建元素
	if (!fiber.dom) {
		fiber.dom = createDOM(fiber);
	}
	// 新建newFiber，添加到fiber树上
	reconcileChildren(fiber, fiber.props.children);
}

// fiber diff
function reconcileChildren(wipFiber, elements) {
	let index = 0;
	let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
	let prevSibling = null;

	while (index < elements.length || oldFiber != null) {
		const element = elements[index];
		const sameType = oldFiber && element && element.type === oldFiber.type;

		let newFiber = null;

		if (sameType) {
			// 更新节点
			newFiber = {
				type: oldFiber.type,
				props: element.props,
				// 继承旧节点的 dom 性能优化
				dom: oldFiber.dom,
				parent: wipFiber,
				alternate: oldFiber,
				effectTag: "UPDATE",
			};
		}

		if (element && !sameType) {
			// 新建节点
			newFiber = {
				type: element.type,
				props: element.props,
				dom: null,
				parent: wipFiber,
				alternate: null,
				effectTag: "PLACEMENT",
			};
		}

		if (oldFiber && !sameType) {
			// 删除节点
			oldFiber.effectTag = "DELETION";
			deletion.push(oldFiber);
		}

		if (oldFiber) {
			oldFiber = oldFiber.sibling;
		}

		if (index === 0) {
			wipFiber.child = newFiber;
		} else {
			prevSibling.sibling = newFiber;
		}

		prevSibling = newFiber;
		index++;
	}
}

export default render;
