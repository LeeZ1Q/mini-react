//作用：将这三个参数返回成一个对象，这个对象就是虚拟DOM
function createElement(type,props,...children){
    return {
        type,
        props:{
            ...props,
            children:children.map(child=> typeof child === "object" ? child : createTextElement(child))
        }
    }
}

function createTextElement(text){
    return {
        type:"TEXT_ELEMENT",
        props:{
            nodeValue:text,
            children:[],
        }
    }
}

export default createElement;