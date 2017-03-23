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
    this.tableBoxing=null;
}
Widget.prototype={
    //自定义事件，观察者模式
    on:function(type,handler){
        if(typeof this.handler[type]==='undefined'){
            this.handler[type]=[];
        }
        this.handler[type].push(handler);
    },
    fire:function(type,data){
        if(this.handler[type] instanceof Array){
            this.handler[type].forEach((item)=>item(data));//在这里this的指代会变化，需谨慎在handler中使用this
        }
    },
    renderUI:function(){},
    bindUI:function(){},
    syncUI:function(){},//本例中未使用
    destructor:function(){},
    //render函数传入的参数是一个element节点，该节点是组件的父元素，如未给则默认为body
    render:function(container){
        this.renderUI();//添加DOM节点
        this.handler={};//如果不清空，则每次点击弹窗或触发多次事件。这是由于handler在alertWindow.prototype上，移除弹窗后原型依旧保存在内存中
        this.bindUI();//绑定事件
        this.syncUI();//初始化属性
        (container || document.body).appendChild(this.tableBoxing);
    },
    //下面函数的this的指向过于复杂，没研究透，故这里没用到。。。感觉应该不能把destroy放进on自定义事件中，不然在fire调用时foreach中this会转而指向window，导致出错。。。即把on自定义事件与类中的事件分离，减少出错
    destroy:function(){
        this.destructor();
    }
};

//构建TableComp表格组件
function TableComp(){
    this.data={
        head:[],//表头
        isSortable:[],//是否可排序
        records:[],//各条记录（一条记录为一个数组，各记录再组合成大数组）
        //由于最终比较数据结构为[item,i]，故在写排序函数时与普通的排序函数略有区别，须在参数后面加上[0]，eg：(a,b)=>a[0]-b[0]
        sortFunUp:null,//默认min first，如果传入非函数参数，则实验结果是按每个数字的高位向低位排序，即无效参数，进行默认排序
        sortFunDown:null//默认max first
    };
    
}
TableComp.prototype=new Widget();
extend.call(TableComp.prototype,TableComp.prototype,{//注意这里的外层this指向与内层this指向区别
    //DOM生成
    renderUI:function(){
        this.tableBoxing=document.createElement('table');
        this.tableBoxing.className='tableView';
        this.tableBoxing.id='tableBoxing';
        //判断是否有头部字段
        if(!this.data.head.length){
            alert('请正确输入头部字段名');
            return false;
        }
        //表格head部分的HTML
        const headHTML='<thead><tr>'+this.data.head.reduce(function(a,b,index){
            return a+b+(this.data.isSortable[index]?'<div class="tableViewUp"></div><div class="tableViewDown"></div>':'')+'</th><th>';
        },'<th><div class="closeMask">X</div>').slice(0,-4)+'</tr></thead>';
        //表格body部分的HTML
        const bodyHTML=this.data.records.reduce(function(a,b){
            return a+'<tr><td>'+b.reduce(function(c,d){
                return c+'</td><td>'+d;
            })+'</td></tr>';
        },'<tbody>')+'</tbody>';
        this.tableBoxing.innerHTML=headHTML+bodyHTML;
    },
    //事件绑定
    bindUI:function(){
        const that=this;
        //基础的排序：通过获取当前点击的箭头所在<th>标签的索引来确定要排序的数组的第几列，并构造数据结构[item,i]
        //item为实际列表项的值，i为其在data.records中对应索引
        //根据item值排序，由于i与item是在同一数组中绑定的，故排序后的可依次读取data.records中第i个值进行渲染
        function sortBase(e,isMaxFir){
            //确定第几列
            const parArr=Array.from(e.currentTarget.firstElementChild.children);
            const index=parArr.indexOf(e.target.parentElement);
            //构造数据结构
            let orignColData=that.data.records.map(function(item,i){return [item[index],i]});
            //根据boolea类型参数isMaxFir判断根据哪种方式排序
            if(isMaxFir){
                orignColData.sort(that.data.sortFunDown || function(a,b){return b[0]-a[0]});
            }else{
                orignColData.sort(that.data.sortFunUp || function(a,b){return a[0]-b[0]});
            }
            //返回排序后的数据结构
            return orignColData.map(function(item){return item[1]});
        }
        //将排序后的数组索引传入sortBodyRender函数即可改变相应表格顺序
        function sortBodyRender(sortBodyArr){
            if(!this.tableBoxing)return;
            let bodyHTML='';
            for(let i=0,len=sortBodyArr.length;i<len;i++){
                bodyHTML+='<tr><td>';
                bodyHTML+=that.data.records[sortBodyArr[i]].reduce(function(c,d){
                    return c+'</td><td>'+d;
                });
                bodyHTML+='</td></tr>';
            }
            $('tableBoxing').lastElementChild.innerHTML=bodyHTML;
        }
        //max优先事件，跟下箭头绑定
        this.on('maxFirst',function(e){
            const sortBodyArr=sortBase(e,true);
            sortBodyRender(sortBodyArr);
        });
        //min优先事件，跟上箭头绑定
        this.on('minFirst',function(e){
            const sortBodyArr=sortBase(e,false);
            sortBodyRender(sortBodyArr);
        });
        //监听thead，如果点击对应按钮则触发相应事件。。。注意组件中的所有按钮都放在thead中
        this.tableBoxing.firstElementChild.addEventListener('click',function(event){
            const e=event || window.Event;
            if(e.target.className==='tableViewUp'){
                that.fire('minFirst',e);
            }else if(e.target.className==='tableViewDown'){
                that.fire('maxFirst',e);
            }else if(e.target.className==='closeMask'){
                that.destroy();
            }
        });
    },
    //销毁
    destructor:function(){
        //刚开始，render函数还在执行的时候是没有办法使用$，故要加上!this.tableBoxing判断
        if(!this.tableBoxing)return;
        let ele=$('tableBoxing');
        ele.parentElement.removeChild(ele);
    },
    //显示组件
    show:function(data2){
        //注意这里只是浅层替换，不能用extend，不然所添加的数组的索引在默认空数组中并不存在，无法传入
        if(data2){
            for(attr in data2){
                if(attr in this.data){
                    this.data[attr]=data2[attr];
                }
            }
        }
        this.render();
        return this;//以后链式调用可能会用到
    }
},true)