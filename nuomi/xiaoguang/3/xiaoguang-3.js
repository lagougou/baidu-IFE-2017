//使用示例（第三个值为搜索关键字）：node xiaoguang-3.js 世界
//本例尚可拓展关键字，childArgs处修改
//运行本例需要task.js以及device.json,还有相关的依赖

//先cnpm install phantomjs-prebuilt
//cnpm install mongodb
//用mongoose还要学，mongoDB基础还不扎实，故决定直接先用原生驱动
/**************************************************
模块引用
**************************************************/
const phantomjs = require('phantomjs-prebuilt');
const MongoClient = require('mongodb').MongoClient;
const path = require('path');
const childProcess = require('child_process');
const http = require("http");

/**************************************************
mongoDB相关配置
**************************************************/
//test数据库连接字符串,端口：27017
const DB_CONN_STR = 'mongodb://localhost:27017/test';
const binPath = phantomjs.path
const childArgs = [path.join(__dirname, 'task.js'),process.argv[2]];
//mongoDB文档添加函数
const insertData = function(db, callback) {  
    //连接到test文档
    let collection = db.collection('test');
    //插入数据,这里的data在调用时作用域为该模块顶层作用域（function内嵌）
    let data1 = JSON.parse(data[0]);
    collection.insert(data1, function(err, result) { 
        if(err)
        {
            console.log('Error:'+ err);
            return;
        }     
        callback(result);
    });
};

/**************************************************
http服务器,监听8000端口
**************************************************/
let data;
let count=0;//控制爬取与写入次数，在chrome中观察，http会有两次请求，导致重复抓取写入，故设置此变量
http.createServer(function(req, res) {
	//如果是第一次请求，则通过phantomjs运行task.js抓取百度搜索结果（注意pc端会有一段百度招聘信息，故此处用正则提取过滤）
   if(!count){
      data=childProcess.execFileSync(binPath, childArgs).toString().replace(/\s/g,'').match(/{"code[^\r]*/g);
      if(data===null){
	      console.log('抓取失败');
	      throw Error;
	   }else{
	   	  console.log('抓取成功');
	   }
   }
   //相应并将爬取的结果美化格式后显示在页面上
   res.writeHead(200, {"Content-Type": "text/html"});
   res.write('<meta charset="UTF-8"><pre>'+JSON.stringify(JSON.parse(data[0]),undefined,4));  
   res.end();
   //如果是第一次请求，将请求的结果添加到mongoDB中
   if(!count++){
      MongoClient.connect(DB_CONN_STR, function(err, db) {
      	  if(err){console.log('err：'+err)}	
          console.log("数据库连接成功！");
          insertData(db, function(result) {
              db.close();
              console.log("数据添加完成，关闭数据库连接！");
          });
      });
	   //10秒后重置count，才可再次操作
	   setTimeout(function(){count=0},10000);
   }
   console.log(count);//显示请求次数
}).listen(8000);
console.log('server started');