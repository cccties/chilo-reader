require([
"jquery",
"StorageManager",
"readium_js_viewer/workers/EpubLibraryWriter",
"readium_js_viewer/workers/WorkerProxy",
"readium_js_viewer/workers/ContentTransformer",
'readium_js_viewer/PackageParser',
'readium_js/epub-fetch/encryption_handler',
'readium_shared_js/globals',
'Settings',
'readium_shared_js/helpers',
'mobile-detect',
'readium_js_viewer/EpubReader'
],function(
$,
StorageManager,
writer,
WorkerProxy,
ContentTransformer,
PackageParser,
EncryptionHandler,
Globals,
Settings,
Helpers,
MobileDetect,
EpubReader
){
    console.log("CCC-TIES: chilo_reader_body");

    //
    // don't hide navbar
    //
    if(window['cordova']){
	$('.navbar').css('opacity',100);
    }

    //
    // generate mouseleave event
    //
/*
    $.event.special.mouseleave = {
	setup: function(){
	    console.log("setup mouseleave called");
	    console.log($(this));
	    return false;
	},
	teardown: function(){
	    console.log("teardown mouseleave called");
	    console.log($(this));
	    return false;
	},
	add: function(handleObj){
	    console.log("add mouseleave called");
	    var oh = handleObj.handler;

	    $(this).bind("touchend", function(event){
		console.log("touchend mouseleave called");
		setTimeout(function(){
		    oh.apply(this, arguments);
		},1000);
		return true;
	    });
	}
    }
*/

    //
    // hook StorageManager
    //
    if(window['cordova'] == undefined){
	console.log("hook StorageManager");

	StorageManager.saveFile = function(path, blob, success, error){
	    console.log("hooked StorageManager.saveFile called: " + path);
	    success();
	}

	StorageManager.deleteFile = function(path, success, error){
	    console.log("hooked StorageManager.deleteFile called: " + path);
	    success();
	}

	StorageManager.getPathUrl = function(path){
	    console.log("hooked StorageManager.getPathUrl called: " + path);
	    return path;
	}

	StorageManager.initStorage = function(success, error){
	    console.log("hooked StorageManager.initStorage called");
	    success();
	}
    }

    //
    // hook EpubLibraryWriter
    //
    writer._findPackagePath = function(containerStr, callback){
        console.log("writer _findPackagePath");
        var containerDom = (new DOMParser()).parseFromString(containerStr, "text/xml");
        var $rootfile = $('rootfile', containerDom);
        if (!$rootfile.length){
            error(Messages.ERROR_EPUB);
            console.error('Epub container.xml missing rootfile element');
        } else {
            callback($rootfile.attr('full-path'));
        }
    }

    writer._parsePackageData = function(packageStr, encryptionStr, callback){
        console.log("writer _parsePackageData");
        var packageDom = (new DOMParser()).parseFromString(packageStr, "text/xml");
        var errors = $(packageDom).find('parsererror');
        if (errors.length) {
            error(Messages.ERROR_PACKAGE_PARSE, $(errors).find('div').text());
            console.error('There was an xml parsing error when trying to parse the package dom');
        } else {
            var packageObj = PackageParser.parsePackageDom(packageDom);
            var encryptionData;
            if(encryptionStr) {
                var encryptionDom = (new DOMParser()).parseFromString(encryptionStr, "text/xml");
                encryptionData = EncryptionHandler.CreateEncryptionData(packageObj.id, encryptionDom);
            }
            callback(packageObj, encryptionData);
	}
    }

    //
    // hook WorkerProxy
    //
    WorkerProxy.importZip = function(blob, libraryItems, callbacks){
        console.log("CCC-TIES: importZip called");
	console.log(blob, libraryItems, callbacks);

        writer.libraryData = libraryItems;
        var buf = blob;
        var cb = callbacks;

	var error = function(errorMsg, errorData){
		console.log("xxx: error");
		if(cb.error){
		    cb.error(errorMsg || "Unknown error");
		}
	};

        StorageManager.initStorage(function(){
        writer.importZip(buf, {
	    success: function(item){
		console.log("xxx: success");
		if(cb.success){
		    cb.success(writer.libraryData);
		}
	    },
	    progress: function(percent, type, data){
		console.log("xxx: progress");
		if(cb.progress){
		    cb.progress(percent, type, data);
		}
	    },
	    error: error,
	    overwrite: function(item, kontinue, sidebyside){
		console.log("xxx: overwrite");
		cb.overwrite(item,
			     function(){
				 console.log("xxx: kontinue");
				 kontinue();
			     },
			     function(){
				 console.log("xxx: sidebyside");
				 sidebyside();
			     },
			     function(){}
			    );
	    },
	    continueImport: function(){
		console.log("xxx: continueImport");
	    }
	});
        }, error);
    };

    WorkerProxy.deleteEpub = function(id, libraryItems, callbacks){
        console.log("CCC-TIES: deleteEpub called");
        console.log(id, libraryItems, callbacks);

        writer.libraryData = libraryItems;
	var id = id;
        var cb = callbacks;

	var success = function(item){
	    console.log("xxx: success");
	    if(cb.success){
		cb.success(writer.libraryData);
	    }
	};
	var error = function(errorMsg, errorData){
		console.log("xxx: error");
		if(cb.error){
		    cb.error(errorMsg || "Unknown error");
		}
	};

        StorageManager.initStorage(function(){
            writer.deleteEpubWithId(id, success, error);
	}, error);
    };

    //
    // hook ContentTransformer
    //
    ContentTransformer.prototype._transformXhtml = function(contentDocumentHtml){
	return contentDocumentHtml;
    }

    //
    // use readium SDK
    //
    ReadiumSDK.on(ReadiumSDK.Events.READER_INITIALIZED, function (reader) {
        Globals.logEvent("READER_INITIALIZED", "ON", "chilo_index.js");

	console.log(reader);

	reader.on(ReadiumSDK.Events.CONTENT_DOCUMENT_LOADED, function ($iframe, spineItem){

            Globals.logEvent("CONTENT_DOCUMENT_LOADED", "ON", "chilo_reader_body.js [ " + spineItem.href + " ]");

	    /* NPO CCC-TIES 2016.03.29 add
	     * 現在表示中のTOCにあるリンクの色を変更
	     */
	    chilo.TOCSelectedid = spineItem.idref;

	    try{
		/* 表示していたページのclass削除 */
		$("a").removeClass("toc-selected");

		/* 表示するページのclass追加 */
		document.getElementById(chilo.TOCSelectedid).classList.add('toc-selected');
	    } catch(e){
		console.log(e);
	    }
	});
    });

//
// MobileDetect の初期化
//
var md = new MobileDetect(window.navigator.userAgent);

/* 画面幅見て初期状態で目次を出すか判定
 * スクロールバーの幅を考慮して1024より小さく指定
 */
var w = document.documentElement.clientWidth;
if(w >= 1000) {
    document.getElementById('app-container').classList.add('toc-visible');
}    

/* NPO CCC-TIES 2016.03.17 add
 * 現在開いているページのURLを表示
 */
/* NPO CCC-TIES 2016.03.30 update
 * プロンプト表示からモーダルウィンドウ表示に変更
 * 現在開いているブックのURLも表示
 */
var CHiLOBookURLText = "いま見てるCHiLO BookのURL / URL of the CHiLO Book you are now reading";
var CHiLOBookPageURLText = "いま見てるページのURL / URL of the current page";
chilo.GetPageUrl = function(){
 try{
/* NPO CCC-TIES 2016.03.31 update
 * 現在開いているページのURLを表示するボタンに関して、TOCSelectedidでIDを取得できるので、LocalStorageからは取得処理を停止
 */
/*
  var ChiloBookPageJson = JSON.parse(localStorage.getItem(ChiloBookFileName));
  ChiloBookPage = ChiloBookPageJson.split("\"")[3];
  ChiloBookPageUrl = ChiloBookUrl + "#" + ChiloBookPage;
*/
  ChiloBookPageUrl = chilo.ChiloBookUrl + "#" + chilo.TOCSelectedid;

/* NPO CCC-TIES 2016.03.31 update
 * フォーム形式の場合はhrefの置き換えは不要 
 *
 * NPO CCC-TIES 2016.06.17 update
 * URL情報をフォーム内の表示から普通のテキスト表示に変更
 */
/*
  document.getElementById("chilo-book-url").href=ChiloBookUrl;
  document.getElementById("chilo-book-page-url").href=ChiloBookPageUrl;

  document.getElementById("chilo-book-url").value=ChiloBookUrl;
  document.getElementById("chilo-book-page-url").value=ChiloBookPageUrl;
  
  // 開いたとき、いま見てるページのURLにフォーカスをあてる
  $('#myModal').on('shown.bs.modal', function () {
    $('#chilo-book-page-url').focus();
  })
  $('#myModal').on('shown.bs.modal', function () {
    $('#chilo-book-page-url').select();
  })
*/

  document.getElementById("chilo-book-url").innerHTML=chilo.ChiloBookUrl;
  document.getElementById("chilo-book-page-url").innerHTML=ChiloBookPageUrl;

/* NPO CCC-TIES 2016.06.17 add
 * QRコードの描画処理追加
 */
  $('#qrcode1').html("");
  $("#qrcode1").MyQRCode({
     content:chilo.ChiloBookUrl,
     size:"200x200"
  });
  $('#qrcode2').html("");
  $("#qrcode2").MyQRCode({
     content:ChiloBookPageUrl,
     size:"200x200"
  });

/* NPO CCC-TIES 2016.06.20 add
 * PCで見たときlineアイコンとメールアイコンは表示させない
 */
  if (!md.mobile()) {
     document.getElementById("share_line").style.display="none";
     document.getElementById("share_mail").style.display="none";
  }

 }catch(e){
 }
}

/* NPO CCC-TIES 2016.04.14 add
 * マイバッジページに移動
 */
chilo.BadgePage = function(){
 window.open("http://dev.chilos.jp/badges/mybadges.php");
}

/* NPO CCC-TIES 2016.03.17 add
 * 現在開いている本のePub版をダウンロード
 */
chilo.GetePub = function(){
 var ChiloBookEpubDLOK=confirm('Donwload eBook version?');
 if (ChiloBookEpubDLOK) window.open(chilo.ChiloBookEpubFileUrl);
}

/* NPO CCC-TIES 2016.06.17 add
 * 操作方法をする処理を実行
 */
chilo.GetSousa = function(){
 parent.postMessage("sousasetumei","*");
}

/* NPO CCC-TIES 2016.02.04 add
 * content.opfのidrefの値を指定してページを表示
 * reader.html が設定した変数 urlParams を使用
 */
if(chilo.ChiloOnlinePage){
    var ebookURL = urlParams['epub'];
    var ebookURL_filepath = Helpers.getEbookUrlFilePath(ebookURL);

    Settings.put(ebookURL_filepath,JSON.stringify({
	"idref":      chilo.ChiloOnlinePage,
	"contentCFI": "/4/2@0:0"
    }));

    chilo.ChiloOnlinePage = false;
}

/* NPO CCC-TIES 2016.06.17 add
 * QRコードの表示処理追加
 */
/**
 * @author Paul Chan / KF Software House 
 * http://www.kfsoft.info
 *
 * Version 0.5
 * Copyright (c) 2010 KF Software House
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/mit-license.php
 *
 */
	
    var _options = null;

	jQuery.fn.MyQRCode = function(options) {
		_options = $.extend({}, $.fn.MyQRCode.defaults, options);
		
		return this.each(function()
		{
			var codebase = "https://chart.googleapis.com/chart?chs={size}&cht=qr&chl={content}&choe={encoding}";
			var mycode = codebase.replace(/{size}/g, _options.size);
			mycode = mycode.replace(/{content}/g, escape(_options.content));
			mycode = mycode.replace(/{encoding}/g, _options.encoding);
			//$("#genQrCode").remove();
			$(this).append("<img src='"+mycode+"'>");
		});
	}
	
	//default values
	jQuery.fn.MyQRCode.defaults = {
		encoding:"UTF-8",
		content: window.location,
		size:"150x150"
	};
});
