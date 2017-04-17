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
'readium_js_viewer/EpubReader',
'jath'
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
EpubReader,
Jath
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

    VideoAutoPlay.initialized(reader);

	reader.on(ReadiumSDK.Events.CONTENT_DOCUMENT_LOAD_START, function ($iframe, spineItem){
        console.log("CONTENT_DOCUMENT_LOAD_START");
	    VideoAutoPlay.load_start(reader, $iframe, spineItem);
        });

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

	    VideoAutoPlay.loaded(reader, $iframe, spineItem);
	});

	reader.on(ReadiumSDK.Events.CONTENT_DOCUMENT_UNLOADED, function ($iframe, spineItem){
		$('.icon-chilo-autoplay').css('display', 'none');
		console.log("CONTENT_DOCUMENT_UNLOADED");
        });

	reader.on(ReadiumSDK.Events.PAGINATION_CHANGED, function (pageChangeData){
		console.log("PAGINATION_CHANGED");
		VideoAutoPlay.pageChanged(pageChangeData);
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

//
// automatic page feed with video
//
var VideoAutoPlay = new function() {
    var _reader = null;
    var _iframe;
    var _fetcher;
    var _spineItem;

    var list = null;

    var $button;
    var $popup;

    Jath.resolver = function(prefix) {
        return "http://www.w3.org/ns/SMIL";
    };

    var template = [
        "//def:par",
        {
            id:        "@id",
            text:      "def:text/@src",
            video:     "def:video/@src",
            clipBegin: "def:video/@clipBegin",
            clipEnd:   "def:video/@clipEnd"
        }
    ];

    function debug(obj){
        if(typeof obj === 'string'){
            console.log("=== " + obj);
        } else {
//            console.log(obj);
        }
    }

    function read_smil(){
	_fetcher.getXmlFileDom(
            "/OEBPS/chilo-video.smil",
            function(xml){
                list = Jath.parse(template, xml);
                debug("read_smil success");
		debug(list);
		for(var i = 0;i < list.length;i++){
		    var t = list[i];
		    t.clipBegin = parseFloat(t.clipBegin);
		    if(t.clipEnd == null || t.clipEnd === ""){
			t.clipEnd = 0.0;
		    } else {
			t.clipEnd = parseFloat(t.clipEnd);
		    }
		}
            },
            function(){
                debug("read_smil error");
            }
	);
    }

    this.initialized = function(reader){
        // on/off button
        chilo.videoautoplay = videoautoplay;
        $button = $(document.getElementById("videoautoplaybutton"));
        $popup = $button.find('div');
		update_button();

	// embedded youtube
        chilo.youtube = {
            onAPIReady:    onAPIReady,
            onPlayerReady: onPlayerReady,
            onStateChange: onStateChange
        };
    }

    this.load_start = function(reader, $iframe, spineItem){
        if(_reader != reader){
            _reader = reader;
            _fetcher = window.READIUM.getCurrentPublicationFetcher();
            read_smil();
        }

        v_load_start();
        yt_load_start();
    }

    this.loaded = function(reader, $iframe, spineItem){
        _iframe = $iframe;
        _spineItem = spineItem;

        v_loaded();
        yt_loaded();
    }

    this.pageChanged = function(pageChangeData){
	debug(pageChangeData);

        v_pageChanged();
        yt_pageChanged();
    }

    //
    // common routines
    //
    var do_autoplay = localStorage.ChiloVideoAutoplay;

    var last_seek = -1;
    var start_time;
    var cur_video;
    var do_fadeout = false
    var chkid;

    function handle_seek(do_seek){
		debug("handle_seek called " + _spineItem.idref + " " + last_seek);

		if(list != null){
            $('.icon-chilo-autoplay').css('display', 'block');
                chkid = 1;
	            for(var i = 0;i < list.length;i++){
	                var t = list[i];
	                if(t.id === _spineItem.idref){
	                    debug("handle_seek start_time " + t.clipBegin);
	                    start_time = t.clipBegin;
			            cur_video = t.video;
			            chkid = 0;
	                }
	            }
		}

        if(last_seek > 0){
	    debug("handle_seek set last_seek");
            do_seek(last_seek);
            last_seek = -1;
            return;
        }

        if(start_time > 0){
	    debug("handle_seek set start_time");
            do_seek(start_time);
        }
    }

    function handle_autoplay(){
        debug("handle autoplay");

        v_autoplay();
        yt_autoplay();
    }

    function find_page(ct){
        if(list == null || cur_video == null){
            return null;
        }

		for(var i = 0;i < list.length;i++){
		    var t = list[i];
		    if(t.video == cur_video && t.clipBegin <= ct && (t.clipEnd == 0 || ct < t.clipEnd)){
	                return t.id;
	        }
        }
        return null;
    }

    function handle_jump(ct, lower_volume, pause_video, end_video, do_jump){
        var id;

        //
        // check fadeout
        //
        if(do_autoplay > 0){
            id = find_page(ct + 2);

            if(!do_fadeout){
                if(id != null && _spineItem.idref != id){
                    do_fadeout = true;
                    if(_iframe != null){
                        debug("do _iframe.fadeOut");
                        _iframe.fadeOut(2000);
                    }
                    debug("lower_volume");
                    lower_volume();
                }
            } else if(_spineItem.idref == id){
                do_fadeout = false;
            } else {
                debug("lower_volume");
                lower_volume();
            }
        } else {
            if(_iframe != null){
                _iframe.finish();
                _iframe.fadeIn();
            }
        }

        //
        // check page jump
        //
        id = find_page(ct);
        if(_spineItem.idref != id){
            pause_video();
            if(id != null && do_jump > 0){
				debug("jump from " + _spineItem.idref + " to " + id);
				end_video();
				last_seek = ct;
				_reader.openSpineItemPage(id, 0);
            }
        }
    }

    //
    // video element
    //
    var $video;
    var videoDom = null;

    var before_play;
    var page_loaded;
    var page_changed;

    var do_fullscreen = false;
    var is_fullscreen = false;
    var is_seeked = false;

    function v_load_start(){
	page_loaded = false;
        page_changed = false;
        start_time = -1;
    }

    function v_loaded(){
        // find video element
        $video = _reader.getElements(_spineItem.idref, "#chilo-video");

        debug("_reader.getElement(video)");
        debug($video);

        if($video.length == 0){
            videoDom = null;
            return;
        }
		videoDom = $video[0];
		videoDom.load();

        before_play = true;

        videoDom.addEventListener("seeked", function(){
            debug("seeked called: " + videoDom.currentTime);
	    if(!is_fullscreen){
                v_timeupdate(true);
            } else {
                is_seeked = true;
            }
        });

        videoDom.addEventListener("pause", function(){
            debug("pause called: " + videoDom.currentTime);
        });

        videoDom.addEventListener("play", function(){
            debug("play called: " + videoDom.currentTime);
	    before_play = false;
        });

        videoDom.addEventListener("timeupdate", function(){
            debug("timeupdate called: " + videoDom.currentTime);
	    if(!before_play && !is_fullscreen){
		v_timeupdate(false);
            }
        });

        videoDom.addEventListener("stalled", function(){
            debug("stalled called: " + videoDom.currentTime);
            var ct = videoDom.currentTime;
	    if(ct > 0){
                videoDom.load();
                videoDom.currentTime = ct;
                v_autoplay();
            }
        });

        videoDom.addEventListener("volumechange", function(){
            debug("volumechange called: " + videoDom.currentTime + " " + videoDom.volume);
        });

        videoDom.addEventListener("webkitbeginfullscreen", function(e){
            debug("begin fullscreen");
            do_fullscreen = true;
            is_fullscreen = true;
            is_seeked = false;
        },false);

        videoDom.addEventListener("webkitendfullscreen", function(e){
            debug("end fullscreen");
            do_fullscreen = true;
            is_fullscreen = false;
	    if(is_seeked){
                v_timeupdate(true);
            }
        },false);

        v_restore_volume();

        handle_seek(function (t){
            videoDom.currentTime = t;
        });

	if(page_changed){
            v_autoplay();
        }

	page_loaded = true;
    }

    function v_pageChanged(){
	if(page_loaded && !do_fullscreen){
            v_autoplay();
        }
        page_changed = true;
        do_fullscreen = false;
    }

    function v_autoplay(){
	if(videoDom != null){
	    var v = _reader.isElementVisible($video);

            if(do_autoplay > 0 && v > 0){
                videoDom.play();
            } else {
                //videoDom.pause(); //自動再生もON/OFFと同調させる場合はこちらを有効にする
                videoDom.play();
            }
        }
    }

    function v_timeupdate(far_call){
		if(list == null || chkid > 0){
		    return;
		}

        if(!do_fadeout){
            v_save_volume();
        }

	var ct = videoDom.currentTime;

	if(!far_call && start_time > 0 && ct < start_time){
	    return;
	}

	handle_jump(ct,
            function(){
                var vl = videoDom.volume;
                vl = Math.floor((vl-0.1)*10)/10;
                if(vl > 0){
                    videoDom.volume = vl;
                }
            },
            function(){
                videoDom.pause();
            },
            function(){},
            far_call || do_autoplay);
    }

    var v_volume;
    var v_muted;

    function v_restore_volume(){
        if(v_volume === undefined){
            v_volume = localStorage.ChiloVideoVolume;
            v_muted = localStorage.ChiloVideoMuted;
        }

        if(v_volume === undefined){
            v_volume = 1.0;
            v_muted = 0;
        }

        videoDom.volume = v_volume;
        videoDom.muted = (v_muted > 0);
    }

    function v_save_volume(){
        var v = videoDom.volume;
        var m = videoDom.muted?1:0;

        if(v == v_volume && m == v_muted){
            return;
        }

        v_volume = v;
		v_muted = m;
        localStorage.ChiloVideoVolume = v;
        localStorage.ChiloVideoMuted = m;
    }

    //
    // youtube
    //
    var yt_player;
    var $yt_div;
    var yt_looping = false;
    var yt_stop;
    var yt_ct;
    var yt_ios = md.is('iOS');

    function yt_load_start(){
        yt_player = null;
        $yt_div = null;

        yt_stop = false;
        yt_ct = 0;
    }

    function yt_init(){
        if(yt_player != null && $yt_div != null){
            handle_seek(function (t){
                yt_ct = t;
                yt_player.seekTo(t, do_autoplay > 0);
            });

	    if(yt_ct != 0 && !yt_ios){
                yt_stop = true;
            }

	    yt_restore_volume();
            yt_autoplay();
        }
    }

    function yt_loaded(){
        $yt_div = _reader.getElements(_spineItem.idref, ".video");

        yt_init();

        if(!yt_looping){
            yt_looping = true;
            yt_loop();
        }
    }

    function yt_pageChanged(){
        if(!yt_ios){
            yt_autoplay();
        }

        if($yt_div != null && yt_player != null){
	    yt_player.setSize($yt_div.width(),$yt_div.height());
        }
    }

    function onAPIReady(p){
	debug("onAPIReady called");
	debug(p);
    }

    function onPlayerReady(e){
	debug("onPlayerReady called");
	yt_player = e.target;

        yt_init();
    }

    function onStateChange(e){
        var s = yt_player.getPlayerState();
	debug("onStateChange called " + s + " " + yt_stop);

        if(yt_stop && s == 1){
            yt_player.pauseVideo();
            yt_stop = false;
        }
    }

    function yt_autoplay(){
        if(yt_player != null && $yt_div != null){
	    var v = _reader.isElementVisible($yt_div);
            debug("yt_autoplay " + v);

            if(do_autoplay > 0 && v > 0){
                yt_player.playVideo();
                yt_stop = false;
            } else if(yt_player.getPlayerState() == 1){
                //yt_player.pauseVideo(); //自動再生もON/OFFと同調させる場合はこちらを有効にする
                yt_player.playVideo();
            } else if(yt_player.getCurrentTime() != 0){
                //yt_stop = true; //自動再生もON/OFFと同調させる場合はこちらを有効にする
                yt_player.playVideo();
                yt_stop = false;
            }
        }
    }

    function yt_check(){
	if(yt_player != null){
            var s = yt_player.getPlayerState();
	    if(s < 0 || s >= 3){
                return;
            }

	    if(!do_fadeout){
		yt_save_volume();
	    }

            var ap = do_autoplay;
            var ct = yt_player.getCurrentTime();
            var diff = yt_ct - ct;
            yt_ct = ct;

//            debug("yt_check " + ap + "," + ct + "," + diff + "," + s);

            if(ap == 0 && (diff < -1 || diff > 1)){
                debug("yt_loop far seek " + diff);
                ap = 1;
            }

            handle_jump(yt_ct,
                function(){
                    var vl = yt_player.getVolume();
                    vl = Math.floor(vl-10);
                    if(vl >= 0){
                        yt_player.setVolume(vl);
                    }
                },
                function(){
                    yt_player.pauseVideo();
		},
                function(){
                    yt_player = null;
                    $yt_div = null;
                },
                ap);
        }
    }

    function yt_loop(){
	yt_check();

	setTimeout(function(){
            yt_loop();
        },250);
    }

    var yt_volume;
    var yt_muted;

    function yt_set_mute(){
	if(yt_muted > 0){
            yt_player.mute();
	} else {
            yt_player.unMute();
	}
    }

    function yt_restore_volume(){
        if(yt_volume === undefined){
            yt_volume = parseInt(localStorage.ChiloVideoVolume * 100);
            yt_muted = localStorage.ChiloVideoMuted;
        }

        if(yt_volume === undefined){
            yt_volume = 100;
            yt_muted = false;
        }

        yt_player.setVolume(yt_volume);
	yt_set_mute();
    }

    function yt_save_volume(){
        var v = yt_player.getVolume();
        var m = yt_player.isMuted()?1:0;

        if(v == yt_volume && m == yt_muted){
            return;
        }

        yt_volume = v;
	yt_muted = m;
        localStorage.ChiloVideoVolume = v / 100.0;
        localStorage.ChiloVideoMuted = m;
    }

    //
    // on/off button UI in navigation bar
    //
    var autoplayclick = 0;
    function videoautoplay(e){
	if(do_autoplay > 0){
            autoplayclick = 1;
            do_autoplay = 0;
		    hide_popup();
        } else {
            autoplayclick = 1;
            do_autoplay = 1;
		    show_popup();
        }
	    localStorage.ChiloVideoAutoplay = do_autoplay;
	    if(autoplayclick == 0){
          handle_autoplay();
        }else{
          autoplayclick = 0;
        }
        update_button();
    }

    function show_popup(){
        $popup.fadeIn(2000);

        setTimeout(function(){
           $popup.fadeOut(2000);
        },3000);
    }

    function hide_popup(){
        $popup.hide();
    }

    function update_button(){
	if(do_autoplay > 0){
            $button.removeClass("glyphicon-pause");
            $button.addClass("glyphicon-play");
        } else {
            $button.removeClass("glyphicon-play");
            $button.addClass("glyphicon-pause");
        }
    }
}();

});
