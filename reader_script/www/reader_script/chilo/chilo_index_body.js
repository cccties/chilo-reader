/* NPO CCC-TIES 2016.6.17
 * CHiLOBook�ɖ߂�{�^���̕\��HTML
 */
var text1 = "<div class=\"returnarea\" id=\"returnbook\" style=\"display:none\">"
          + "<a href=\"#\" onClick=\"onlinetop();return false;\">"
          + "<img src=\"//example.net/reader_script/chilo/backtochilobook.png\" alt=\"Back to CHiLO Book\"/>"
          + "</a>"
          + "</div>"
          ;
$(document.body).prepend(text1);

/* NPO CCC-TIES 2016.6.17
 * ���������ʂ̕\��HTML
 */
var text2 = "<div id=\"layer_board_area\">"
          + "<div class=\"layer_board_bg\">"
          + "<span><img class=\"sousa\" src='//example.net/reader_script/chilo/sousa.png' /></span>"
          + "<p class=\"btn_close\"><img src=\"//example.net/reader_script/chilo/btn_close.png\"  /></a></p>"
          + "</div></div>"
          ;
/* NPO CCC-TIES 2016.7.25 add : iframe�\���ő啝�Œ�Ή�  */
$(".iframe").prepend(text2);
