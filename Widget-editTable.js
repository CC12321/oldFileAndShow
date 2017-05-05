define([ 
	"dojo/_base/declare", 
	"dojo/_base/lang", 
	"dojo/dom", 
	"dojo/_base/html", 
	"dojo/dom-construct", 
	"dojo/dom-style", 
	"dojo/dom-attr", 
	"dojo/dom-class", 
	"dojo/on", 
	"dojo/Deferred", 
	"dojo/has", 
	"dojo/request/xhr", 
	"dojo/json",
	"dijit/_WidgetBase", 
	"dijit/_TemplatedMixin", 
	"dojo/text!./Widget.html", 
	"dojo/_base/event", 
	"Scripts/utils", 
	"dojo/query", 
	"dojo/NodeList-dom" 
], 
function(declare, lang, dom, html, domConstruct, domStyle, domAttr, domClass, on, Deferred, has, xhr, Json,  _WidgetBase, _TemplatedMixin, template, event, utils, query, nodeListDom) {
	var Widget = declare("bism.Table", [ _WidgetBase, _TemplatedMixin ], {
		baseClass : "bism-table",
		templateString : template,

		_showPageIndex : true,//是否分页
		_showCheckBox : false,//显示选择框 
		_showIndex : true,//显示序号
		_keyField : null,//唯一标识字段
		_checkedKeyList : [],//选择结果
		_checkedChangeList : [],//页面复选框变化数据
		
		_container : null, // 容器ID
		_dataUrl : null, // 数据请求路径
		_everyPage : 10, // 每页显示条数
		_currentPage : 1, // 当前页数
		_fieldDict : null, // 数据字段中英文对照
		_operateList : null, // 操作列表
		_screenConditions : "", // 表格筛选条件
		_tableSort : "", // 表格排序条件
		_curPageData : "", // 记录当前页面数据，用于操作
		_everyPageOptions : [ 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400 ],
		_widgetId : null,
		_serachCondition : [],// 搜索条件
		_data : null, // 表格所有数据
		_checkList : [],// 记录勾选的id号
		_allList : [],//记录所有的id号
		_searchStatus : null,//是否可以进行搜索
		_currentRealtionList : [],//临时关系表
		_colorTr : "",//临时color值
		_timeControl : [],//存储时间
		_childWindow : null,
		_completePrintUrl : "",
		_doubleClick : null,//双击事件
		_maxWidth : null,//宽度限制
		_linkOperate : null,//超链接事件
		_isTwoTimeBox : false, //是否是双MY97
		_chartData : null, //存储chart数据
		_backCallFunction : true,//参数中是否有回调函数
		_callBackFunction : null,//回调函数体
		_topic: null, //接受topic回传对象

		constructor : function(params, containerId,callBackFunction) {
			if(callBackFunction){
				this._callBackFunction = callBackFunction;
			}
			this.set("_container", containerId);
			domClass.add(html.byId(this._container), this.baseClass);
			var dataUrl = params["dataUrl"];
			if (params["dataUrl"]) {
				this.set("_dataUrl", params["dataUrl"]);
			} else {
				this.set("_data", params["data"]);
			}
			
			this._showPageIndex = params["showPageIndex"] == null ? this._showPageIndex : params["showPageIndex"];
			this._showCheckBox = params["showCheckBox"] == null ? this._showCheckBox : params["showCheckBox"];
			this._showIndex = params["showIndex"] == null ? this._showIndex : params["showIndex"];
			
			this._everyPage = params["numberPerPage"] == null ? this._everyPage : params["numberPerPage"];
			this._fieldDict = params["fieldDict"] == null ? this._fieldDict : params["fieldDict"].relation;
			this._operateList = params["operateList"] == null ? this._operateList : params["operateList"];
			this._doubleClick = params["doubleClick"] == null ? this._doubleClick : params["doubleClick"];
			var orderByField = params["orderByField"] == null ? this._tableSort : params["orderByField"].replace(/(^\s+)|(\s+$)/g, "");
			this._tableSort = orderByField == "" ? "" : " " + orderByField + " asc ";
			this._widgetId = utils.getUuid();
			this._searchStatus  = params["searchStatus"] == null ? false : params["searchStatus"];
			this._completePrintUrl  = params["completePrintUrl"] == null ? "" : params["completePrintUrl"];
			this._maxWidth = params["maxWidth"];
			this._topic = params["topic"];
			if(!this._dataUrl || !this._fieldDict){
				this._searchStatus = false;
			}
			
			this._keyField = this.getKeyField();
			_checkedKeyList = [];
		},
		
		startup : function() {
			if (!this._showPageIndex) {
				domConstruct.destroy(this._tableControl);
			}
			lang.hitch(this, this._getTableData)();
			lang.hitch(this, this._registerInitEvents)();
		},
		
		resize : function(){
			if(this._tableContainer.childNodes.length > 0 && this._tableContainer.childNodes[0]["style"]){
				var w = domStyle.get(this._tableContainer.childNodes[0], "width");
				domStyle.set(this.tableControl, "width", w);
			}
		},

		_getTableData : function() {
			this._checkList = [];
			if (this._dataUrl) {
				lang.hitch(this, this._getDataFromUrl)();
			} else if (this._data) {
				lang.hitch(this, this._getDataFromResult)();
			}else{
				console.error("未指定数据来源");
			}
		},

		

		// 通过数据路径获取当前页数据
		_getDataFromUrl : function() {
			var queryUrl = this._dataUrl;
			if (queryUrl.indexOf("?") < 0) {
				queryUrl += "?";
			} else {
				queryUrl += "&";
			}
			queryUrl += "currentPageIndex=" + this._currentPage + "&numberPerPage=" + this._everyPage + "&where=" + encodeURIComponent(this._screenConditions) + "&orderBy=" + encodeURIComponent(this._tableSort);
			xhr(queryUrl, {
				query : {},
				handleAs : "json",
				method : "GET",
				headers : {
					"Accept" : "application/json"
				}
			}).then(lang.hitch(this, function(data) {
				if(data != null && data["page"]  != null ){
					//cjk modify 2016/12/19
//					if(this._callBackFunction != null){
//						this._callBackFunction( data["page"]);//获取数据后使用回调函数
//					}
				}
				
				if(data != null && data["page"]  != null ){
					lang.hitch(this, this._createCurrentPage(data["page"]));
					
					if(this._callBackFunction != null){
						this._callBackFunction(data.result);//获取数据后使用回调函数
					}
					
				} else{
					if(this._fieldDict){//传入对应关系
						var trContent = '<table id="fillTable_' + this._widgetId + '" class="TableWidget" ><tbody><tr class="TableWgTitle titleFont" align=center>';
						trContent += '<td noWrap style="min-width:30px">选择</td>';
						trContent += '<td noWrap style="min-width:30px">序号</td>';
						for(var i = 0; i < this._fieldDict.length; i++) {
							var fieldAlias = this._fieldDict[i]["alias"];
							var field = this._fieldDict[i]["name"];
							trContent += '<td noWrap id="title_' + field + '_' + this._widgetId + '"';
							var currentMaxWidth = this._buildTableDiv.offsetWidth;
							var widthStyle = "";
							var widthCount = 0;
							for(var j = 0; j < this._fieldDict.length; j++){
								var minWidth = this._fieldDict[j]["alias"] == "" ? (this._fieldDict[j]["name"].length * 10 + 55) : (this._fieldDict[j]["alias"].length * 10 + 55);
								widthCount +=  minWidth;
								if(j == this._fieldDict.length - 1){
									if(widthCount <= currentMaxWidth || this._maxWidth){
										var currentMinWidth = fieldAlias == "" ? (field.length * 10 + 55) : (fieldAlias.length * 10 + 55);
										widthStyle = "min-width:" + currentMinWidth + "px;";
									}
								}
							}

							var tempStyle = this._fieldDict[i]["style"] ? this._fieldDict[i]["style"] : "";
							if (this._tableSort != "" && this._tableSort.indexOf(" " + field + " ") > -1) {
								if (this._fieldDict[i]["sort"]) { // 允许排序字段
									if (this._tableSort.toLowerCase().indexOf("asc") > -1) {
										trContent += ' class="sortAscTd" style="cursor:hand;background:url('+utils.getUrlForPackage("Widgets") + '/EditTable/images/up.png)  no-repeat center right;background-position:right 5px center; ';
									} else if (this._tableSort.toLowerCase().indexOf("desc") > -1) {
										trContent += ' class="sortDescTd" style="cursor:hand;background:url('+utils.getUrlForPackage("Widgets") + '/EditTable/images/down.png)  no-repeat center right;background-position:right 5px center; ';
									} else {
										trContent += ' class="sortDefaultTd" style="cursor:hand;background:url('+utils.getUrlForPackage("Widgets") + '/EditTable/images/sort.png)  no-repeat center right;background-position:right 5px center; ';
									}
								}
							}else if (this._fieldDict[i]["sort"]){
								trContent += ' class="sortDefaultTd" style="cursor:hand;background:url('+utils.getUrlForPackage("Widgets") + '/EditTable/images/sort.png)  no-repeat center right;background-position:right 5px center; ';
							}else{
								trContent += ' style=" ';
							}
							if(tempStyle != "")
								trContent += '  '+ widthStyle +' '+ tempStyle +' ">' + fieldAlias + '</td>';
							else
								trContent += ' '+ widthStyle +' " >' + fieldAlias + '</td>';
						}
						trContent += "</tr></table>";
						
						domStyle.set(this._flowBackHref, "display", "none");
						
						this._tableContainer.innerHTML = trContent;
						if(this._tableContainer.childNodes[0] != null){
							var w = domStyle.get(this._tableContainer.childNodes[0], "width");
							domStyle.set(this.tableControl, "width", w);
						}
					}
				}
			}), lang.hitch(this, function(error) {
				alert(error);
			}), lang.hitch(this, function(evt) {
				
				
			}));
		},

		// 通过传递的结果获取当前页数据
		_getDataFromResult : function() {
			var page = {};
			var totalPage = Math.ceil(this._data.length / this._everyPage);
			page["beginindex"] = (this._currentPage - 1) * this._everyPage;
			page["currentPageIndex"] = this._currentPage;
			page["numberPerPage"] = this._everyPage;
			page["hasNextPage"] = (this._currentPage < totalPage && totalPage > 0) ? true : false;
			page["hasPrePage"] = (this._currentPage == 1 || totalPage == 0) ? false : true;
			page["jsonlist"] = null;
			page["restlist"] = null;
			
			var pageData = [];
			for(var i=(this._currentPage - 1) * this._everyPage;i < this._data.length;i++){
				pageData.push(this._data[i]);
				if (i == this._currentPage * this._everyPage - 1){
					break;
				}
			}
			page["list"] = pageData;
			page["totalCount"] = this._data.length;
			page["totalPage"] = totalPage;
			lang.hitch(this, this._createCurrentPage(page));
		},

		// 创建当前表格页面
		_createCurrentPage : function(pageData) {
			if(!this._fieldDict && (pageData == null || !pageData["list"] || pageData["list"].length == 0)){
				console.error("数据为空！");
				return;
			}		
			var parameters = utils.getUrlParameters(window.location.href);
			//var flowID = parameters["flowId"];
			
			if(pageData && pageData["list"] && pageData["list"].length > 0){
				for(var i = 0; i < pageData["list"].length; i++){
					pageData["list"][i]["index"] = i;
				}
			}
			
			this._curPageData = pageData;
			if(!this._fieldDict){
				for(var key in this._curPageData["list"][0]){
					this._currentRealtionList.push(key);
				}
			}
			
			//html.byId(this._container).innerHTML = "";
			this._tableContainer.innerHTML = "";
			//cellSpacing=0 cellPadding=0
			var trContent = '<table id="fillTable_' + this._widgetId + '" class="TableWidget" ><tbody><tr class="TableWgTitle titleFont" align=center>';
			//by zlz
			if (this._showCheckBox) {
				trContent += '<td noWrap style="min-width:30px">选择</td>';
			}
			//by zlz
			if (this._showIndex) {
				trContent += '<td noWrap style="min-width:30px">序号</td>';
			}
			if(this._fieldDict){
				//传入对应关系
				for ( var i = 0; i < this._fieldDict.length; i++) {
					if (!this._fieldDict[i]["isShow"])
						continue;
					
					var fieldAlias = this._fieldDict[i]["alias"];
					var field = this._fieldDict[i]["name"];
					trContent += '<td noWrap id="title_' + field + '_' + this._widgetId + '"';
					var currentMaxWidth = this._buildTableDiv.offsetWidth;
					var widthStyle = "";
					var widthCount = 0;
					for(var j = 0; j < this._fieldDict.length; j++){
						var minWidth = this._fieldDict[j]["alias"] == "" ? (this._fieldDict[j]["name"].length * 10 + 55) : (this._fieldDict[j]["alias"].length * 10 + 55);
						widthCount +=  minWidth;
						if(j == this._fieldDict.length - 1){
							if(widthCount <= currentMaxWidth || this._maxWidth){
								var currentMinWidth = fieldAlias == "" ? (field.length * 10 + 55) : (fieldAlias.length * 10 + 55);
								widthStyle = "min-width:" + currentMinWidth + "px;";
							}
						}
					}

					var tempStyle = this._fieldDict[i]["style"] ? this._fieldDict[i]["style"] : "";
					if (this._tableSort != "" && this._tableSort.indexOf(" " + field + " ") > -1) {
						if (this._fieldDict[i]["sort"]) { // 允许排序字段
							if (this._tableSort.toLowerCase().indexOf("asc") > -1) {
								trContent += ' class="sortAscTd" style="cursor:hand;background:url('+utils.getUrlForPackage("Widgets") + '/EditTable/images/up.png)  no-repeat center right;background-position:right 5px center; ';
							} else if (this._tableSort.toLowerCase().indexOf("desc") > -1) {
								trContent += ' class="sortDescTd" style="cursor:hand;background:url('+utils.getUrlForPackage("Widgets") + '/EditTable/images/down.png)  no-repeat center right;background-position:right 5px center; ';
							} else {
								trContent += ' class="sortDefaultTd" style="cursor:hand;background:url('+utils.getUrlForPackage("Widgets") + '/EditTable/images/sort.png)  no-repeat center right;background-position:right 5px center; ';
							}
						}
					}else if (this._fieldDict[i]["sort"]){
						trContent += ' class="sortDefaultTd" style="cursor:hand;background:url('+utils.getUrlForPackage("Widgets") + '/EditTable/images/sort.png)  no-repeat center right;background-position:right 5px center; ';
					}else{
						trContent += ' style=" ';
					}
					if(tempStyle != "")
						trContent += '  '+widthStyle+' '+ tempStyle +' ">' + fieldAlias + '</td>';
					else
						trContent += ' '+widthStyle+' " >' + fieldAlias + '</td>';
				}
			}else{
				//不传对应关系
				for(var i = 0; i < this._currentRealtionList.length; i++){
					var minWidth = this._fieldDict[i]["name"].length * 10 + 55;
					trContent += '<td noWrap id="title_' + this._currentRealtionList[i] + '_' + this._widgetId + '" style="cursor:hand;min-width:'+ minWidth +'px"';
					trContent += '>' + this._currentRealtionList[i] + '</td>';
				}
			}

			// 判断是否存在操作
			var circleCount = 0;
			if(this._searchStatus){
				circleCount = 1;
			}
			if (this._operateList && this._operateList.length > 0){
				circleCount = this._operateList.length;
			}
			if(circleCount > 0){
				var tempwidth = circleCount * 30 + "px";
				trContent += "<td colspan='"+circleCount+"' style='"+tempwidth+";min-width: 30px;'>操作</td>";
			}

			trContent += "</tr>";

			if (this._searchStatus) {
				// 生成搜索框
				trContent += '<tr class="TableWgSearch" id="serachInput_' + this._widgetId + '">';
				if (this._showCheckBox) {
					trContent += '<td>&nbsp;</td>';
				}
				trContent += '<td>&nbsp;</td>';

				for ( var i = 0; i < this._fieldDict.length; i++) {		
					if (!this._fieldDict[i]["isShow"])
						continue;
					var tempId = this._fieldDict[i]["name"];
					if (this._fieldDict[i]["search"]) {
						if (this._fieldDict[i]["type"] == "number" && this._fieldDict[i]["selectStatus"]) {
							trContent += '<td style="min-width:150px"><select id="' + tempId + '_Select_' + this._widgetId + '" style="height: 20px;max-width:50px"><option value=等于>等于</option><option value=大于>大于</option><option value=小于>小于</option></select>';
							trContent += '<input type="text" fieldType="number" id="' + tempId + '_Search_' + this._widgetId + '" style = "margin-left:3px;max-width:95px" class="searchBox"></td>';
						} else if(this._fieldDict[i]["type"] == "time"){
							trContent += '<td style="min-width:220px;display:inline-block"><select id="' + tempId + '_TimeSelect_' + this._widgetId + '" style="height: 20px;max-width:50px"><option value=等于>等于</option><option value=大于>大于</option><option value=小于>小于</option></select>';
							trContent += '<input id="' + tempId + '_Time_' + this._widgetId + '"  class="Wdate" value="">';
						} else if(this._fieldDict[i]["type"] == "timeAndTime"){
							this._isTwoTimeBox = true,
							trContent += '<td style="min-width:220px;display:inline-block;width:400px"><select id="' + tempId + '_TimeSelect_' + this._widgetId + '" style="height: 20px;max-width:50px"><option value=等于>等于</option><option value=大于>大于</option><option value=小于>小于</option></select>';
							trContent += '<input type="text" fieldType="time" id="' + tempId + '_Time_' + this._widgetId + '" style = "margin-left:5px;max-width:100px" class="Wdate">';
							trContent += '<select id="' + tempId + '1_TimeSelect1_' + this._widgetId + '" style="height: 20px;max-width:50px"><option value=等于>等于</option><option value=大于>大于</option><option value=小于>小于</option></select>';
							trContent += '<input type="text" fieldType="time" id="' + tempId + '1_Time1_' + this._widgetId + '" style = "margin-left:5px;max-width:100px" class="Wdate">';
						    trContent += '<select id="' + tempId + '_TimeSelectType_' + this._widgetId + '" style="height: 20px;max-width:80px"><option value=byday>按天查询</option><option value=byhour>按小时查询</option></select></td>';
						} else if(this._fieldDict[i]["condition"]){// by zlz this._fieldDict[i]["searchtype"] == undefined
							trContent += '<td><select id="' + tempId + '_ConditionSelect_' + this._widgetId + '" style="height: 20px;width:100%"><option></option><option value=1>是</option><option value=0>否</option></select></td>';
						} else if(this._fieldDict[i]["type"] == "number"){
							trContent += '<td><input type="text" fieldType="number" id="' + tempId + '_Search_' + this._widgetId + '" style = "width:90%" class="searchBox"></td>';
						} else if(this._fieldDict[i]["type"] == "select"){
							/*if (this._fieldDict[i]["searchtype"] == undefined) {// by zlz
								trContent += '<td><input type="text" id="' + tempId + '_Search_' + this._widgetId + '" style = "width:100%"></td>';*/
							//} else {// by zlz 搜索条件中如果是下拉列表，取值字段为数据库中的name，下拉列表值放在restlist中。
								tempId = this._fieldDict[i]["idname"];
								trContent += '<td><select id="' + tempId + '_Select_' + this._widgetId + '" style="height: 20px;width:100%"><option></option>';
								for (var j = 0; j < this._curPageData["restlist"].length; j++) {
									trContent +='<option value=' + this._curPageData["restlist"][j]["id"] + '>' + this._curPageData["restlist"][j]["name"] + '</option>';
								}
								trContent += '</select></td>';
							//}
						} else {
							trContent += '<td><input type="text" id="' + tempId + '_Search_' + this._widgetId + '" style = "width:90%" class="searchBox"></td>';
						}
					} else {
						trContent += '<td>&nbsp;</td>';
					}	
				}

				// 判断编辑、删除、详细列是否存在
				trContent += '<td noWrap align=center><a href="javascript:void(0)" style="color:#3e89c0" id="searchClick_' + this._widgetId + '">搜索</a></td>';
				if (this._operateList) {
					for ( var w = 0; w < this._operateList.length - 1; w++) {
						trContent += "<td>&nbsp;</td>";
					}
				}

				trContent += "</tr>";
			}

			//生成表格
			if (this._curPageData && this._curPageData["list"]) {
				if(this._topic !=null){					
					this.topic.subscribe("requestCheckedBoxArr", lang.hitch(this, function(arr) { //从widget中获取 返回输入框中的值，返回 json格式
						this._checkedKeyList = arr;
					}));					
					this._topic.publish("responseCheckedBoxArr", null);
				}
				
				for (var i = 0; i < this._curPageData["list"].length; i++) {
					if(this._searchStatus){
						if(i % 2 == 0){
							trContent += '<tr class="TableWgTextDouble" id="MTGridText_' + i + '_'+ this._widgetId +'">';
						}else{
							trContent += '<tr class="TableWgTextSingle" id="MTGridText_' + i + '_'+ this._widgetId +'">';
						}
					}else{
						if(i % 2 == 0){
							trContent += '<tr class="TableWgTextSingle" id="MTGridText_' + i + '_'+ this._widgetId +'">';
						}else{
							trContent += '<tr class="TableWgTextDouble" id="MTGridText_' + i + '_'+ this._widgetId +'">';
						}
					}
					
					//重新放开选择框(复选框)
					if (this._showCheckBox) {
						if (this._curPageData["list"][i]["isCheck"]) {							
							trContent += '<td class="TableWgTextTdText" align="center"><input type="checkbox" checked id="choosechecked_' + i + '_'+ this._widgetId +'"  /></td>';// style="height:16px;width:16px;text-align:center"
							var bSelected = true;
							for (var j=0; j<this._checkedKeyList.length; j++) {
								if (this._curPageData["list"][i][this._keyField] == this._checkedKeyList[j]) {
									bSelected = false;
									break;
								}
							}
							if (bSelected) {									
								this._checkedKeyList.push(this._curPageData["list"][i][this._keyField]);
							}
						} else {
							if(this._curPageData["list"][i]["notchange"]){ //不可更改  llw add
								trContent += '<td class="TableWgTextTdText" align="center"><input type="checkbox" disabled="true"  /></td>';// style="height:16px;width:16px;text-align:center"
							}else{
								var bSelected = false;
								for (var j=0; j<this._checkedKeyList.length; j++) {
									if (this._curPageData["list"][i][this._keyField] == this._checkedKeyList[j]) {
										bSelected = true;
										break;
									}
								}
								if (bSelected) {
									trContent += '<td class="TableWgTextTdText" align="center"><input type="checkbox" checked id="choosechecked_' + i + '_'+ this._widgetId +'"  /></td>';// style="height:16px;width:16px;text-align:center"
								} else {
									trContent += '<td class="TableWgTextTdText" align="center"><input type="checkbox"  id="choosechecked_' + i + '_'+ this._widgetId +'"  /></td>';// style="height:16px;width:16px;text-align:center"
								}
							}
						}
					}
					if (this._showIndex) {
						trContent += '<td class="TableWgTextTdText" title="顺序号" align="center">' + (i + 1) + '</td>';						
					}
					
					// 表格返回字段
					if(this._fieldDict){
						var linkIndex = 0;//初始化超链接事件数目
						for (var j = 0; j < this._fieldDict.length; j++) {
							if (!this._fieldDict[j]["isShow"])
								continue;
							
							
							if(this._fieldDict[j]["list"]){
								var tempList = this._fieldDict[j]["list"];
								var tempIdName = this._fieldDict[j]["name"];

								trContent += '<td class="TableWgTextTdText" align="center"><select id="'+tempIdName+'_ContenSelect_'+i+'_value_'+ this._widgetId +'">';
								for(var k = 0; k < tempList.length; k++){
									var tempValue = tempList[k];
									var fieldName = this._fieldDict[j]["name"];
									var selectStatus = "";
									if(this._curPageData["list"][i][fieldName] && this._curPageData["list"][i][fieldName] == tempValue["name"]){
										trContent += '<option selected=selected value="' + tempValue["value"]+'">'+tempValue["name"]+'</option>';		
									}else{
										trContent += '<option value="'+tempValue["value"] +'">'+tempValue["name"]+'</option>';
									}
								}
								trContent += '</select></td>';
							}else{
								var fieldName = this._fieldDict[j]["name"];
								var edit = this._fieldDict[j]["edit"];
								var fieldValue = this._curPageData["list"][i][fieldName] == undefined ? "" : this._curPageData["list"][i][fieldName].toString();
								if(fieldValue.length > 30){
									fieldValue = fieldValue.substring(0,30);
									fieldValue = fieldValue + "..."
								}
								var isValid = this._curPageData["list"][i]["isvalid"];
								isValid = isValid == null ? 1 : (isValid === "" ? 1 : isValid);
								var typeEdit = "";
								
//								if(flowID == 18 && fieldName == "CERTOPERATOR"){
//									fieldValue = window.firstName;
//								}
								
								if(this._fieldDict[j]["condition"] && fieldValue != ""){
									trContent += '<td class="TableWgTextTdText" align="center" id="' + fieldName + '' + i + '_value_'+ this._widgetId +'" style="'+ this._fieldDict[j]["condition"][fieldValue]["style"] +'">' + this._fieldDict[j]["condition"][fieldValue]["alias"] + '</td>';
								}else {
									//var disabled = (flowID == "17" || flowID == "18") ? "" : ' disabled="disabled" ';
									var disabled = "";
									var width = this._fieldDict[j]["width"] == null ? "100%" : this._fieldDict[j]["width"];
									var htmlContent = "";
									
									if(edit == 0){
										if(this._fieldDict[j]["valueList"] && fieldValue !=""){
											var fieldTrueValue = fieldValue;
											for(var k = 0; k < this._fieldDict[j]["valueList"].length; k++){
												if(this._fieldDict[j]["valueList"][k]["value"] == fieldValue){
													fieldValue = this._fieldDict[j]["valueList"][k]["name"];
													
													break;
												}
											}
											htmlContent = '<span id="' + fieldName + '' + i + '_value_'+ this._widgetId + '"' + disabled + ' value="'+ fieldTrueValue +'" style="width:' + width + 'px;">' + fieldValue + '</span>';
										}else{
											
											if (fieldValue=="[object Object]"){
												var map = this._curPageData["list"][i][fieldName];
												var key = this._curPageData["restlist"][i][fieldName] ;
												htmlContent = '<span id="' + fieldName + '' + i + '_value_'+ this._widgetId + '"' + disabled + ' style="width:' + width + 'px;">' + map[key] + '</span>';
											}else
												htmlContent = '<span id="' + fieldName + '' + i + '_value_'+ this._widgetId + '"' + disabled + ' style="width:' + width + 'px;">' + fieldValue + '</span>';
										
										}		
									}
									else if(edit == 1){
										htmlContent = '<input id="' + fieldName + '' + i + '_value_'+ this._widgetId + '" value="' + fieldValue + '" style="width:' + width + 'px;"' + disabled + '/>';
									}
									else if(edit == 4){
										disabled = '';
										if(isValid == 0){
											disabled = ' disabled="disabled" ';
										}
										
										htmlContent = '<input id="' + fieldName + '' + i + '_value_'+ this._widgetId + '" value="' + fieldValue + '" style="width:' + width + 'px;"' + disabled + '/>';
									}
									else if(edit == 2){
										htmlContent = '<select id="' + fieldName + '' + i + '_value_'+ this._widgetId + '" style="width:' + width +'px;"' + disabled + '>';
										if(this._fieldDict[j]["dict"]){
											for(var key in this._fieldDict[j]["dict"]){
												htmlContent += "<option value='" + key + "'>" + this._fieldDict[j]["dict"][key] + "</option>";
											}
										}
										else if(this._fieldDict[j]["dictKey"]){
											var map = this._curPageData["list"][i][this._fieldDict[j]["dictKey"]];
											for(var key in map){
												htmlContent += "<option value='" + key + "'>" + map[key] + "</option>";
											}
										}else{
											//从后台传的之中读取
											var map = this._curPageData["list"][i][fieldName];
											var emptyStatus = false;
											for(var key in map){
												if(key == ""){
													emptyStatus = true;
												}
											}
											
											if(!emptyStatus){
												htmlContent += "<option></option>";
											}
											
											for(var key in map){
												htmlContent += "<option value='" + key + "'";
												//debugger;
												if (this._curPageData["restlist"][i] && this._curPageData["restlist"][i][fieldName] && this._curPageData["restlist"][i][fieldName] == key)
													htmlContent += ' selected=selected';
												htmlContent += ">" + map[key] + "</option>";
											}
										}
										
										htmlContent += "</select>";
									}
									else if(edit == 3){
										if(fieldValue == null){
											fieldValue = "";
										}
									
										var timeStatus = this._fieldDict[j]["timeStatus"] ? true : false;
										var timeFormat = "WdatePicker({dateFmt:\'yyyy-MM-dd\'})";
										if(timeStatus){
											timeFormat = "WdatePicker({dateFmt:\'yyyy-MM-dd HH:mm:ss\'})";
										}
										//时间控件
										htmlContent = '<input id="' + fieldName + '' + i + '_value_'+ this._widgetId + '" value="' + fieldValue + '"' + disabled + ' class="Wdate" onclick="'+ timeFormat +'" style="width:' + width + 'px;"/>';
									}
									else if(edit == 5){
										htmlContent = '<a href="javascript:void(0)" id="linkOpearte_' + i + '_' + linkIndex + '_'+ this._widgetId +'" value="' + this._fieldDict[j]["alias"] + '">' + this._fieldDict[j]["alias"] + '</a>';
										linkIndex++;
									}
									else{
										htmlContent = fieldValue;
									}
									//cc 合并每行最后的单元格
									if(j+1 == this._fieldDict.length){
										trContent += '<td colspan="2" class="TableWgTextTdText" align="center">' + htmlContent + '</td>';
									}else{
										trContent += '<td class="TableWgTextTdText" align="center">' + htmlContent + '</td>';
									}
									
								}
							}
						}
					}else{
						//不传对应关系
						for(var j = 0; j < this._currentRealtionList.length; j++){
							var fieldName = this._currentRealtionList[j];
							var fieldValue = this._curPageData["list"][i][fieldName] == undefined ? "" : this._curPageData["list"][i][fieldName];
							trContent += '<td class="TableWgTextTdText" align="center" id="' + fieldName + '' + i + '_value_'+ this._widgetId +'">' + fieldValue + '</td>';				
						}
					}

					
					//待修改，操作链接是否显示
					if (this._operateList && this._operateList.length > 0) {
						for ( var w = 0; w < this._operateList.length; w++) {
							if (this._operateList[w].isLinkShow == undefined) {
								trContent += '<td class="TableWgTextTdA" align="center" style="min-width:25px"><a href="javascript:void(0)" id="opearte_' + i + '_' + w + '_'+ this._widgetId +'" style="color:#3e89c0;display:block">' + this._operateList[w].name + '</a></td>';
							} else {
								if (this._curPageData["list"][i]["isLinkShow"] == undefined) {
									trContent += '<td class="TableWgTextTdA" align="center" style="min-width:25px"><a href="javascript:void(0)" id="opearte_' + i + '_' + w + '_'+ this._widgetId +'" style="color:#3e89c0;display:block">' + this._operateList[w].name + '</a></td>';
								} else {
									if (this._curPageData["list"][i]["isLinkShow"]=="true") {
										trContent += '<td class="TableWgTextTdA" align="center" style="min-width:25px"><a href="javascript:void(0)" id="opearte_' + i + '_' + w + '_'+ this._widgetId +'" style="color:#3e89c0;display:block">' + this._operateList[w].name + '</a></td>';
									} else {
										trContent += '<td class="TableWgTextTdA" align="center" style="min-width:25px"><a href="javascript:void(0)" id="opearte_' + i + '_' + w + '_'+ this._widgetId +'" style="color:#3e89c0;display:none">' + this._operateList[w].name + '</a></td>';
									}
									
								}
							}
							
						}
					} else if(this._searchStatus){
						//trContent += "<td class='TableWgTextTdA' align='center'>&nbsp;</td>";//cjk modify 2016/12/19 前一个td改为colspan=2
					}
					trContent += '</tr>';
				}
			}else{
				console.log("获取的数据为空");
			}
			trContent += '</tbody></table>';
			this._tableContainer.innerHTML = trContent;
			
			
			if(this._tableContainer.childNodes[0] != null){
				var w = domStyle.get(this._tableContainer.childNodes[0], "width");
				domStyle.set(this.tableControl, "width", w);
			}
			
			if(this._fieldDict && this._fieldDict[j] && (this._fieldDict[j]["dict"] || this._fieldDict[j]["dictKey"])){
				for (var i = 0; i < this._fieldDict.length; i++) {
					if (!this._fieldDict[i]["isShow"])
						continue;
					
					
					if(this._fieldDict[i]["edit"] == 2){
						var fieldName = this._fieldDict[i]["name"];
						
						for(var j = 0; j < this._curPageData["list"].length; j++){
							for(var key in this._curPageData["list"][j]){
								if(key == fieldName){
									var id = fieldName + '' + j + '_value_'+ this._widgetId;
									if(dom.byId(id).selectedOptions == null){
										dom.byId(id).value = this._curPageData["list"][j][key];
									}
								}
							}
						}
					}
				}
			}

			if (this._curPageData) {
				if(this._curPageData["list"] && this._curPageData["list"].length > 0){
					for (var i = 0; i < this._curPageData["list"].length; i++) {
						html.attr("MTGridText_" + i + "_" + this._widgetId, "rowIndex", i);
						if(this._curPageData["list"][i]["notchange"]){ //不可更改  llw add
							continue;
						}
						if (this._showCheckBox && dom.byId("choosechecked_" + i + "_" + this._widgetId)) {
							html.attr("choosechecked_" + i + "_" + this._widgetId, "rowIndex", i); //by zlz 重新放开选择框
							if (this._keyField) {
								html.attr("choosechecked_" + i + "_" + this._widgetId, "keyValue", this._curPageData["list"][i][this._keyField]); //by zlz 重新放开选择框
								html.attr("choosechecked_" + i + "_" + this._widgetId, "checkStatus", this._curPageData["list"][i]['isCheck']); //by zlz 重新放开选择框
							}
						}
					}
				}
				
				this._tableControl.style.display = "block";
				this.everyPageSel.innerHTML = "";
				for ( var w = 0; w < this._everyPageOptions.length; w++) {
					var option = document.createElement("option");
					option.innerHTML = this._everyPageOptions[w];
					option.value = this._everyPageOptions[w];
					this.everyPageSel.appendChild(option);
				}
				this.pageValue.innerHTML = this._curPageData["currentPageIndex"];
				this.pageTotal.innerHTML = this._curPageData["totalPage"];
				if (this._curPageData["hasPrePage"]){
					this.pageStart.style.display = "inline-block";
					this.pagePrevious.style.display = "inline-block";
				}else{
					this.pageStart.style.display = "none";
					this.pagePrevious.style.display = "none";
				}
				if (this._curPageData["hasNextPage"]){
					this.pageNext.style.display = "inline-block";
					this.pageEnd.style.display = "inline-block";
				}else{
					this.pageNext.style.display = "none";
					this.pageEnd.style.display = "none";
				}

				this.recordCount.innerHTML = this._curPageData["totalCount"];
				this.pageJump.value = this._curPageData["currentPageIndex"];
				this.everyPageSel.value = this._everyPage;
			}

			this._registerEvents();// 添加绑定事件

			// 设置搜索条件
			for (var i = 0; i < this._serachCondition.length; i++) {
				var _nameContainNumber = false;
				var fieldName = this._serachCondition[i]["name"];
				var fieldValue = this._serachCondition[i]["value"];
				var temCondition;
				if (this._serachCondition[i]["condition"]) {// by zlz修改
					if(this._serachCondition[i]["type"] && this._serachCondition[i]["type"] == "time"){

                   var reg = new RegExp("^[0-9]*$");
                   var tempName = this._serachCondition[i]["name"];
                   if(tempName.match(/\d+/g) != null){
                     _nameContainNumber = true;
                   }else{
                   	 _nameContainNumber = false;
                   }

						if (this._serachCondition[i]["condition"] == ">")
							temCondition = "大于";
						if (this._serachCondition[i]["condition"] == "<")
							temCondition = "小于";
						if (this._serachCondition[i]["condition"] == "=")
							temCondition = "等于";
					if(_nameContainNumber != true){
						html.byId(fieldName + "_TimeSelect_" + this._widgetId).value = temCondition;
						html.byId(fieldName + "_Time_" + this._widgetId).value = fieldValue;
					}else{
                        html.byId(fieldName + "_TimeSelect"+ this._findNumberFromName(tempName) + "_" + this._widgetId).value = temCondition;
                        html.byId(fieldName + "_Time"+ this._findNumberFromName(tempName) + "_" + this._widgetId).value = fieldValue;     
					}


                 
					}else if(this._serachCondition[i]["type"] && this._serachCondition[i]["type"] == "select"){// by zlz修改
						html.byId(fieldName + "_Select_" + this._widgetId).value = fieldValue;
					} else{
						if (this._serachCondition[i]["condition"] == ">")
							temCondition = "大于";
						if (this._serachCondition[i]["condition"] == "<")
							temCondition = "小于";
						if (this._serachCondition[i]["condition"] == "=")
							temCondition = "等于";
						html.byId(fieldName + "_Select_" + this._widgetId).value = temCondition;
						html.byId(fieldName + "_Search_" + this._widgetId).value = fieldValue;
					}
				} else {
					html.byId(fieldName + "_Search_" + this._widgetId).value = fieldValue;
				}
			}
		},

			//获取名称中的数字
			_findNumberFromName : function(tempName){
				var containNumber =  tempName.replace(/[^0-9]+/g,'');
							   return containNumber;
			},


		// 操作按钮点击事件
		_onOperateClick : function(e) {
			var rowIndex = html.attr(e.target, "rowIndex");
			var operateIndex = html.attr(e.target, "operateIndex");
			if (this._curPageData && this._curPageData.list && this._curPageData.list[rowIndex] && this._operateList && this._operateList[operateIndex] && this._operateList[operateIndex].func) {
				var item = this._curPageData.list[rowIndex];
				
				if(this._fieldDict){
					for (var i = 0; i < this._fieldDict.length; i++) {
						if(this._fieldDict[i]["list"]){
							var fieldName = this._fieldDict[i]["name"];
							var selectContent = html.byId(fieldName + "_ContenSelect_" + rowIndex + "_value_" + this._widgetId);
							for(var key in this._curPageData["list"][rowIndex]){
								if(key == fieldName){
									this._curPageData["list"][rowIndex][key] = selectContent.value;
								}
							}
						}else if(this._fieldDict[i]["edit"] > 0 && this._fieldDict[i]["edit"] !== 5){
							var fieldName = this._fieldDict[i]["name"];
							var id = fieldName + '' + rowIndex + '_value_'+ this._widgetId;
							var value = dom.byId(id).value;
							
							for(var key in this._curPageData["list"][rowIndex]){
								if(key == fieldName){
									this._curPageData["list"][rowIndex][key] = value;
								}
							}
						}
					}
				}
				
				this._operateList[operateIndex].func(this, item);
			}
		},

		//双击事件传值
		_onDblClick : function(e){
			var rowIndex = (html.attr(e.target, "rowIndex") == "" || html.attr(e.target, "rowIndex") == null) ? html.attr(e.target.parentElement, "rowIndex") : html.attr(e.target, "rowIndex");
			if (this._curPageData && this._curPageData.list && this._curPageData.list[rowIndex] && this._doubleClick) {
				var item = this._curPageData.list[rowIndex];
				
				if(this._fieldDict){
					for (var i = 0; i < this._fieldDict.length; i++) {
						if(this._fieldDict[i]["edit"] > 0 && this._fieldDict[i]["edit"] !== 5){
							var fieldName = this._fieldDict[i]["name"];
							var id = fieldName + '' + rowIndex + '_value_'+ this._widgetId;
							var value = dom.byId(id).value;
							
							for(var key in this._curPageData["list"][rowIndex]){
								if(key == fieldName){
									this._curPageData["list"][rowIndex][key] = value;
								}
							}
						}
					}
				}
				
				this._doubleClick(this, item);
			}
		},
		
		_registerInitEvents : function(){



			// 刷新
			//html.byId("pageRefresh")
			on(this.pageRefresh, "click", lang.hitch(this, function() {
				lang.hitch(this, this.refreshRecord());
			}));
			
			// 改变每页显示行数
			on(this.everyPageSel, "change", lang.hitch(this, function() {
				lang.hitch(this, this._onChangeEveryPage)();
			}));

			// 首页
			if (this.pageStart) {
				on(this.pageStart, "click", lang.hitch(this, function() {
					lang.hitch(this, this._pageJump)(1);
				}));
			}
			// 尾页
			if (this.pageEnd) {
				on(this.pageEnd, "click", lang.hitch(this, function() {
					lang.hitch(this, this._pageJump)(this._curPageData["totalPage"]);
				}));
			}
			// 前一页
			if (this.pagePrevious) {
				on(this.pagePrevious, "click", lang.hitch(this, function() {
					lang.hitch(this, this._pageJump)(this._currentPage - 1);
				}));
			}

			// 后一页
			if (this.pageNext) {
				on(this.pageNext, "click", lang.hitch(this, function() {
					lang.hitch(this, this._pageJump)(this._currentPage + 1);
				}));
			}

			// 跳页
			if (this.pageJump) {
				on(this.pageJump, "keydown", lang.hitch(this, function(e) {
					if (e.keyCode == 13) {
						var userAgent = navigator.userAgent;
						var inputValue = 1;
						if (userAgent.indexOf("Firefox") > -1) {
							inputValue = e.target.value;// target是Firefox下的属性
						} else {
							inputValue = e.srcElement.value;// ie下的属性
						}
						if(inputValue > this._curPageData["totalPage"])
							inputValue = this._curPageData["totalPage"];
						lang.hitch(this, this._pageJump)(inputValue);
					}
				}));
			}
		},
		
		_registerEvents : function() {
			if(this._fieldDict && this._fieldDict.length > 0){
				// 排序事件
				for ( var i = 0; i < this._fieldDict.length; i++) {
					if (!this._fieldDict[i]["isShow"])
						continue;					
					var field = this._fieldDict[i]["name"];
					var tdId = "title_" + field + "_" + this._widgetId;
					html.attr(html.byId(tdId), "field", field);
					html.attr(html.byId(tdId), "filedIndex", i);
					on(html.byId(tdId), "click", lang.hitch(this, function(e) {
						lang.hitch(this, this._sortByField)(e);
					}));
				}
			}else{
				//不传入对应关系时候的排序
				for ( var i = 0; i < this._currentRealtionList.length; i++) {
					var field = this._currentRealtionList[i];
					var tdId = "title_" + field + "_" + this._widgetId;
					html.attr(html.byId(tdId), "field", field);
					html.attr(html.byId(tdId), "filedIndex", i);
					on(html.byId(tdId), "click", lang.hitch(this, function(e) {
						lang.hitch(this, this._sortByFieldNoRealtion)(e);
					}));
				}
			}

			if (this._searchStatus) {
				// 更改select事件
				for ( var i = 0; i < this._fieldDict.length; i++) {
					var field = this._fieldDict[i]["name"];
					var fieldType = this._fieldDict[i]["type"];
					var currentSearchStatus = this._fieldDict[i]["search"];
					if(currentSearchStatus){
						if (fieldType.toLowerCase() == "number" && this._fieldDict[i]["search"] && this._fieldDict[i]["selectStatus"]) {
							html.attr(html.byId(field + "_Select_" + this._widgetId), "field", field);
							on(html.byId(field + "_Select_" + this._widgetId), "change", lang.hitch(this, function(e) {
								var curField = html.attr(e.target, "field");
								lang.hitch(this, this._onChangeSearchCondition)(curField);
							}));
						}else if(fieldType.toLowerCase() == "time"){
							html.attr(html.byId(field + "_TimeSelect_" + this._widgetId), "field", field);
							on(html.byId(field + "_TimeSelect_" + this._widgetId), "change", lang.hitch(this, function(e) {
								var curField = html.attr(e.target, "field");
								lang.hitch(this, this._onChangeSearchCondition)(curField);//添加时间选择条件事件
							}));
						}else if(this._fieldDict[i]["condition"]){
							html.attr(html.byId(field + "_ConditionSelect_" + this._widgetId), "field", field);
							on(html.byId(field + "_ConditionSelect_" + this._widgetId), "change", lang.hitch(this, function(e) {
								var curField = html.attr(e.target, "field");
								lang.hitch(this, this._onChangeSearchConditionStatus)(curField);//添加时间选择条件事件
							}));
						} else if(fieldType.toLowerCase() == "select"){// by zlz
							var idfield = this._fieldDict[i]["idname"];
							html.attr(html.byId(idfield + "_Select_" + this._widgetId), "field", field);
							html.attr(html.byId(idfield + "_Select_" + this._widgetId), "idfield", idfield);
							on(html.byId(idfield + "_Select_" + this._widgetId), "change", lang.hitch(this, function(e) {
								var curField = html.attr(e.target, "idfield");
								lang.hitch(this, this._onChangeSelectCondition)(curField);//添加搜索下拉列表框选择条件事件
							}));
						}
					}
				}

				// 搜索事件
				for ( var i = 0; i < html.byId("serachInput_" + this._widgetId).children.length; i++) {
					var serachTd = html.byId("serachInput_" + this._widgetId).children[i];
					var isInput = true;
					if (html.byId("serachInput_" + this._widgetId).children[i].children.length > 0) {
						var inputId = new Array();
						inputId[0] = html.byId("serachInput_" + this._widgetId).children[i].children[0].id;
						if (html.byId("serachInput_" + this._widgetId).children[i].children.length == 2){
							inputId[0] = html.byId("serachInput_" + this._widgetId).children[i].children[1].id;
						}else if (html.byId("serachInput_" + this._widgetId).children[i].children.length == 3){
							inputId[0] = html.byId("serachInput_" + this._widgetId).children[i].children[1].id;
						}else if(html.byId("serachInput_" + this._widgetId).children[i].children.length == 5){
							inputId[0] = html.byId("serachInput_" + this._widgetId).children[i].children[1].id;
							inputId[1] = html.byId("serachInput_" + this._widgetId).children[i].children[3].id;
						}
						
						var tempStyle = inputId[0].substring(inputId[0].indexOf("_") + 1, inputId[0].length);
						tempStyle = tempStyle.substring(0, tempStyle.indexOf("_"));
						if(tempStyle == "Time"&& this._isTwoTimeBox == false){
							this._timeControl.push(inputId[0]);
							on(html.byId("serachInput_" + this._widgetId).children[i], "click", lang.hitch(this, this._dateControl));
						} else if(tempStyle == "Time"&& this._isTwoTimeBox == true){
							for(j = 0;j < inputId.length;j++) {
								this._timeControl.push(inputId[j]);
							}
							on(html.byId("serachInput_" + this._widgetId).children[i], "click", lang.hitch(this, this._dateControl));
						} else if (tempStyle == "Select"){
							//alert("下拉列表选择搜索");
							on(html.byId(inputId[0]), "change", lang.hitch(this, function(e) {
									lang.hitch(this, this._search)();
							}));
						}
						else{
							on(html.byId(inputId[0]), "keyup", lang.hitch(this, function(e) {
								if (e.keyCode == 13) {
									var userAgent = navigator.userAgent;
									var inputid = null;
									if (userAgent.indexOf("Firefox") > -1) {
										inputid = e.target.id;// target是Firefox下的属性
									} else {
										inputid = e.srcElement.id;// ie下的属性
									}
									lang.hitch(this, this._search)();
								} else {
									lang.hitch(this, this._recordCondition)(e);
								}
							}));
						}
					}
				}
				
				on(html.byId("searchClick_" + this._widgetId), "click", lang.hitch(this, function() {
					lang.hitch(this, this._search)();
				}));
			}

			if (!this._curPageData || !this._curPageData["list"]) {
				return;
			}

			// 绑定操作事件
			if (this._operateList) {
				for ( var i = 0; i < this._curPageData["list"].length; i++) {
					for ( var w = 0; w < this._operateList.length; w++) {
						if (html.byId("opearte_" + i + "_" + w + "_" + this._widgetId) && this._operateList[w].func) {
							html.attr(html.byId("opearte_" + i + "_" + w + "_" + this._widgetId), "rowIndex", i);
							html.attr(html.byId("opearte_" + i + "_" + w + "_" + this._widgetId), "operateIndex", w);
							on(html.byId("opearte_" + i + "_" + w + "_" + this._widgetId), "click", lang.hitch(this, this._onOperateClick));
						}
					}
				}
			}			

			//绑定超链接事件
			if(this._linkOperate){
				for ( var i = 0; i < this._curPageData["list"].length; i++) {
					for ( var w = 0; w < this._linkOperate.length; w++) {
						if (html.byId("linkOpearte_" + i + "_" + w + "_" + this._widgetId) && this._linkOperate[w].func) {
							html.attr(html.byId("linkOpearte_" + i + "_" + w + "_" + this._widgetId), "rowIndex", i);
							html.attr(html.byId("linkOpearte_" + i + "_" + w + "_" + this._widgetId), "operateIndex", w);
							on(html.byId("linkOpearte_" + i + "_" + w + "_" + this._widgetId), "click", lang.hitch(this, this._onOperateClick));
						}
					}
				}
			}
			
			//绑定双击事件
			if(this._doubleClick){
				for ( var i = 0; i < this._curPageData["list"].length; i++) {
					html.attr(html.byId("MTGridText_" + i + "_" + this._widgetId), "rowIndex", i);
					on(html.byId("MTGridText_" + i + "_" + this._widgetId), "dblclick", lang.hitch(this, this._onDblClick));
				}
			}
			
			// 添加鼠标移动变色事件
			for ( var i = 0; i < this._curPageData["list"].length; i++) {
				this.own(on(html.byId("MTGridText_" + i + "_" + this._widgetId), "click", lang.hitch(this, this._responseClickEvent)), on(html.byId("MTGridText_" + i + "_" + this._widgetId), "mouseover", lang.hitch(this, this._responseMouseOverEvent)), on(html.byId("MTGridText_" + i + "_" + this._widgetId), "mouseout", lang.hitch(this, this._responseMouseOutEvent)));
			}
			
			// by zlz checkbox选中   复选框事件
			if(this._showCheckBox) {
				for(var i = 0; i < this._curPageData["list"].length; i++){
					//if (!html.byId("choosechecked_" + i + "_" + this._widgetId)) break; by zlz
					if(this._curPageData["list"][i]["notchange"]){ //不可更改  llw add
						continue;
					}
					
					if (html.byId("choosechecked_" + i + "_" + this._widgetId)) {
						on(html.byId("choosechecked_" + i + "_" + this._widgetId), "click", lang.hitch(this, function(e) {
							if(e == undefined){
								e = window.event;
							}
							lang.hitch(this, this._chooseChange)(e);
						}));
					}
				}
			}
		},

		_responseMouseOverEvent : function(evt) {
			this._colorTr = evt.currentTarget.style.backgroundColor;
			evt.currentTarget.style.backgroundColor = "#fee9be";
		},

		_responseMouseOutEvent : function(evt) {
			/*if(this._colorTr != "#fcfcfc"){
				this._colorTr = "#fcfcfc";
			}*/
			evt.currentTarget.style.backgroundColor = this._colorTr;
		},

		_responseClickEvent : function(evt) {
			evt.currentTarget.style.backgroundColor = "#fee9be";
		},

		// 排序
		_sortByField : function(e) {
			var sortTd = e.currentTarget;
			var filed = html.attr(sortTd, "field");
			var filedIndex = html.attr(sortTd, "filedIndex");

			if (sortTd.className == "sortAscTd") {
				query(".MTGridTitle td").removeClass("sortAscTd");
				query(".MTGridTitle td").removeClass("sortDescTd");
				sortTd.className = "sortDescTd";
				
				var imgPath = utils.getUrlForPackage("Widgets") + "/EditTable/images/down.png";
				var style = "url('" + imgPath + "')  no-repeat right 5px center";
				domStyle.set(sortTd, "background", style);
				
				this._tableSort = " " + filed + " desc ";
				lang.hitch(this, this._getTableData)();
			} else if (sortTd.className == "sortDescTd") {
				query(".MTGridTitle td").removeClass("sortAscTd");
				query(".MTGridTitle td").removeClass("sortDescTd");
				this._tableSort = " " + filed + " asc ";
				sortTd.className = "sortAscTd";
				
				var imgPath = utils.getUrlForPackage("Widgets") + "/EditTable/images/up.png";
				var style = "url('" + imgPath + "')  no-repeat right 5px center";
				domStyle.set(sortTd, "background", style);
				lang.hitch(this, this._getTableData)();
			} else{
				query(".MTGridTitle td").removeClass("sortAscTd");
				query(".MTGridTitle td").removeClass("sortDescTd");
				if (this._fieldDict[filedIndex]["sort"]) {
					this._tableSort = " " + filed + " asc ";
					sortTd.className = "sortDefaultTd";
					
					var imgPath = utils.getUrlForPackage("Widgets") + "/EditTable/images/up.png";
					var style = "url('" + imgPath + "')  no-repeat right 5px center";
					domStyle.set(sortTd, "background", style);
				} else {
					this._tableSort = "";
				}
				lang.hitch(this, this._getTableData)();
			};
			
		},
		
		//不传对应关系排序
		_sortByFieldNoRealtion : function(e){
			
		},

		// 更改每页显示的行数
		_onChangeEveryPage : function() {
			if (this.everyPageSel)
				this._everyPage = this.everyPageSel.value;
			this._currentPage = 1;
			lang.hitch(this, this._getTableData)();
		},

		// 跳转页码
		_pageJump : function(value) {
			if(this._curPageData["totalPage"]){
				if(value > this._curPageData["totalPage"]){
					value = this._curPageData["totalPage"];
				}
				if(value < 1){
					value = 1;
				}
			}
			this._currentPage = value;
			lang.hitch(this, this._getTableData)();
		},
		
		// 更改checkBox的勾选项
		_chooseChange : function(e) {
			if(e == undefined){
				e = window.event;
			}
			var rowIndex = html.attr(e.target, "rowIndex"); 
			
			if(html.byId("choosechecked_" + rowIndex + "_" + this._widgetId).checked){
				domStyle.set(html.byId("MTGridText_" + rowIndex + "_" + this._widgetId), "background-color", "#6699ff");
				this._colorTr = "#6699ff";
			} else{
				domStyle.set(html.byId("MTGridText_" + rowIndex + "_" + this._widgetId), "background-color", "#fcfcfc");
				this._colorTr = "#fcfcfc";
			}
			//复选框 事件
			if (this._keyField) {
				var keyValue = html.attr(e.target, "keyValue");
				if (e.target.checked) {
					var bAdd = true;
					for (var j=0; j<this._checkedKeyList.length; j++) {
						if (keyValue == this._checkedKeyList[j]) {
							bAdd = false;
							break;
						}
					}
					if (bAdd) {						
						this._checkedKeyList.push(keyValue);
					}
				} else {
					for (var j=0; j<this._checkedKeyList.length; j++) {
						if (keyValue == this._checkedKeyList[j]) {
							this._checkedKeyList.splice(j, 1);
							break;
						}
					}
				}
				var origCheck = html.attr(e.target, "checkStatus");
				if (e.target.checked && origCheck=='0') {
					this._checkedChangeList.push({"keyValue":keyValue, "checked" : e.target.checked});
				} else if (!e.target.checked && origCheck=='1') {
					this._checkedChangeList.push({"keyValue":keyValue, "checked" : e.target.checked});
				}else if ( (e.target.checked && origCheck=='1') || (!e.target.checked && origCheck=='0') ){
					for (var j=0; j<this._checkedChangeList.length; j++) {
						if (keyValue == this._checkedChangeList[j]['keyValue']) {
							this._checkedChangeList.splice(j, 1);
							break;
						}
					}
				}
			}
			
			if(this._topic !=null){
				var data ={"dataInfo": this._curPageData.list[rowIndex],"checked": e.target.checked};				
				//回传事件引用
			    this._topic.publish("submitConfirmMessage", data);
			}
		},
		
		getKeyField : function() {
			if(this._fieldDict){
				for(var j = 0; j < this._fieldDict.length; j++){
					if(this._fieldDict[j]["key"]) {
						return this._fieldDict[j]["name"];						
					}
				}
			}
			return null;
		},
		
		//获取前台勾选变化的复选框数据列表
		getCheckedList : function() {
			var str = "";
			for (var i=0; i<this._checkedChangeList.length; i++) {
				if(str != "") str += ",";
				str+=this._checkedChangeList[i]["keyValue"] + "*" + this._checkedChangeList[i]["checked"];
			}
			return str;
		},
		
		//获取勾选的
		getSelectedList : function(){
			// checkbox选中
			this._checkList = [];
			for(var i = 0; i < this._curPageData["list"].length; i++){
				if(html.byId("choosechecked_" + i + "_" + this._widgetId)){
					if(html.byId("choosechecked_" + i + "_" + this._widgetId).checked){
						var checkAttr = this._curPageData.list[i];
						if(this._fieldDict){
							for(var j = 0; j < this._fieldDict.length; j++){
								var edit = 0;
								if(this._fieldDict[j]["edit"])
									edit = this._fieldDict[j]["edit"] == null ? 0 : this._fieldDict[j]["edit"];
								if(edit != 0){
									var fieldName = this._fieldDict[j]["name"];
									var tempValue = "";
									if(this._fieldDict[j]["list"]){
										tempValue = html.byId(fieldName + "_ContenSelect_" + i + "_value_" + this._widgetId).value;
									}else{
										tempValue = html.byId(fieldName + i + "_value_" + this._widgetId).value;
									}

									if(checkAttr[fieldName] != null){
										checkAttr[fieldName] = tempValue;
									}
								}
							}
						}
						this._checkList.push(checkAttr);
					}
				}
			}
			return this._checkList;
		},
		
		//获取所有的数据
		getAllList : function(){
			this._allList = [];
			for(var i = 0; i < this._curPageData["list"].length; i++){
				if(html.byId("choosechecked_" + i + "_" + this._widgetId)){
					//if(true){
						var checkAttr = this._curPageData.list[i];
						if(this._fieldDict){
							if(html.byId("choosechecked_" + i + "_" + this._widgetId).checked){
								checkAttr["isCheck"] = "1";
							} else {
								checkAttr["isCheck"] = "0";
							}
							for(var j = 0; j < this._fieldDict.length; j++){
								var edit = 0;
								if(this._fieldDict[j]["edit"])
									edit = this._fieldDict[j]["edit"] == null ? 0 : this._fieldDict[j]["edit"];
								if(edit != 0){
									var fieldName = this._fieldDict[j]["name"];
									var tempValue = "";
									if(this._fieldDict[j]["list"]){
										tempValue = html.byId(fieldName + "_ContenSelect_" + i + "_value_" + this._widgetId).value;
									}else{
										tempValue = html.byId(fieldName + i + "_value_" + this._widgetId).value;
									}
									
									if(checkAttr[fieldName] != null){
										checkAttr[fieldName] = tempValue;
									}
								}
							}
						}
						this._allList.push(checkAttr);
					//}
				}
			}
			return this._allList;
		},
		
		// 存储查询搜索条件
		_onChangeSearchCondition : function(fieldName) {
			for ( var i = 0; i < this._serachCondition.length; i++) {
				if (fieldName == this._serachCondition[i]["name"]) {
					if (html.byId(fieldName + "_Select_" + this._widgetId).value == "等于") {
						this._serachCondition[i]["condition"] = "=";
					} else if (html.byId(fieldName + "_Select_" + this._widgetId).value == "大于") {
						this._serachCondition[i]["condition"] = ">";
					} else {
						this._serachCondition[i]["condition"] = "<";
					}
				}
			}
		},

		_onChangeSearchConditionStatus : function(fieldName){
			
			for ( var i = 0; i < this._serachCondition.length; i++) {
				if (fieldName == this._serachCondition[i]["name"]) {
					this._serachCondition.splice(i, 1);
				}
			}
			var conditionSelect = html.byId(fieldName + "_ConditionSelect_" + this._widgetId);	
			if(conditionSelect.value == "" || !conditionSelect)
				return;
			var tempCondition = {
					name : fieldName,
					value : conditionSelect.value
				};

			this._serachCondition.push(tempCondition);
		},
		
		_onChangeSelectCondition : function(fieldName){// by  zlz
			
			for ( var i = 0; i < this._serachCondition.length; i++) {
				if (fieldName == this._serachCondition[i]["name"]) {
					this._serachCondition.splice(i, 1);
				}
			}
			var conditionSelect = html.byId(fieldName + "_Select_" + this._widgetId);	
			if(conditionSelect.value == "" || !conditionSelect)
				return;
			var tempCondition = {
					name : fieldName,
					condition : "=",
					type : "select",
					value : conditionSelect.options[conditionSelect.selectedIndex].value
			};
			
			this._serachCondition.push(tempCondition);
		},
		
		//高亮显示记录
		highLightContent : function(result,color){
			var index = "";
			var condition = true;
			for(var i = 0; i < this._curPageData["list"].length; i++){
				for(var key in result){
					if(result[key] != this._curPageData["list"][i][key]){
						condition = false;
					}
				}
				if(condition){
					index = i;
				}
			}
			if(index !== ""){
				this._colorTr = color;
				html.byId("MTGridText_" + index + "_" + this._widgetId).style.backgroundColor = this._colorTr;
			}
		},
		
		refreshRecord : function(){
			lang.hitch(this, this._getTableData)();
		},
		
		//对表格删除数据后返回属性值
		_afterChangedAttr : function(type,count){
			if(type == "delete"){
				if(this._curPageData["hasNextPage"]){
//					var tempCount = this._curPageData["totalCount"] - count - (this._curPageData["currentPageIndex"] - 1) * this._curPageData["everyPage"];
//					if(tempCount <= this._curPageData["everyPage"])
//						this._curPageData["hasNextPage"] = false;
					if(this._curPageData["totalPage"] > this._curPageData["currentPage"])
						this._curPageData["totalPage"] = this._curPageData["totalPage"] - 1;
					this._curPageData["totalCount"] = this._curPageData["totalCount"] - count;
				}else{
					this._curPageData["totalCount"] = this._curPageData["totalCount"] - count;
				}
			}else if(type == "add"){
				var tempCount = this._curPageData.totalCount - (this._curPageData.currentPageIndex - 1) * this._curPageData.everyPage;
				var tempPageLefted = tempCount % this._curPageData.everyPage == 0 ? this._curPageData.everyPage : tempCount % this._curPageData.everyPage;
				if(tempPageLefted + count > this._curPageData.everyPage){
					this._curPageData.hasNextPage = true;//显示下一页与末页
					this._curPageData.totalPage = this._curPageData.totalPage + count;
				}
				this._curPageData.totalCount = this._curPageData.totalCount + count;//总记录数加一	
			}
		},
		
		//删除记录
		deleteRecord : function(result){
			var count = 0;
			if(this._curPageData == undefined){
				return;
			}
			for(var i = 0; i < this._curPageData["list"].length; i++){
				var condition = true;
				for(var key in result){
					if(result[key] != this._curPageData["list"][i][key]){
						condition = false;
					}
				}
				if(condition){
					this._curPageData["list"].splice(i,1);
					count++;
				}
			}
			if(this._curPageData["list"].length <= 0){
				if(this._curPageData["currentPageIndex"] > 1){
					this._currentPage = this._curPageData["currentPageIndex"] - 1;
				}else{
					this.recordCount.innerHTML = 0;
				}
				
				this._checkList = [];
				lang.hitch(this, this._getTableData)();
			}else{
				lang.hitch(this, this._afterChangedAttr)("delete",count);
				this._checkList = [];
				lang.hitch(this, this._createCurrentPage)(this._curPageData);
			}
		},
		
		//删除一条记录
		deleteTrContent : function(index){ 
			//{index:1,incomeid:123}
			var tempId = "MTGridText_" + index + "_"+ this._widgetId;
			var tempTr = html.byId(tempId);
			if(tempTr)
				tempTr.parentNode.removeChild(tempTr);
			if(this._curPageData["hasNextPage"]){
				var tempCount = this._curPageData["totalCount"] - 1 - (this._curPageData["currentPageIndex"] - 1)* this._curPageData["everyPage"];
				if(tempCount <= 0){
					this.pageNext.style.display = "none";
					this._curPageData["totalPage"] = this._curPageData["totalPage"] - 1;
					this._curPageData["hasNextPage"] = false;
					this.pageTotal.innerHTML = this._curPageData["totalPage"];
				}
			}else if(this._curPageData["hasPrePage"]){
				var tempCount = this._curPageData["totalCount"] - 1 - (this._curPageData["currentPageIndex"] - 1) * this._curPageData["everyPage"];
				if(tempCount <= 0){
					this._curPageData["totalPage"] = this._curPageData["totalPage"] - 1;
					this.pageTotal.innerHTML = this._curPageData["totalPage"];
					if(this._curPageData["currentPageIndex"] > 1){
						this._currentPage = this._curPageData["currentPageIndex"] - 1;
						lang.hitch(this, this._getTableData)();
						return;
					}
				}
			}
			this._curPageData["totalCount"] = this._curPageData["totalCount"] - 1;
  			this.recordCount.innerHTML = this._curPageData["totalCount"];
		},
		
		//增加并把此条数据添加至最顶端,删除原纪录中的最后一条
		addTrContent : function(data){
			var newData = {};
			for(var attr in data){
				newData[attr] = data[attr];
			}
			//data为一条记录
			if(this._curPageData){
				if(this._curPageData["list"].length >= this._everyPage){
					this._curPageData["list"].splice(this._curPageData["list"].length - 1, 1);
					if(!this._curPageData["hasNextPage"])
						this._curPageData["hasNextPage"] = true;
				}
				this._curPageData["list"].splice(0, 0, newData);
				lang.hitch(this, this._afterChangedAttr)("add",1);
				this._checkList = [];
				lang.hitch(this, this._createCurrentPage)(this._curPageData);
			}else{
				var pageData = {};
				pageData["beginIndex"] = 0;
				pageData["currentPage"] = 1;
				pageData["currentPageIndex"] = 1;
				pageData["everyPage"] = 10;
				pageData["hasNextPage"] = false;
				pageData["hasPrePage"] = false;
				pageData["jsonlist"] = null;
				pageData["list"] = [];
				pageData["list"].push(newData);
				pageData["restlist"] = null;
				pageData["totalCount"] = 1;
				pageData["totalPage"] = 1;
				this._checkList = [];
				lang.hitch(this, this._createCurrentPage)(pageData);
			}
		},
		
		_recordCondition : function(e) {
			var name = e.target.id;
			var fieldName = name.substring(0, name.indexOf("_Search_" + this._widgetId));
			var type = html.getAttr(e.target.id, "fieldType");
			for ( var i = 0; i < this._serachCondition.length; i++) {
				if (fieldName == this._serachCondition[i]["name"]) {
					this._serachCondition.splice(i, 1);
				}
			}
			var tempCondition;
			if (html.byId(fieldName + "_Select_" + this._widgetId)) {
				if (html.byId(fieldName + "_Select_" + this._widgetId).value == "等于") {
					tempCondition = {
						name : fieldName,
						condition : "=",
						value : e.target.value,
						type : type
					};
				} else if (html.byId(fieldName + "_Select_" + this._widgetId).value == "大于") {
					tempCondition = {
						name : fieldName,
						condition : ">",
						value : e.target.value,
						type : type
					};
				} else {
					tempCondition = {
						name : fieldName,
						condition : "<",
						value : e.target.value,
						type : type
					};
				}
			} else {
				tempCondition = {
					name : fieldName,
					value : e.target.value,
					type : type
				};
			}

			if (e.target.value != "")
				this._serachCondition.push(tempCondition);
		},

		_timeCondition : function(){



			for(var i = 0; i < this._timeControl.length; i++){
				var tempId = this._timeControl[i];
				var tempValue = html.byId(tempId).value;
				for ( var j = 0; j < this._serachCondition.length; j++) {
					var fieldName = tempId.substring(0, tempId.indexOf("_"));
					if (fieldName == this._serachCondition[j]["name"]) {
						this._serachCondition.splice(j, 1);
					}
				}

                if(this._timeControl.length > 0){
                	var tempFieldName = this._timeControl[0];
                	tempFieldName = tempFieldName.substring(0, tempId.indexOf("_"));
                	if(html.byId(tempFieldName + "_TimeSelectType_" + this._widgetId)){
					   var checkType = html.byId(tempFieldName + "_TimeSelectType_" + this._widgetId).value;
				     }
                }

				
				
				if(tempValue != ""){
					var tempCondition;
					var fieldName = tempId.substring(0, tempId.indexOf("_"));
					if (html.byId(fieldName + "_TimeSelect_" + this._widgetId)) {
						if (html.byId(fieldName + "_TimeSelect_" + this._widgetId).value == "等于") {
							tempCondition = {
								name : fieldName,
								condition : "=",
								type : "time",
								value : tempValue
							};
						} else if (html.byId(fieldName + "_TimeSelect_" + this._widgetId).value == "大于") {
							tempCondition = {
								name : fieldName,
								condition : ">",
								type : "time",
								value : tempValue
							};
						} else {
							tempCondition = {
								name : fieldName,
								condition : "<",
								type : "time",
								value : tempValue
							};
						}
					}else if (html.byId(fieldName + "_TimeSelect1_" + this._widgetId)) {
						if (html.byId(fieldName + "_TimeSelect1_" + this._widgetId).value == "等于") {
							tempCondition = {
								name : fieldName,
								condition : "=",
								type : "time",
								value : tempValue
							};
						} else if (html.byId(fieldName + "_TimeSelect1_" + this._widgetId).value == "大于") {
							tempCondition = {
								name : fieldName,
								condition : ">",
								type : "time",
								value : tempValue
							};
						} else {
							tempCondition = {
								name : fieldName,
								condition : "<",
								type : "time",
								value : tempValue
							};
						}
					}else {
						tempCondition = {
							name : fieldName,
							type : "time",
							value : tempValue
						};
					}
					if(checkType!= ""&& checkType != null){
					    tempCondition["checktype"] = checkType;
					}else{
						tempCondition["checktype"] = "";
					}
					this._serachCondition.push(tempCondition);
				}
			}
		},
		
		_search : function(inputId) {
			lang.hitch(this, this._timeCondition)();
			
			if (this._serachCondition == null || this._serachCondition.length <= 0) {
				this._screenConditions = "";
				this._currentPage = 1;
				lang.hitch(this, this._getTableData)();
			} else {
				var tempCondition = "";
				for ( var i = 0; i < this._serachCondition.length; i++) {
					var fieldName = this._serachCondition[i]["name"];
					var fieldValue = this._serachCondition[i]["value"];
					var type = this._serachCondition[i]["type"] ? this._serachCondition[i]["type"] : "";
					if (this._serachCondition[i]["condition"]) {
						if(type == "time"||type == "timeAndTime"){
							var checktype = this._serachCondition[i]["checktype"];
							var tempcondition = this._serachCondition[i]["condition"];
							var tempTime = "to_date('" + fieldValue + "', 'yyyy-mm-dd')";// hh24:mi:ss
							tempCondition += fieldName + " " + tempcondition + " " + tempTime + " " + checktype + " ";
						} else if (type == "select"){
							tempCondition += fieldName + " = '" + fieldValue + "' ";
						}
						else{
							var tempcondition = this._serachCondition[i]["condition"];
							tempCondition += fieldName + " " + tempcondition + " " + fieldValue + " ";
						}
					} else if(type == "number"){
						tempCondition += fieldName + " = '" + fieldValue + "' ";	
					} else {
						tempCondition += fieldName + " " + "like '%" + fieldValue + "%' ";
					}
					if (i != this._serachCondition.length - 1) {
						tempCondition += " and ";
					}
				}
				this._screenConditions = tempCondition;
				this._currentPage = 1;
				lang.hitch(this, this._getTableData)();
			}
		},
		
		_dateControl : function(){
			WdatePicker();
		}
		
		
		
		
	});

	Widget.css = "Widgets/EditTable/css/style.css";
	
	return Widget;
});