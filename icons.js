window.onload = function() {
  var n = document.getElementById("download");
  n.onclick = function() {
    return chrome.runtime.sendMessage("icons"), (n.disabled = !0), !1;
  };
};
