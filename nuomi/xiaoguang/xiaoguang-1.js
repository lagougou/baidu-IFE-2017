"use strict";
var page = require('webpage').create(),system = require('system');
var keyword,count,point,t;
var result={
	code: 0, //返回状态码，1为成功，0为失败
	msg: '抓取失败', //返回的信息
	word: '', //抓取的关键字
	time: 0, //任务的时间
	dataList:[]
};
phantom.outputEncoding="gb2312";
if (system.args.length === 1) {
  console.log('缺少关键字，请确认输入');
  phantom.exit();
}
t = Date.now();
//关键词为第一个参数（第0个参数为xx.js），该参数必须；
//单页搜索最大条数为第二个参数，默认有效值为10；
//搜索起点位置为第三个参数，默认有效值为0；
keyword=system.args[1];
count=system.args[2] || 10;
point=system.args[3] || 0;
//这里要用encodeURI
var url=encodeURI("http://www.baidu.com/s?wd="+keyword+"&rn="+count+"&pn="+point);
result.word=keyword;
//默认在evaluate中不能执行console.log，需加上下面这句代码
page.onConsoleMessage = function(msg) {
    console.log(msg);
};
page.open(url, function(status) {
    if (status === "success") {
    	page.includeJs("http://apps.bdimg.com/libs/jquery/2.1.4/jquery.min.js", function() {
    		//evaluate内为沙盒，不能读取外面的变量，故先用lili取得返回值
            var lili=page.evaluate(function() {
            	var s=jQuery('#content_left').children();
            	var dataList=[];
            	s.each(function(i,el){
            		//如果元素的第一子元素为h3且元素内部有类c-abstract，
            		//则认定该元素为有效搜索条目
            		if(el.firstElementChild.tagName.toLowerCase()==='h3' && jQuery(el).find('.c-abstract').length!==0){
            			//注意这里的el为dom对象，并非jQuery，需先转换
            			el=jQuery(el);
            			var tmp={};
            			tmp.title=el.find('h3:first').text() || '';
            			tmp.info=el.find('.c-abstract:first').text() || '';
            			tmp.link=el.find('h3>a:first').attr('href') || '';
            			tmp.pic=el.find('img.c-img:first').attr('src') || '';
            			dataList.push(tmp);
            		}
            	});
            	return dataList;
            });
        	result.dataList=lili;
        	result.code=1;
	        result.msg='抓取成功';
	        result.time = Date.now() - t;
	        //输出指定格式
	        var str='';
	        for(var i=0,len=result.dataList.length;i<len;i++){
	        	str+='    {\n'+'	title: '+result.dataList[i].title+',\n'+
	        		'	info: '+result.dataList[i].info+',\n'+
	        		'	link: '+result.dataList[i].link+',\n'+
	        		'	pic: '+result.dataList[i].pic+'\n    },\n'
	        }
	        console.log('{\ncode: '+result.code+',\nmsg: '+result.msg+',\nword: '+result.word+',\ntime: '+result.time+',\ndataList:[\n'+str+']');
        	// console.log(JSON.stringify(result));
	        phantom.exit(0);
        });
    } else {
      console.log('网页打开失败，请确认输入正确的网址');
      phantom.exit();
    }
});
