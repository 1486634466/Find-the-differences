var isLogin = false;
if($.cookie().username){
	//已经登录过了
	var htmlStr = "";
	htmlStr += '<a href="#" class="dropdown-toggle" data-toggle="dropdown">'+$.cookie().username+'<span class="caret"></span></a>';
	htmlStr += '<ul class="dropdown-menu">';
	htmlStr += '<li id="uploadHeader"><a href="upload.html">上传头像</a></li>';
	htmlStr += '<li><a href="#" id="logout">退出登录</a></li>';
	htmlStr += '</ul>';
	
	$("#dropDownMenu").addClass("dropdown");
	$("#dropDownMenu").html(htmlStr);
	isLogin = true;
	
	//退出登录
	$("#logout").click(function(){
		$.removeCookie("username");
		location.href = "/";
	});
	
	//显示头像
	
	$.get("/myHeader",function(res){
		var hli = $("<li><img class='header' src=userHeader/"+res+"></li>");
		hli.appendTo($("#menu"));
	});
}