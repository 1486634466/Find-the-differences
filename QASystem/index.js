var express = require("express");
var bodyParser = require("body-parser");
var fs = require("fs");

//cookie-parser模块可以解析cookie数据，1能够将客户端发来的cookie
//字符串解析为对象存入req.cookie中。2能够将res.cookie对象序列化
//为cookie字符串通过响应头返回给客户端。
var cookieParser = require("cookie-parser");

//multer模块用于处理multipart/formdata类型的post请求，支持文件
//上传
var multer = require("multer");

var storage = multer.diskStorage({
	//设置文件的上传路径
	destination:"wwwroot/userHeader/",
	//设置存储的文件名，需要通过回调函数callback将文件名返回
	filename:function(req,file,callback){
		var name = req.cookies.username;
		//console.log(file.originalname);
		
		//获得用户上传的文件类型，(文件的后缀)
		var sa = file.originalname.split(".");
		var fileType = sa[sa.length-1];
		
		callback(null,name+"."+fileType);
	}
});

var upload = multer({storage:storage});


var app = express();

app.use(express.static("wwwroot"));

app.use(bodyParser.urlencoded({extended:false}));

app.use(cookieParser());


//注册接口
app.post("/user/register",function(req,res){
	var user = req.body.user;
	var psw = req.body.psw;
	
	if(!fs.existsSync("allUsers")){
		fs.mkdirSync("allUsers");
	}
	
	fs.exists("allUsers/"+user+".json",function(flag){
		if(flag){
			res.json({err:1,status:"用户名已存在"});
		}else{
			fs.writeFile("allUsers/"+user+".json",JSON.stringify(req.body),function(err){
				if(err){
					res.json({err:2,status:"服务器存储错误"});
				}else{
					res.json({err:0,status:"注册成功"});
				}
			});
		}
	});
	
});

//登录接口
app.post("/user/login",function(req,res){
	fs.exists("allUsers/"+req.body.user+".json",function(exi){
		if(exi){
			fs.readFile("allUsers/"+req.body.user+".json",function(err,data){
				if(err){
					res.json({err:2,status:"服务器内部错误"});
				}else{
					var user = JSON.parse(data);
					if(user.psw == req.body.psw){
						//如果用户登录成功，需要向客户端发送一个
						//cookie，当做登录凭证，
						res.cookie("username",req.body.user);
						res.json({err:0,status:"登录成功"});
					}else{
						res.json({err:3,status:"密码错误"});
					}
				}
			});
		}else{
			res.json({err:1,status:"用户不存在"});
		}
	});
});


//上传头像的接口
app.post("/upload", upload.single("photo"),function(req,res){
	
	//status设置本次请求的响应码
//	res.status(200).json({err:0,status:"上传成功"});
	
//	console.log(req.file.originalname);
	var sa = req.file.originalname.split(".");
	var fileType = sa[sa.length-1];
	
	//把用户头像的文件名存入用户资料文件
	fs.readFile("allUsers/"+req.cookies.username+".json",function(err,data){
		var user = JSON.parse(data);
		user.header = req.cookies.username+"."+fileType;
		var userStr = JSON.stringify(user);
		fs.writeFile("allUsers/"+req.cookies.username+".json",userStr,function(err){
			res.send("<script>alert('上传成功');location.href='/';</script>");
		});
	});
	
});

//查询用户头像的接口
app.get("/myHeader",function(req,res){
	fs.readFile("allUsers/"+req.cookies.username+".json",function(err,data){
		var user = JSON.parse(data);
		if(user.header){
			res.send(user.header);
		}else{
			res.send("defaultHeader/timg.jpg");
		}
	});
});


//创建一个空数组，用于存放所有问题
var allQuestions = [];

//如果有问题文件，就把所有问题读出来放入数组。
if(fs.existsSync("allQuestions/allQuestions.json")){
	var jsonStr = fs.readFileSync("allQuestions/allQuestions.json");
	allQuestions = JSON.parse(jsonStr);
}


//提交问题接口
app.post("/question/ask",function(req,res){
	
	var question = {};
	question.content = req.body.content;
	question.content = question.content.replace(/</g,"&lt;");
	question.content = question.content.replace(/>/g,"&gt;");
	//过滤 < 和 > 防止xss攻击。
	question.user = req.cookies.username;
	question.time = new Date();
	
	//req.ip表示本次请求的客户端的ip地址，
	var ip = req.ip;
	question.ip= ip.split("ffff:")[1];
	
	//把问题提问者的头像文件名存入问题数据
	var userData = fs.readFileSync("allUsers/"+req.cookies.username+".json")
	userData = JSON.parse(userData);
	if(userData.header){
		question.header = userData.header;
	}else{
		question.header = "defaultHeader/timg.jpg";
	}
	

	allQuestions.push(question);
	
	var qStr = JSON.stringify(allQuestions);
	fs.writeFile("allQuestions/allQuestions.json",qStr,function(){
		res.json({err:0,status:"提交成功"});
	});
})


//请求所有问题的接口
app.get("/question/all",function(req,res){
	res.json(allQuestions);
});



//回答问题的接口。
app.post("/question/answer",function(req,res){
	var index = req.cookies.index;
	var question = allQuestions[index];
	if(!question.answers){
		question.answers = [];
	}
	
	var answer = {};
	answer.user = req.cookies.username;
	answer.content = req.body.content;
	answer.ip = req.ip.split("ffff:")[1];
	answer.time = new Date();
	var userData = fs.readFileSync("allUsers/"+req.cookies.username+".json")
	userData = JSON.parse(userData);
	if(userData.header){
		answer.header = userData.header;
	}else{
		answer.header = "defaultHeader/timg.jpg";
	}
	
	question.answers.push(answer);
	var qStr = JSON.stringify(allQuestions);
	fs.writeFile("allQuestions/allQuestions.json",qStr,function(){
		res.json({err:0,status:"提交成功"});
	});
});


//搜索问题接口
app.get("/question/search",function(req,res){
	function isAnswerMatch(ans){
		if(ans.content.indexOf(req.query.keyWord)>=0){
			return true;
		}
		
		if(ans.answers){
			for (var i = 0;i<ans.answers.length;i++) {
				if(ans.answers[i].content.indexOf(req.query.keyWord)>=0){
					return true;
				}
			}
		}
		
		return false;
	}
	
	results = [];
	
	allQuestions.forEach(function(obj){
		if(isAnswerMatch(obj)){
			results.push(obj);
		}
	});
	
	res.status(200).json(results);
	
});



app.listen(8080,function(){
	console.log("服务器开启");
})


