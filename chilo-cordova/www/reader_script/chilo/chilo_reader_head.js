//
// chilo module
//
var chilo = {
  ChiloBoolUrl: null,
  ChiloBookEpubFileUrl: null,
  TOCSelectedid: null
};

(function(chilo){
  var saved_window_open;

  //
  // use src/chilo/EpubReader.js selectively
  //
  chilo.use_chilo_EpubReader = function(){
    return true;
    return window['cordova'];
  }

  /* CHiLO Bookのページパスを取得。substr(1)で#除外
   */
  chilo.ChiloOnlinePage = window.location.hash.substr(1);

  if(window['cordova']){
    //
    // cordova support
    //
    console.log("CCC-TIES: chilo cordova reader");

    //
    // hook requstFileSystem before cordova ready
    //
    var saved_req = null;

    if(window.requestFileSystem == undefined){
      window.requestFileSystem = function(type, size, success, error){
        console.log("CCC-TIES: save requestFileSystem request");
        saved_req = {type:type, size:size, success:success, error:error};
      }
    }

    function do_saved_req(req){
      console.log("CCC-TIES: do_saved_req called");
      if(req != null){
        console.log("CCC-TIES: do saved requestFileSystem request");
        window.requestFileSystem(req.type, req.size, req.success, req.error);
      }
    }

    //
    // handle device ready event
    //
    function deviceready(){
      console.log("CCC-TIES: deviceready called");
      var saved_requestFileSystem = window.requestFileSystem;

      // window.open
      window.open = function(url, target, option){
        console.log("CCC-TIES: call cordova.InAppBrowser.open" + url);
        var ref = cordova.InAppBrowser.open(url, "_blank", "location=yes");
        ref.addEventListener('loadstart', function(e){
          var url = e.url;
          console.log("InAppBrowser loadstart: " + url);
          if(url.lastIndexOf("?") == -1 && url.toLowerCase().endsWith(".epub")){
            console.log("call _system browser");
            cordova.InAppBrowser.open(url, "_system");
            ref.close();
          }
        });
      }

      // window.requestFileSystem
      window.requestFileSystem = function(type, size, success, error){
        console.log("CCC-TIES: hooked requestFileSystem called");
        saved_requestFileSystem(type, 0, success, error);
      }

      do_saved_req(saved_req);
    }

    document.addEventListener("deviceready", deviceready, false);
  } else {
    //
    // browser support
    //
    console.log("CCC-TIES: chilo cloud reader");

    saved_window_open = window.open.bind(window);

    window.open = function(url, target, option){
      console.log("CCC-TIES: call booklinkcall " + url);
      chilo.booklinkcall(url);
    }

    /* NPO CCC-TIES 2016.01.26 add
     * (処理の概要)
     * CHiLO Bookからリンクされるwebページは、次のような場合iframeに表示されないよう処理
     * 
     * (iframeに表示されない場合）
     * １．iframeでの表示を許可していないドメイン
     * ２．iframeを表示しているindex.htmlがhttpsプロトコルで配信される場合、httpプロトコルのwebページは、混在コンテンツの問題により表示されない。
     * 
     * そこで、１のドメインを特定することは困難なため、iframeでの表示が可能なサイトをホワイトリストとして列挙し、
     * リスト以外のサイトは別ウィンドウで表示する。
     * なお、上記ホワイトリストには http://proxy.chilos.jp もふくまれるため、index.htmlがhttpsプロトコルから配信される可能性を配慮し、２の条件もふくめる
     */
    var returnbookview;
    var bookviewprotocol=window.location.protocol;
    chilo.booklinkcall = function(url)
    {
      /* chiloflag=1がURLについていると、通常のブラウザでMoodleを見たときもシンプル表示になってしまうので、値を0に変更してページ遷移させる */
      url=url.replace("chiloflag=1","chiloflag=0");

      if ( url.match(/.epub$/)) {
        returnbookview="none";
        saved_window_open(url);
      }else if ( bookviewprotocol.match(/^https:/) && url.match(/^http:/) || url.match(/chilos.jp/) == null && url.match(/cccties.org/) == null ) {
        returnbookview="none";
        saved_window_open(url,null,'width=1024, height=768, menuber=yes, toolbar=yes, scrollbars=yes');
      }else{
        returnbookview="block";
        saved_window_open(url,'_self');
      }
      if ( url.match(/http/)) {
        parent.postMessage(returnbookview,"*");
      }
    }
    
    chilo.snslinkcall = function(url)
    {
     returnbookview="none";
     if ( url.match(/^http:\/\/www.facebook.com\/share.php\?u=/) ) {
       saved_window_open(url,null,'width=554, height=470, menubar=no, toolbar=no, scrollbars=yes');
     }else if ( url.match(/^http:\/\/twitter.com\/share\?url=/) ) {
       saved_window_open(url,null,'width=650, height=470, personalbar=0, toolbar=0, scrollbars=1, sizable=1');
     }else if ( url.match(/^https:\/\/plus.google.com\/share\?url=/) ) {
       saved_window_open(url,null,'width=554, height=470, personalbar=0, toolbar=0, scrollbars=1, sizable=1');
     }else if ( url.match(/^http:\/\/www.linkedin.com\/shareArticle\?mini=true&url=/) ) {
       saved_window_open(url,null,'width=650, height=533, personalbar=0, toolbar=0, scrollbars=1, sizable=1');
     }
    }
    
  }

  /* NPO CCC-TIES 2016.03.17 add
   * オンライン版のURLを取得(chilo.ChiloBookUrl)
   * ePubファイルのURLを取得(chilo.ChiloBookEpubFileUrl)
   */
  var ChiloBookEpubFileName = "chilo.epub";                          // パッケージ版の時に並べるePubファイル名
  var ChiloBookEpubDir = location.protocol + "//" + location.hostname + "/book/compress/";   // 非パッケージ版の時に配置するePubのディレクトリ

  var ChiloBookPath = location.href.substring(0,location.href.indexOf("?"));
  var ReadeFileName = ChiloBookPath.match(".+/(.+?)([\?#;].*)?$")[1];
  var ChiloBookDir = ChiloBookPath.replace(ReadeFileName , "");
  var ChiloBookArg = location.search.substring(0,location.search.indexOf("&"));
  var ChiloBookFileName = ChiloBookArg.replace("?epub=" , "");

  //パッケージ版や外部参照
  if(location.search.match(/http/)){ 
    //パッケージ版か外部参照か判定する
    if(ChiloBookDir == ChiloBookFileName){ 
      chilo.ChiloBookUrl = ChiloBookDir + "index.html"; 
      chilo.ChiloBookEpubFileUrl = ChiloBookFileName + ChiloBookEpubFileName; 
    }else{
      chilo.ChiloBookUrl = ChiloBookDir + "index.html?" + ChiloBookFileName; 
      ChiloBookFileName_S = ChiloBookFileName.replace(/^\/|\/$/g,'') + "/";
      chilo.ChiloBookEpubFileUrl = ChiloBookFileName_S + ChiloBookEpubFileName; 
    }
  //非パッケージ版（オンライン版のディレクトリ名とePub名をあわせないと動作しないので注意）
  }else{ 
    chilo.ChiloBookUrl = ChiloBookDir + "?" + ChiloBookFileName; 
    chilo.ChiloBookEpubFileUrl = ChiloBookEpubDir + ChiloBookFileName + ".epub"; 
  }

})(chilo);
