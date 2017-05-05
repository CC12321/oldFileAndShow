
define([
    "dojo/_base/declare", 
    "dojo/_base/lang",
    "dojo/_base/html",
    "dojo/dom",
    "dojo/dom-class",
	"dojo/on",
	"dijit/dijit",
	"Widgets/Dialog/Widget",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dojo/text!./Widget.html"
],
function(declare, lang,html,dom,domClass, on, dijit,Dialog,_WidgetBase,_TemplatedMixin, template) {

	var InputBox = declare("bism.Table", [ _WidgetBase, _TemplatedMixin ],{
			templateString : template,
			_status : false,
			_visible : true,
			_filedData : null,
			_jsonInfoData : null,
			_dialogObject: null,
		    _OBJECTID:"",
		    _optionType: "",
			submitButton : null,
			_hasPicture : false,
			_queryImageBlobPath: "",//有图片时路径
			_topic: null,
			_queryImageBasePath: "",//无图片时，基础图片路径
			_popupButtonType: "",//弹出按钮类型
			_approveState: "",
			_flag:"",
		    
			constructor : function(params, containerId) {
				if(dijit.byId(containerId)){ //注销存在的控件
					dijit.byId(containerId).destroy();
				}
				
				if(dijit.byId("_dialogContainer")){ //注销存在的控件
					dijit.byId("_dialogContainer").destroy();
				}
				if(dojo.byId("_dialogContainer")){ //注销存在的控件
					dojo.byId("_dialogContainer").destroy();
				}
				if(this._dialogContainer){ //注销存在的控件
					this._dialogContainer.destroy();
				}
				
				this.set("_container", containerId);
				if(html.byId(this._container)){
					domClass.add(html.byId(this._container), this.baseClass);
				}				
				this.set("_filedData", params["filedData"]); //json配置数据
				this.set("_optionType", params["optionType"]); //控制编辑页面只读
				this.set("_jsonInfoData", params["jsonInfoData"]); //后台查询数据
				this.set("_OBJECTID", params["OBJECTID"]); //数据id
				this.set("_dialogObject", params["dialogObject"]); //dialog对象 控制关闭
				this.set("_queryImageBlobPath", params["queryImageBlobPath"]); //获取图片访问路径 ,如果数据库中保存的图片格式是 blob
				this.set("_queryImageBasePath", params["queryImageBasePath"]); //获取图片基本路径
				this.set("_topic", params["topic"]); //获取top对象
				this.set("_popupButtonType",params["popupButtonType"]);
				this.set("_flag",params["flag"]);
				if(params["rowNumber"]== ""|| params["rowNumber"]==null) //每行显示的 输入框 个数
					this.set("_rowNumber", 2);
				else
					this.set("_rowNumber", params["rowNumber"]);
			},
			
			startup : function() {
				this._showControl();
			},
			
			_showControl : function(){		
				var html = "";
				html = '<div data-dojo-attach-point="_bizContainer" style="margin-top: 8px;">';
				html += '<table id="'+this._flag+'table_control" class="table" style="border-collapse:separate; border-spacing:2px;width:395px;height:105px;">';
				
				for(var i = 0; i < this._filedData["relation"].length; i++) {
					if(i%this._rowNumber == 0){
						html += "<tr>";
					}
					
					var alias = this._filedData["relation"][i].alias;
					if(this._filedData["relation"][i].alias.length>8)
						alias = this._filedData["relation"][i].alias.substring(0,7) + "<br>" +this._filedData["relation"][i].alias.substring(8,this._filedData["relation"][i].alias.length) ;
					
					html+='<td class="td_right" align="right"><span>'+alias+'</span>：</td>';
					if(i+1 == this._filedData["relation"].length){						
						html+='<td class="td_left" colspan='+(2-i % 3)+'  align="left">';
					}else
						html+='<td class="td_left" align="left">';
					
					//获取对象中的值
					var jsonDataValue = "";
					if(this._jsonInfoData != null){
						var tempName = this._filedData["relation"][i].name;
						if(this._jsonInfoData[tempName] == null){
							jsonDataValue = "";
						}else{
							jsonDataValue = this._jsonInfoData[tempName];
						}
					}
					if(this._filedData["relation"][i].type=="string"){	
						if(this._filedData["relation"][i].readOnly && this._optionType=="Edit")							
							html+='<input id="_'+this._filedData["relation"][i].name+'" maxlength="'+this._filedData["relation"][i].maxlength+'" value="'+jsonDataValue+'" readOnly disabled="true"  class="tableInput"></input>';
						else
							html+='<input id="_'+this._filedData["relation"][i].name+'" maxlength="'+this._filedData["relation"][i].maxlength+'" value="'+jsonDataValue+'"  class="tableInput"></input>';
					}else if(this._filedData["relation"][i].type=="integer" || this._filedData["relation"][i].type=="double"){
						if(this._filedData["relation"][i].readOnly && this._optionType=="Edit")
							html+='<input id="_'+this._filedData["relation"][i].name+'" maxlength="'+this._filedData["relation"][i].maxlength+'" value="'+jsonDataValue+'" readOnly disabled="true"  class="tableInput"></input>';
						else
							html+='<input id="_'+this._filedData["relation"][i].name+'" maxlength="'+this._filedData["relation"][i].maxlength+'" value="'+jsonDataValue+'"  class="tableInput"></input>';
					}else if(this._filedData["relation"][i].type=="date"){
						var da,year,month,date;
						if (jsonDataValue != '') {
							da = new Date(jsonDataValue);
							year = da.getFullYear();
							month = da.getMonth() + 1;
							date = da.getDate();
						}
						if(this._filedData["relation"][i].readOnly && this._optionType=="Edit")
							html+='<input id="_'+ this._filedData["relation"][i].name+'"  value="'+jsonDataValue+'" class="Wdate" readOnly disabled="true" ></input>';
						else
							html+='<input id="_'+ this._filedData["relation"][i].name+'" class="Wdate" value='+  ((jsonDataValue == '') ? '' : [year,month,date].join("-"))  +'></input>';
					}else if(this._filedData["relation"][i].type=="textarea"){
						if(this._filedData["relation"][i].readOnly && this._optionType=="Edit")
							html+='<textarea id="_'+ this._filedData["relation"][i].name+'" value="'+jsonDataValue+'" readOnly disabled="true" class="textarea"></textarea>';
						else
							html+='<textarea id="_'+ this._filedData["relation"][i].name+'" class="textarea">'+jsonDataValue+'</textarea>';
					}else if(this._filedData["relation"][i].type=="select"){
						if(this._filedData["relation"][i].readOnly && this._optionType=="Edit")
							html+='<select	id="_'+ this._filedData["relation"][i].name+'"  readOnly disabled="true" class="tableSelect">';
						else
							html+='<select	id="_'+ this._filedData["relation"][i].name+'" class="tableSelect">';
						html+='<option  value="-1">--请选择--</option>';
						if(this._filedData["relation"][i].option!= undefined && this._filedData["relation"][i].option!=""){							
							for(var info in this._filedData["relation"][i].option){
								if(jsonDataValue==info || this._filedData["relation"][i].option[info] == jsonDataValue)
									html +='<option value="'+info+'" selected="selected">'+ this._filedData["relation"][i].option[info] +'</option>';
								else
									html +='<option value="'+info+'">'+ this._filedData["relation"][i].option[info] +'</option>';
							}
						}
						html+='</select>';
					}else if(this._filedData["relation"][i].type=="picture"){
						this._hasPicture = true;
						html+= '<div style="margin-left: -226px;display: inline;"><form id="myform" enctype="multipart/form-data" action="" method="post" target="myform">';
					    html+= '<input type="file" id="newsFile" name="newsFile" class="newsFile" style="display:none;" accept ="image/jpeg,image/png"></form>';
					    html+= '<div id="imgDisplayDiv" style = "display:block;position:relative;" ><img id="imgDisplay" src="'+this._queryImageBlobPath+'" style="width:200px;height:100px"></div></div><input type="text" id="txtTP1" class = "txtTP1" maxlength="64" style="display: none;">';
					}
					if(this._filedData["relation"][i].isRequire != null){
						if(this._filedData["relation"][i].isRequire == true){
						html += '<font style="color:Red">*</font>';
						}
					}
					html+='</td>';
					if(i % this._rowNumber == 2){
						html += "</tr>";
					}
				}
				html += '</table></div>';
				var cDiv = document.createElement("div");
				cDiv.innerHTML = html;	
				this._filedTableDiv.appendChild(cDiv);
				for(var i = 0; i < this._filedData["relation"].length; i++) {
					if(this._filedData["relation"][i].type=="date"){
						if(this._filedData["relation"][i].readOnly && this._optionType=="Edit"){}
						else{
							if(this._filedData["relation"][i].dateType=="min"){
								on(dom.byId('_'+ this._filedData["relation"][i].name), 'click', lang.hitch(this, function(e) {		
									WdatePicker({minDate:'%y-%M-#{%d+1}'});
								}));
							}else{
								on(dom.byId('_'+ this._filedData["relation"][i].name), 'click', lang.hitch(this, function(e) {		
									WdatePicker();
								}));
							}
						}
					}
				}
				
				if(this._popupButtonType=="approve"){					
					this._registerButton("audit_审核,refuse_拒绝");
					on(dom.byId("auditBizHref"), 'click', lang.hitch(this, function(e) {	
						this._approveState = "true";
						this._submitTable();
					}));
					
					on(dom.byId("refuseBizHref"), 'click', lang.hitch(this, function(e) {
						if(dom.byId('_hfnr').value == ""){
							alert("回复内容为必填项！");
						 	return;
						}					
						this._approveState = "false";
						this._submitTable();
					}));
				}else{
					this._registerButton("submit_提交,reset_重置,cancel_取消");
					on(dom.byId(this._flag+"cancelBizHref"), 'click', lang.hitch(this, function(e) {		
						this._dialogObject.close();
						//回传事件引用
					    this._topic.publish("closeConfirmMessage", "close");
					}));
					
					on(dom.byId(this._flag+"resetBizHref"), 'click', lang.hitch(this, function(e) {
						this._resetControl();
					}));
					
					on(dom.byId(this._flag+"submitBizHref"), 'click', lang.hitch(this, function(e) {
						this._submitTable();
					}));
				}
			},
			
			//生成点击按钮(按钮id+“_”+名称) BizHref为ID固定格式 例如：delBizHref,名称为按钮显示名称
			_registerButton: function(buttonNames){	
				var _buttonStyleImg = "url(" + contentPath + "/Widgets/InputBox/images/button_left.png) no-repeat top left, url(" + contentPath + 
					"/Widgets/InputBox/images/button_right.png) no-repeat top right,url(" + contentPath + "/Widgets/InputBox/images/button_repeat.png) repeat top center";
			    var _buttonHoverStyleImg = "url(" + contentPath + "/Widgets/InputBox/images/button_left_hover.png) no-repeat top left, url(" + 
					contentPath + "/images/button_right_hover.png) no-repeat top right, url(" + contentPath + "/Widgets/InputBox/images/button_repeat_hover.png) repeat top center";
				
			    var arrButtonName = buttonNames.split(",");
				var innerHTML = "";
				for(var i=0; i<arrButtonName.length;i++){
					var arr = arrButtonName[i].split("_");
					if(arr.length>1){
					    innerHTML += "<div style='display:inline-block;padding-right: 16px;padding-bottom:6px;padding-top: 10px;font-family: Arial;'>";
					    innerHTML += "<span id='"+this._flag+arr[0]+"BizHref' style='background-color:#0092D5;padding: 5.5px 15px;font-size: 14px;font-family: Arial;font-weight: bold;color:white;cursor: pointer;'>"+ arr[1] +"</span>";
					    innerHTML += "</div>";
					}
				}
				//innerHTML += "<div id='grayLayer' style='padding-top: 10px;position: absolute;margin-left: 481px;font-family: Arial;display:none'><span id='grayLower' style='padding: 5.5px 48px; font-size: 12px; font-family: Arial; font-weight: bold; color: rgb(9, 57, 103); background: #918F8F;'>处理中</span></div>";
				
				var cDiv = document.createElement("div");
				cDiv.style = "width:100%;height:30px;text-align: center;";
				cDiv.innerHTML = innerHTML;			 
				this._filedTableDiv.appendChild(cDiv);
				
				for(var i=0; i<arrButtonName.length;i++){
					var arr = arrButtonName[i].split("_");
					if(arr.length>1){
						//添加鼠标移动事件
						on(dom.byId(this._flag+arr[0]+"BizHref"), 'mouseover', lang.hitch(this, function(e) {
							e.currentTarget.style.backgroundColor = "#0082BD";
							e.currentTarget.style.color = "#093967";
						}));
						on(dom.byId(this._flag+arr[0]+"BizHref"), 'mouseout', lang.hitch(this, function(e) {
							e.currentTarget.style.backgroundColor = "#0092D5";
							e.currentTarget.style.color = "white";
						}));
					}
				}
			
			},
			
			//重置按钮_cc_注意事项 ，当需重置对象是图片img时,会重置单个单元格里的第一个图片，如有其它图片请放置在其后。
		    _resetControl: function(){
				//var tab = window.table_control;
				var tab = document.getElementById(this._flag+"table_control");
				var rows = tab.rows.length;
				for(var i=0;i<rows;i++){
					var tr = tab.rows.item(i).cells;
					for(var x=0;x<tr.length;x++){
						if(x % 2 == 1){
							var firstChild = tr.item(x).firstChild;
							if(firstChild.localName=="select"){
								firstChild.selectedIndex = 0;
							}else if(firstChild.localName=="input" || firstChild.localName=="textarea"){
								firstChild.value = "";
							}else{
								var itemObject ;
								itemObject = tr.item(x);
								for(var j = 0; j < itemObject.childElementCount;j++){
									if(itemObject.children[j].localName=="img"){
										itemObject.children[j].src = this._queryImageBasePath;
										break;
									}else{
										for(var k = 0; k < itemObject.children[j].childElementCount;k++ ){
											if(itemObject.children[j].children[k].localName=="img"){
												itemObject.children[j].children[k].src = this._queryImageBasePath;
												break;
											}else{
												for(var l = 0; l < itemObject.children[j].children[k].childElementCount;l++ ){
													if(itemObject.children[j].children[k].children[l].localName=="img"){
														itemObject.children[j].children[k].children[l].src = this._queryImageBasePath;
														break;
													}else{
														
													}
											}
										}
									}
									
								}
							}
						}
					}
				}
                   /*if(this._queryImageBasePath != ""){
                       document.getElementById("imgDisplay").src=this._queryImageBasePath;
                   }*/
			  }
		 },
			
			//提交按钮
			_submitTable:function(){
				//判断必填项
				var controlValue = "";
				var control = null;
				var isRequireList = [];
				for(var i = 0 ; i < this._filedData["relation"].length; i ++ ){
					if(this._filedData["relation"][i].isRequire == true){
						control = dom.byId('_'+this._filedData["relation"][i].name);
						 if(control != null){
							 if(this._filedData["relation"][i].type == "select"){
								 controlValue = control.options[control.selectedIndex].value;
							 }else{
								 controlValue = control.value;
							 } 
							 if(controlValue == "" || controlValue == "-1"){
								 alert(this._filedData["relation"][i].alias+"为必填项！");
								 return;
							 }
						 }
					}
					if(this._filedData["relation"][i].minLength){
						control = dom.byId('_'+this._filedData["relation"][i].name);
						controlValue = control.value;
						if (controlValue.length < this._filedData["relation"][i].minLength){
							alert(this._filedData["relation"][i].alias+"长度不够！");
							return;
						}
					}
				}
				//document.getElementById("grayLayer").style.display = "block";//灰层出现
				var responseJson = "{\"OBJECT_ID\":\""+ this._OBJECTID+"\",";
				if(this._popupButtonType=="approve"){
					responseJson += "\"approveState\":\""+ this._approveState+"\",";
				}
				//var tab = window.table_control;
				var tab = document.getElementById(this._flag+"table_control");
				var rows = tab.rows.length;
				for(var i=0;i<rows;i++){
					var tr = tab.rows.item(i).cells;
					for(var x=0;x<tr.length;x++){
						if(x % 2 == 1){
							var firstChild = tr.item(x).firstChild;
							var values = "";
							if(firstChild.nodeName=="SELECT"){
							    
								if(this._getSelectOptionType(firstChild.id.replace('_',''))=="value"){
										values = firstChild.options[firstChild.selectedIndex].value;
								}
								else{
									values = firstChild.options[firstChild.selectedIndex].value;
								}
								values = ((values=="--请选择--"?"":values)=="-1"?"":(values=="--请选择--"?"":values));
							}else if(firstChild.nodeName=="INPUT"){
								values = firstChild.value;
							}else if(firstChild.nodeName == "TEXTAREA"){
								values = firstChild.value;
							}
							responseJson += "\""+firstChild.id.replace('_','')+"\":\"" + values  +"\",";
						}
					}
				}
				if (responseJson.substring(responseJson.length - 1, responseJson.length)==",")
					responseJson = responseJson.substring(0, responseJson.length - 1);
				responseJson += "}";
				
				//回传事件引用
			    this._topic.publish("submitConfirmMessage", responseJson);
			},

		    _refuseControl: function(){
		    	
		    },
		    
		    //检查文件是否是.rar文件
		    _checkRar : function (fileName){
		        var subFix = fileName.substring(fileName.lastIndexOf(".") + 1);
		        if (subFix.toLowerCase() == "jpg" || subFix.toLowerCase() == "png")
		            return true;
		        return false;
		    },
		    
		    onchangeFile : function () {
		        document.getElementById("txtTP1").value = document.getElementById("newsFile").value;
		        //isOnChange = true;
		    },

			_getSelectOptionType:function(value){
				for(var i = 0; i < this._filedData["relation"].length; i++) {
					if(this._filedData["relation"][i].name==value && this._filedData["relation"][i].type=="select"){
						return this._filedData["relation"][i].selectOption;
					}
				}
			}
	});
	
	InputBox.css = "Widgets/InputBox/css/style.css";
	
	return InputBox;
});