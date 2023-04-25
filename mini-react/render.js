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
	};
	nextUnitOfWork = wipRoot;
}

let nextUnitOfWork = null;
let wipRoot = null;

// 提交阶段
function commitRoot() {
	commitWork(wipRoot.child);
	wipRoot = null;
}

// 递归提交 fiber 同步
function commitWork(fiber) {
	if (!fiber) {
		return;
	}
	// 找到父元素
	const parentDOM = fiber.parent.dom;
	// 添加元素
	parentDOM.appendChild(fiber.dom);
	// 递归子元素
	commitWork(fiber.child);
	// 递归兄弟元素
	commitWork(fiber.sibling);
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
	// 创建元素
	if (!fiber.dom) {
		fiber.dom = createDOM(fiber);
	}

	// 创建子任务 (fiber)
	const elements = fiber.props.children;
	let index = 0;
	let prevSibling = null;

	// 建立Fiber Tree
	while (index < elements.length) {
		const element = elements[index];
		// 创建子任务
		const newFiber = {
			type: element.type,
			props: element.props,
			dom: null,
			parent: fiber,
			sibling: null,
			child: null,
		};

		// 构建链表结构
		// 如果是第一个
		if (index === 0) {
			// 你就是儿子
			fiber.child = newFiber;
		} else {
			// 否则你就是兄弟
			prevSibling.sibling = newFiber;
		}
		prevSibling = newFiber;
		index++;
	}

	//  返回下一个任务
	//  先找儿子
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

export default render;
