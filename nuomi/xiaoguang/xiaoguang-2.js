//BUG，如果输入为中文，则默认中间会空格导致错误，尚未解决
//2017-3-31，bug解决，在传入中文前需用encodeURI转码
//抓取规则console.log('{"width":'+screen.availWidth+',"height":'+screen.availHeight+',"ua":"'+navigator.userAgent+'"}')
"use strict";
/**************************************************
模块引用及配置
**************************************************/
var page = require('webpage').create(),
	system = require('system'),
	fs = require('fs');
//输出编码
phantom.outputEncoding="gb2312";
//默认在evaluate中不能执行console.log，需加上下面这句代码
page.onConsoleMessage = function(msg) {
    console.log(msg);
};

/**************************************************
异常检测处理
**************************************************/
//如果phantom发生错误，则运行下面代码
phantom.onError = function(msg,trace) {
 	var msgStack = ['PHANTOM ERROR:' + msg];
	console.log(msgStack);
	phantom.exit();
};
//检验device.json是否存在并可读
if (fs.isReadable('device.json')){
	var fileJSON = JSON.parse(fs.read('device.json'));
}else{
	console.log('device.json isn\'t found');
	phantom.exit();
}
//检查输入参数的个数，至少应有两个
if (system.args.length === 1) {
  console.log('缺少关键字，请确认输入');
  phantom.exit();
}

/**************************************************
变量定义
**************************************************/
var result,keyword,count,point,t,url,config;
//开始计时
t = Date.now();
//输出默认为失败
result={
	code: 0, //返回状态码，1为成功，0为失败
	msg: '抓取失败', //返回的信息
	word: '', //抓取的关键字
	time: 0, //任务的时间
	device: 'pc',
	dataList:[]
};
//关键词为第一个参数（第0个参数为xx.js），该参数必须；
//设备名称为第二个参数，可用名称有iphone5、iphone6、ipad、pc,分别对应json配置,默认为pc;
//单页搜索最大条数为第三个参数，默认有效值为10；
//搜索起点位置为第四个参数，默认有效值为0；
keyword=system.args[1];
result.word=keyword;
result.device=(fileJSON[system.args[2]])?system.args[2]:'pc';
count=system.args[3] || 10;
point=system.args[4] || 0;
//这里要用encodeURI，不然中文关键字会有空格，导致异常
url=encodeURI("http://www.baidu.com/s?wd="+keyword+"&rn="+count+"&pn="+point);
//载入配置，如果设备名称不可用，可默认为pc
config=fileJSON[result.device];
////测试设备配置
// console.log(JSON.stringify(config,undefined,4));
// phantom.exit();
page.settings.userAgent=config.ua;
page.viewportSize = {
	width: config.width,
	height: config.height
};
//clipRect用以设置视窗大小，这样在page.render时显示的就是只有设置大小
//如果未设置，则默认page.render渲染全文，即截取整个页面（长条图）
//如果设置，则有些设备运行极慢，甚至卡住，故直接注释掉。
// page.clipRect = {
// 	top: 0,
// 	left: 0,
// 	width: config.width,
// 	height: config.height
// };

/**************************************************
打开并抓取页面
**************************************************/
page.open(url, function(status) {
    if (status === "success") {
    	////测试视窗大小
    // 	page.render('baidu.jpeg', {format: 'jpeg', quality: '100'});
  		// phantom.exit();
    	page.includeJs("http://apps.bdimg.com/libs/jquery/2.1.4/jquery.min.js", function() {
    		//evaluate内为沙盒，不能读取外面的变量，故先用lili取得抓取的返回值
            var lili=page.evaluate(function() {
            	//注意移动端s的子元素不一定是div，需要过滤
            	var s=jQuery('#content_left').children();//pc
            	s=s[0]?s:jQuery('#results').children().filter('div');//手机
            	s=s[0]?s:jQuery('ul.bds-result-lists').find('div.result');//ipad
            	s=s[0]?s:'';//::>_<::同时兼容三个设备真心麻烦，还有bug，ipad模式下图片链接有问题，就不调了::>_<::
            	console.log(s);
            	// phantom.exit();
            	var dataList=[];
            	s.each(function(i,el){
            		//如果元素的第一子元素内包含h3(包括自身)且元素内部有类c-abstract
            		//移动端c-abstract内嵌了<p>，类为c-line-clamp3 c-color
            		//则认定该元素为有效搜索条目
            		if(el.firstElementChild.tagName.toLowerCase()==='h3' || jQuery(el.firstElementChild).find('h3').length!==0 && (jQuery(el).find('.c-abstract').length!==0 || jQuery(el).find('p.c-line-clamp3').length!==0)){
            			//注意这里的el为dom对象，并非jQuery，需先转换
            			el=jQuery(el);
            			var tmp={};
            			tmp.title=el.find('h3:first').text() || '';
            			tmp.info=el.find('p.c-line-clamp3:first').text() || el.find('.c-abstract:first').text() || '';
            			tmp.link=el.find('h3>a:first').attr('href') || el.find('a:first').attr('href') || '';
            			tmp.pic=el.find('img.c-img:first').attr('src') || el.find('.c-img:first').find('img').attr('src')  || '';
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
        	console.log(JSON.stringify(result,undefined,4));
	        phantom.exit();
        });
    } else {
      console.log('网页打开失败，请确认输入正确的网址');
	  result.time = Date.now() - t;
      console.log(JSON.stringify(result,undefined,6));
      phantom.exit();
    }
});