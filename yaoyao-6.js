var $=function(id){return document.getElementById(id)}
//深度拓展，ES6的Object.assign无法处理嵌套对象，处理则只是简单的替换。addNewAttr是用来决定是否忽略新属性，默认忽略
var extend=function(obj,addObj,addNewAttr=false){
    for(attr in addObj){
        if(addNewAttr || attr in obj){
            if(typeof obj[attr]==='object'){
                extend(obj[attr],addObj[attr]);
            }else{
                obj[attr]=addObj[attr];
            }
        }
    }
};
//构建Widget基类
function Widget(){
    this.maskBoxing=null;
}
Widget.prototype={
    //自定义事件，观察者模式，这里没用到，以后重构有用
    /*on:function(type,handler){
        if(typeof this.handler[type]==='undefined'){
            this.handler[type]=[];
        }
        this.handler[type].push(handler);
    },
    fire:function(type,data){
        if(this.handler[type] instanceof Array){
            this.handler[type].forEach((item)=>item(data));
        }
    },*/
    renderUI:function(){},
    bindUI:function(){},
    syncUI:function(){},
    destructor:function(){},
    //render函数传入的参数是一个element节点，该节点是组件的父元素，如未给则默认为body
    render:function(container){
        this.renderUI();//添加DOM节点
        this.handler={};//如果不清空，则每次点击弹窗或触发多次事件。这是由于handler在alertWindow.prototype上，移除弹窗后原型依旧保存在内存中
        this.bindUI();//绑定事件
        this.syncUI();//初始化属性
        (container || document.body).appendChild(this.maskBoxing);
    },
    destroy:function(){
        this.destructor();
    }
};
function alertWindow(){
    //cfg对象默认值
    this.cfg={
        title:'系统提示',//标题文字
        content:'请确认',//内容文字
        btnYes:'确定',//确定按钮文字
        btnNo:'取消',//取消按钮文字
        style:{
            //width,height,left,top可以传入数字，也可以传入单位为百分比的字符串等，默认单位是px
            //这里有一个BUG，如果height与width传入的是数字或字符串型数字，则默认居中。如果传入的是带单位的字符串，则默认靠左靠上
            //BUG的原因是window.innerWidth-this.cfg.style.width无法处理带单位的值
            width: 300,
            height: 200,
            left:'',
            top:''
        },
        isModal:false,//是否为模态窗口（在透明区域点击是否关闭）
        isDrag:false,//是否可拖拽
        btnYesHandler:function(){},//单击确定按钮执行的函数
        btnNoHandler:function(){}//单击取消按钮执行的函数
    };
}
alertWindow.prototype=new Widget();
extend.call(alertWindow.prototype,alertWindow.prototype,{
    renderUI:function(){
        const tempCfg=this.cfg;
        this.maskBoxing=document.createElement('div');
        this.maskBoxing.className='windowMask';
        this.maskBoxing.id='com';
        //模板字符串``
        this.maskBoxing.innerHTML=`<div class="windowBoxing"><div class="windowTitle">${tempCfg.title}</div><span class="windowClose">X</span>${tempCfg.content}<span class="windowBtnYes">${tempCfg.btnYes}</span><span class="windowBtnNo">${tempCfg.btnNo}</span></div>`;
    },
    bindUI:function(){
        const tempCfg=this.cfg;
        const that=this;
        this.maskBoxing.addEventListener('click',function(even){
            //注意！！这里面的this指向maskBoxing节点，这是addEventListener特性
            //在addEventListener里面，this与event.currentTarget都是指向监听节点,所以在前面定义tempCfg
            const e=even||window.Event;
            switch(e.target.className){
                case 'windowMask':
                    if(!tempCfg.isModal){
                        that.destroy();
                    }
                    break;
                case 'windowClose':
    //                (typeof tempCfg.closeHandler==='function')?tempCfg.closeHandler():console.log('属性closeHandler值必须为函数，请检查');
                    that.destroy();
                    break;
                case 'windowBtnYes':
                    (typeof tempCfg.btnYesHandler==='function')?tempCfg.btnYesHandler():console.log('属性btnYesHandler值必须为函数，请检查');
                    that.destroy();
                    break;
                case 'windowBtnNo':
                    (typeof tempCfg.btnNoHandler==='function')?tempCfg.btnNoHandler():console.log('属性btnNoHandler值必须为函数，请检查');
                    that.destroy();
                    break;
                default:
                    null;
            }
        });
    },
    syncUI:function(){
        const tempCfg=this.cfg;
        const that=this;
        //如果left与top未被覆盖，则（''||…）取值为后者；如被覆盖，则表达式短路，取前者（这里有BUG）
        tempCfg.style.left=String(tempCfg.style.left) || (window.innerWidth-this.cfg.style.width)/2;
        tempCfg.style.top=String(tempCfg.style.top) || (window.innerHeight-this.cfg.style.height)/2;
        let cssText='';
        for(attr in tempCfg.style){
            cssText+=attr+':'+tempCfg.style[attr]+((isNaN(Number(tempCfg.style[attr])))?';':'px;');
        }
        this.maskBoxing.getElementsByClassName("windowBoxing")[0].style.cssText=cssText;
        /*如果设置拖拽，则执行下面iife
        *拖拽的实现主要是三个事件'mousedown','mousemove','mouseup'
        *需要注意的是moving变量的作用（是否执行mousemove事件）以及边界处理（这里采用计算css属性）
        *该实现存在卡顿现象，如快速拖动会导致拖拽失效。在addEventListener判断中加入moving=!1是防止拖拽失效后依然保持mousemove事件。
        *导致卡顿的原因可能是：
        *1、switch事件写法；2、事件委托；3、所编写js的性能缺陷。。。还未实验，不能确定，以后多学一点后再回来重新思考
        *http://www.zhangxinxu.com/wordpress/2010/03/javascript实现最简单的拖拽效果，张鑫旭实现的不会有卡顿，下次回来记得去学习
        */
        if(tempCfg.isDrag){(function drag(){
            let clientX,clientY,moving;
            let mouseDrag=['mousedown','mousemove','mouseup'];
            const mouseDragHandler=function(even){
                const e=even || window.Event,
                      computedStyle=window.getComputedStyle(e.currentTarget);
                switch(e.type){
                    case mouseDrag[0]:
                        clientX=e.clientX;
                        clientY=e.clientY;
                        moving=true;
                        break;
                    case mouseDrag[1]:
                        if(!moving)return;
                        let newClientX=e.clientX,
                            newClientY=e.clientY;
                        let left=parseFloat(computedStyle.left)+newClientX-clientX;
                        let top=parseFloat(computedStyle.top)+newClientY-clientY;
                        if(left>0 && left<window.innerWidth-parseFloat(computedStyle.width)){e.currentTarget.style.left=left+'px'};
                        if(top>0 && top<window.innerHeight-parseFloat(computedStyle.height)){e.currentTarget.style.top=top+'px'};
                        clientX=newClientX;
                        clientY=newClientY;
                        break;
                    case mouseDrag[2]:
                        moving=false;
                        break;
                }
            };
            mouseDrag.forEach(function(item){
                that.maskBoxing.getElementsByClassName("windowBoxing")[0].addEventListener(item,function(event){
                    if(event.target.className==='windowTitle'){
                        mouseDragHandler(event)
                    }else{
                        moving=false;
                    }
                })
            });
        })()}
    },
    destructor:function(){
        if(!this.maskBoxing)return;
        let com=$('com');
        com.parentElement.removeChild(com);
    },
    alert:function(config){
        /*判断config是否传入，
         *如传入并且其值类型为字符串，则this.cfg的content属性值为传入值；
         *如传入的类型为对象，则先判断对应属性是否存在于this.cfg，如是则替换，注意这里是深度拓展
         */
        if(config){
            if(typeof config==='string'){
                this.cfg.content=config;
            }else if(typeof config==='object'){
                extend(this.cfg,config);
            }
        }
        this.render();
        return this;
    }
},true);