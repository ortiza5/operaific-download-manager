function pointInElement(p, elem) {
  return (
    p.x >= elem.offsetLeft &&
    p.x <= elem.offsetLeft + elem.offsetWidth &&
    p.y >= elem.offsetTop &&
    p.y <= elem.offsetTop + elem.offsetHeight
  );
}

function setLastOpened() {
  localStorage.popupLastOpened = new Date().getTime();
  chrome.runtime.sendMessage("poll");
}

function loadI18nMessages() {
  function setProperty(selector, prop, msg) {
    document.querySelector(selector)[prop] = chrome.i18n.getMessage(msg);
  }

  setProperty("title", "innerText", "tabTitle");
  setProperty("#all-downloads", "title", "AllDownloadsTitle");
  setProperty("#clear-all", "title", "clearAllTitle");
  setProperty("#clear-all-text", "innerText", "clearAllText");
  setProperty(
    "#management-permission-info",
    "innerText",
    "managementPermissionInfo"
  );
  setProperty(
    "#grant-management-permission",
    "innerText",
    "grantManagementPermission"
  );
  setProperty("#older", "innerText", "showOlderDownloads");
  setProperty("#loading-older", "innerText", "loadingOlderDownloads");
  setProperty(".pause", "title", "pauseTitle");
  setProperty(".resume", "title", "resumeTitle");
  setProperty(".cancel", "title", "cancelTitle");
  setProperty(".show-folder", "title", "showInFolderTitle");
  setProperty(".erase", "title", "eraseTitle");
  setProperty(".url", "title", "retryTitle");
  setProperty(".referrer", "title", "referrerTitle");
  setProperty(".open-filename", "title", "openTitle");
  setProperty(".remove-file", "title", "removeFileTitle");

  document.querySelector(".myprogress").style.minWidth =
    getTextWidth(
      formatBytes(1024 * 1024 * 1023.9) +
        "/" +
        formatBytes(1024 * 1024 * 1023.9)
    ) + "px";

  var max_time_left_width = 0;
  for (var i = 0; i < 4; ++i) {
    max_time_left_width = Math.max(
      max_time_left_width,
      getTextWidth(
        formatTimeLeft(0 == i % 2, i < 2 ? 0 : (100 * 24 + 23) * 60 * 60 * 1000)
      )
    );
  }
  document.querySelector("body div.item span.time-left").style.minWidth =
    max_time_left_width + "px";
}

function getTextWidth(s) {
  var probe = document.getElementById("text-width-probe");
  probe.innerText = s;
  return probe.offsetWidth;
}

function formatDateTime(date) {
  var now = new Date();
  var zpad_mins = ":" + (date.getMinutes() < 10 ? "0" : "") + date.getMinutes();
  if (date.getYear() != now.getYear()) {
    return "" + (1900 + date.getYear());
  } else if (
    date.getMonth() != now.getMonth() ||
    date.getDate() != now.getDate()
  ) {
    return (
      date.getDate() +
      " " +
      chrome.i18n.getMessage("month" + date.getMonth() + "abbr")
    );
  } else if (date.getHours() == 12) {
    return "12" + zpad_mins + "pm";
  } else if (date.getHours() > 12) {
    return date.getHours() - 12 + zpad_mins + "pm";
  }
  return date.getHours() + zpad_mins + "am";
}

function formatBytes(n) {
  if (n < 1024) {
    return n + "B";
  }
  var prefixes = "KMGTPEZY";
  var mul = 1024;
  for (var i = 0; i < prefixes.length; ++i) {
    if (n < 1024 * mul) {
      return (
        parseInt(n / mul) +
        "." +
        parseInt(10 * ((n / mul) % 1)) +
        prefixes[i] +
        "B"
      );
    }
    mul *= 1024;
  }
  return "!!!";
}

function formatSpeed(ms, bytes) {
  if (ms < 1000) {
    return "0KB/s";
  }
  var sec = ms / 1000;
  var speed = bytes / sec;

  if (speed < 1024) {
    return Math.round(speed * 10) / 10 + "bytes/s";
  }
  if (speed < 1048576) {
    return Math.round((speed / 1024) * 10) / 10 + "KB/s";
  } else return Math.round((speed / (1024 * 1024)) * 10) / 10 + "MB/s";
}

function formatTimeLeft(openWhenComplete, ms) {
  var prefix = openWhenComplete ? "openWhenComplete" : "timeLeft";
  if (ms < 1000) {
    return chrome.i18n.getMessage(prefix + "Finishing");
  }
  var days = parseInt(ms / (24 * 60 * 60 * 1000));
  var hours = parseInt(ms / (60 * 60 * 1000)) % 24;
  if (days) {
    return chrome.i18n.getMessage(prefix + "Days", [days, hours]);
  }
  var minutes = parseInt(ms / (60 * 1000)) % 60;
  if (hours) {
    return chrome.i18n.getMessage(prefix + "Hours", [hours, minutes]);
  }
  var seconds = parseInt(ms / 1000) % 60;
  if (minutes) {
    return chrome.i18n.getMessage(prefix + "Minutes", [minutes, seconds]);
  }
  return chrome.i18n.getMessage(prefix + "Seconds", [seconds]);
}

function binarySearch(array, target, cmp) {
  var low = 0,
    high = array.length - 1,
    i,
    comparison;
  while (low <= high) {
    i = (low + high) >> 1;
    comparison = cmp(target, array[i]);
    if (comparison < 0) {
      low = i + 1;
    } else if (comparison > 0) {
      high = i - 1;
    } else {
      return i;
    }
  }
  return i;
}

function arrayFrom(seq) {
  return Array.prototype.slice.apply(seq);
}

function DownloadItem(data) {
  var item = this;
  for (var prop in data) {
    item[prop] = data[prop];
  }
  item.startTime = new Date(item.startTime);
  if (item.canResume == undefined) {
    DownloadItem.canResumeHack = true;
  }

  item.div = document.querySelector("body>div.item").cloneNode(true);
  item.div.id = "item" + item.id;
  item.div.item = item;

  var items_div = document.getElementById("items");
  if (
    items_div.childNodes.length == 0 ||
    item.startTime.getTime() <
      items_div.childNodes[
        items_div.childNodes.length - 1
      ].item.startTime.getTime()
  ) {
    items_div.appendChild(item.div);
  } else if (
    item.startTime.getTime() > items_div.childNodes[0].item.startTime.getTime()
  ) {
    items_div.insertBefore(item.div, items_div.childNodes[0]);
  } else {
    var adjacent_div =
      items_div.childNodes[
        binarySearch(
          arrayFrom(items_div.childNodes),
          item.startTime.getTime(),
          function(target, other) {
            return target - other.item.startTime.getTime();
          }
        )
      ];
    var adjacent_item = adjacent_div.item;
    if (adjacent_item.startTime.getTime() < item.startTime.getTime()) {
      items_div.insertBefore(item.div, adjacent_div);
    } else {
      items_div.insertBefore(item.div, adjacent_div.nextSibling);
    }
  }

  item.getElement("referrer").onclick = function(event) {
    chrome.tabs.create({ url: item.referrer });
    event.stopPropagation();
    return false;
  };

  item.getElement("url").onclick = function(event) {
    chrome.tabs.create({ url: item.url });
    event.stopPropagation();
    return false;
  };

  item.getElement("by-ext").onclick = function(event) {
    chrome.tabs.create({ url: "chrome://extensions#" + item.byExtensionId });
    event.stopPropagation();
    return false;
  };
  item.getElement("open-filename").onclick = function(event) {
    item.open();
    window.close();
    event.stopPropagation();

    return false;
  };
  //$(item.div).contextMenu(menu1,{theme:'vista'});
  item.div.oncontextmenu = function(event) {
    //alert("right clicked");
    return false;
  };

  item.div.onclick = function(event) {
    item.open();
    window.close();
    return false;
  };
  item.div.onmouseover = function() {
    var openable = item.state != "interrupted" && item.exists && !item.deleted;
    if (openable) {
      item.div.style.borderLeftColor = "#5bc0de";
    } else {
      item.div.style.borderLeftColor = "#d9534f";
    }
    if (
      item.state == "in_progress" ||
      item.state == "interrupted" ||
      !item.exists ||
      item.deleted
    )
      item.getElement("info").style.display = "none";
    else item.getElement("info").style.display = "inline";
    return false;
  };
  item.div.onmouseout = function() {
    item.div.style.borderLeftColor = "#eee";
    //item.getElement('info').style.display = 'none';
    return false;
  };
  item.div.ondragstart = function() {
    item.drag();
    return false;
  };
  item.getElement("pause").onclick = function(event) {
    item.pause();
    event.stopPropagation();
    return false;
  };
  item.getElement("cancel").onclick = function(event) {
    item.cancel();
    event.stopPropagation();
    return false;
  };
  item.getElement("resume").onclick = function(event) {
    item.resume();
    event.stopPropagation();
    return false;
  };
  item.getElement("show-folder").onclick = function(event) {
    item.show();
    event.stopPropagation();
    return false;
  };
  item.getElement("remove-file").onclick = function(event) {
    item.removeFile();
    event.stopPropagation();
    return false;
  };
  item.getElement("erase").onclick = function(event) {
    item.erase();
    event.stopPropagation();
    return false;
  };

  /*item.more_mousemove = function(evt) {
    if (item.getElement('more') &&
        (pointInElement(evt, item.div) ||
         pointInElement(evt, item.getElement('more')))) {
      return;
    }
    if (item.getElement('more')) {
      item.getElement('more').hidden = true;
    }
    window.removeEventListener('mousemove', item.more_mousemove);
  };
  [item.getElement('icon'), item.getElement('more')].concat(
      item.getElement('more').children).forEach(function(elem) {
    elem.onmouseover = function() {
      arrayFrom(items_div.children).forEach(function(other) {
        if (other.item != item) {
          other.item.getElement('more').hidden = true;
        }
      });
      item.getElement('more').hidden = false;
      item.getElement('more').style.top =
        (item.div.offsetTop + item.div.offsetHeight) + 'px';
      item.getElement('more').style.left = item.div.offsetLeft + 'px';
      if (window.innerHeight < (parseInt(item.getElement('more').style.top) +
                                item.getElement('more').offsetHeight)) {
        item.getElement('more').style.top = (
          item.div.offsetTop - item.getElement('more').offsetHeight) + 'px';
      }
      window.addEventListener('mousemove', item.more_mousemove);
    };
  });*/

  if (item.referrer) {
    item.getElement("ref").innerText = item.referrer.substr(0, 25) + "...";
  } else {
    item.getElement("ref").hidden = true;
  }
  item.getElement("url").href = item.url;
  //item.getElement('url').innerHTML = "<img class=\"info_control\" src=\"icons/ic_action_replay.png\"></img>";
  item.render();
}
DownloadItem.canResumeHack = false;

DownloadItem.prototype.getElement = function(name) {
  return document.querySelector("#item" + this.id + " ." + name);
};

DownloadItem.prototype.render = function() {
  var item = this;
  var now = new Date();
  var in_progress = item.state == "in_progress";
  var openable = item.state != "interrupted" && item.exists && !item.deleted;

  item.startTime = new Date(item.startTime);
  if (DownloadItem.canResumeHack) {
    item.canResume = in_progress && item.paused;
  }
  if (item.filename) {
    item.basename = item.filename.substring(
      Math.max(
        item.filename.lastIndexOf("\\"),
        item.filename.lastIndexOf("/")
      ) + 1
    );
    if (item.basename.length > 40) {
      item.basename =
        item.basename.substr(0, 30) +
        "..." +
        item.basename.substr(item.basename.length - 7, item.basename.length);
    }
  }
  if (item.estimatedEndTime) {
    item.estimatedEndTime = new Date(item.estimatedEndTime);
  }
  if (item.endTime) {
    item.endTime = new Date(item.endTime);
  }

  if (item.filename && !item.icon_url) {
    chrome.downloads.getFileIcon(item.id, { size: 32 }, function(icon_url) {
      //item.getElement('icon').hidden = !icon_url;
      if (icon_url) {
        item.icon_url = icon_url;
        item.getElement("icon").src = icon_url;
      }
    });
  }
  item.div.style.cursor = openable ? "pointer" : "";
  item.getElement("removed").style.display = openable ? "none" : "inline";
  item.getElement("open-filename").style.display = openable ? "inline" : "none";
  item.getElement("in-progress").hidden = !in_progress;
  item.getElement("pause").style.display =
    !in_progress || item.paused ? "none" : "inline-block";
  item.getElement("resume").style.display =
    !in_progress || !item.canResume ? "none" : "inline-block";
  item.getElement("cancel").style.display = !in_progress
    ? "none"
    : "inline-block";
  item.getElement("remove-file").hidden =
    item.state != "complete" ||
    !item.exists ||
    item.deleted ||
    !chrome.downloads.removeFile;
  item.getElement("erase").hidden = in_progress;
  item.getElement("complete-size").hidden = in_progress;
  item.getElement("start-time").hidden = in_progress;
  item.getElement("ref").hidden = in_progress;
  item.getElement("dash").hidden = in_progress;
  item.getElement("show-folder").hidden = in_progress || !openable;
  item.getElement("url").hidden = in_progress;

  var could_progress = in_progress || item.canResume;
  item.getElement("myprogress").style.display = could_progress
    ? "inline-block"
    : "none";
  item.getElement("meter").hidden = !could_progress || !item.totalBytes;

  item.getElement("removed").innerText = item.basename;
  item.getElement("open-filename").innerText = item.basename;

  function setByExtension(show) {
    if (show) {
      item.getElement("by-ext").title = item.byExtensionName;
      item.getElement("by-ext").href =
        "chrome://extensions#" + item.byExtensionId;
      item.getElement("by-ext img").src =
        "chrome://extension-icon/" + item.byExtensionId + "/48/1";
    } else {
      item.getElement("by-ext").hidden = true;
    }
  }
  if (item.byExtensionId && item.byExtensionName) {
    chrome.permissions.contains({ permissions: ["management"] }, function(
      result
    ) {
      if (result) {
        setByExtension(true);
      } else {
        setByExtension(false);
        if (!localStorage.managementPermissionDenied) {
          document.getElementById(
            "request-management-permission"
          ).hidden = false;
          document.getElementById(
            "grant-management-permission"
          ).onclick = function() {
            chrome.permissions.request(
              { permissions: ["management"] },
              function(granted) {
                setByExtension(granted);
                if (!granted) {
                  localStorage.managementPermissionDenied = true;
                }
              }
            );
            return false;
          };
        }
      }
    });
  } else {
    setByExtension(false);
  }

  item.getElement("complete-size").innerText = formatBytes(item.bytesReceived);
  if (item.totalBytes && item.state != "complete") {
    item.getElement("myprogress").innerText =
      item.getElement("complete-size").innerText +
      " of " +
      formatBytes(item.totalBytes);
    item.getElement("meter").children[0].style.width =
      parseInt((100 * item.bytesReceived) / item.totalBytes) + "%";
  }

  if (in_progress) {
    if (item.estimatedEndTime && !item.paused) {
      var openWhenComplete = false;
      try {
        openWhenComplete =
          JSON.parse(localStorage.openWhenComplete).indexOf(item.id) >= 0;
      } catch (e) {}
      var timeLeftInMS = item.estimatedEndTime.getTime() - now.getTime();
      var sizeLeftInBytes = item.totalBytes - item.bytesReceived;

      item.getElement("speed").innerText = formatSpeed(
        timeLeftInMS,
        sizeLeftInBytes
      );

      item.getElement("time-left").innerText = formatTimeLeft(
        openWhenComplete,
        item.estimatedEndTime.getTime() - now.getTime()
      );
    } else {
      item.getElement("time-left").innerText = String.fromCharCode(160);
    }
  }

  if (item.startTime) {
    item.getElement("start-time").innerText = formatDateTime(item.startTime);
  }

  this.maybeAccept();
};

DownloadItem.prototype.onChanged = function(delta) {
  for (var key in delta) {
    if (key != "id") {
      this[key] = delta[key].current;
    }
  }
  this.render();
  if (delta.state) {
    setLastOpened();
  }
  if (this.state == "in_progress" && !this.paused) {
    DownloadManager.startPollingProgress();
  }
  if (this.state == "interrupted" && this.filename == "") {
    this.erase();
  }
};

DownloadItem.prototype.onErased = function() {
  window.removeEventListener("mousemove", this.more_mousemove);
  document.getElementById("items").removeChild(this.div);
};

DownloadItem.prototype.drag = function() {
  chrome.downloads.drag(this.id);
};

DownloadItem.prototype.show = function() {
  chrome.downloads.show(this.id);
};

DownloadItem.prototype.open = function() {
  if (this.state == "complete") {
    chrome.downloads.open(this.id);
    return;
  }
  chrome.runtime.sendMessage({ openWhenComplete: this.id });
};

DownloadItem.prototype.removeFile = function() {
  chrome.downloads.removeFile(this.id);
  this.deleted = true;
  this.render();
};

DownloadItem.prototype.erase = function() {
  chrome.downloads.erase({ id: this.id });
};

DownloadItem.prototype.pause = function() {
  chrome.downloads.pause(this.id);
};

DownloadItem.prototype.resume = function() {
  chrome.downloads.resume(this.id);
};

DownloadItem.prototype.cancel = function() {
  chrome.downloads.cancel(this.id);
};

DownloadItem.prototype.maybeAccept = function() {
  if (
    this.state != "in_progress" ||
    this.danger == "safe" ||
    this.danger == "accepted" ||
    DownloadItem.prototype.maybeAccept.accepting_danger
  ) {
    return;
  }
  DownloadItem.prototype.maybeAccept.accepting_danger = true;
  var id = this.id;
  setTimeout(function() {
    chrome.downloads.acceptDanger(id, function() {
      chrome.tabs.create({ url: this.id });
      DownloadItem.prototype.maybeAccept.accepting_danger = false;
      arrayFrom(document.getElementById("items").childNodes).forEach(function(
        item_div
      ) {
        item_div.item.maybeAccept();
      });
    });
  }, 500);
};
DownloadItem.prototype.maybeAccept.accepting_danger = false;

var DownloadManager = {};

DownloadManager.showingOlder = false;

DownloadManager.getItem = function(id) {
  var item_div = document.getElementById("item" + id);
  return item_div ? item_div.item : null;
};

DownloadManager.getOrCreate = function(data) {
  var item = DownloadManager.getItem(data.id);
  return item ? item : new DownloadItem(data);
};

DownloadManager.forEachItem = function(cb) {
  arrayFrom(document.getElementById("items").childNodes).forEach(function(
    item_div,
    index
  ) {
    cb(item_div.item, index);
  });
};

DownloadManager.startPollingProgress = function() {
  if (DownloadManager.startPollingProgress.tid < 0) {
    DownloadManager.startPollingProgress.tid = setTimeout(
      DownloadManager.startPollingProgress.pollProgress,
      DownloadManager.startPollingProgress.MS
    );
  }
};
DownloadManager.startPollingProgress.MS = 200;
DownloadManager.startPollingProgress.tid = -1;
DownloadManager.startPollingProgress.pollProgress = function() {
  DownloadManager.startPollingProgress.tid = -1;
  chrome.downloads.search({ state: "in_progress", paused: false }, function(
    results
  ) {
    if (!results.length) return;
    results.forEach(function(result) {
      var item = DownloadManager.getOrCreate(result);
      for (var prop in result) {
        item[prop] = result[prop];
      }
      item.render();
      if (item.state == "in_progress" && !item.paused) {
        DownloadManager.startPollingProgress();
      }
    });
  });
};

DownloadManager.showNew = function() {
  var any_items = document.getElementById("items").childNodes.length > 0;
  document.getElementById("older").hidden = !any_items;
  //document.getElementById('head').style.borderBottomWidth =
  document.getElementById("clear-all").hidden = !any_items;

  if (!any_items) {
    return;
  }
  var old_ms = new Date().getTime() - kOldMs;
  var any_hidden = false;
  var any_showing = false;
  DownloadManager.forEachItem(function(item, index) {
    item.div.hidden =
      !DownloadManager.showingOlder &&
      (item.startTime.getTime() < old_ms || index >= kShowNewMax);
    any_hidden = any_hidden || item.div.hidden;
    any_showing = any_showing || !item.div.hidden;
  });
  if (!any_showing) {
    any_hidden = false;
    DownloadManager.forEachItem(function(item, index) {
      item.div.hidden = !DownloadManager.showingOlder && index >= kShowNewMax;
      any_hidden = any_hidden || item.div.hidden;
      any_showing = any_showing || !item.div.hidden;
    });
  }
  document.getElementById("older").hidden = !any_hidden;
};

DownloadManager.showOlder = function() {
  DownloadManager.showingOlder = true;
  var loading_older_span = document.getElementById("loading-older");
  document.getElementById("older").hidden = true;
  loading_older_span.hidden = false;
  chrome.downloads.search({}, function(results) {
    results.forEach(function(result) {
      var item = DownloadManager.getOrCreate(result);
      item.div.hidden = false;
    });
    loading_older_span.hidden = true;
  });
};

DownloadManager.clearAll = function() {
  DownloadManager.forEachItem(function(item) {
    if (!item.div.hidden && item.state != "in_progress") {
      item.erase();
    }
  });
};

DownloadManager.clearDeleted = function() {
  DownloadManager.forEachItem(function(item) {
    if (!item.div.hidden && !item.exists && item.state == "complete") {
      console.log(item.div);
      item.erase();
    }
  });
};

DownloadManager.clearCompleted = function() {
  DownloadManager.forEachItem(function(item) {
    if (!item.div.hidden && item.state == "complete") {
      item.erase();
    }
  });
};

DownloadManager.clearFailed = function() {
  DownloadManager.forEachItem(function(item) {
    if (!item.div.hidden && item.state == "interrupted") {
      item.erase();
    }
  });
};

DownloadManager.clearUndefined = function() {
  DownloadManager.forEachItem(function(item) {
    if (item.state == "interrupted" && item.filename == "") {
      item.erase();
    }
  });
};

var kShowNewMax = 50;
var kOldMs = 1000 * 60 * 60 * 24 * 7;
if ("kShowNewMax" in localStorage) {
  kShowNewMax = parseInt(localStorage.kShowNewMax);
}
if ("kOldMs" in localStorage) {
  kOldMs = parseInt(localStorage.kOldMs);
}

DownloadManager.loadItems = function() {
  try {
    chrome.downloads.search(
      {
        orderBy: ["-startTime"],
        limit: kShowNewMax + 1
      },
      function(results) {
        DownloadManager.loadItems.items = results;
        DownloadManager.loadItems.onLoaded();
      }
    );
  } catch (exc) {
    chrome.downloads.search(
      {
        orderBy: "-startTime",
        limit: kShowNewMax + 1
      },
      function(results) {
        DownloadManager.loadItems.items = results;
        DownloadManager.loadItems.onLoaded();
      }
    );
  }
};
DownloadManager.loadItems.items = [];
DownloadManager.loadItems.window_loaded = false;

DownloadManager.loadItems.onLoaded = function() {
  if (!DownloadManager.loadItems.window_loaded) {
    return;
  }
  DownloadManager.loadItems.items.forEach(function(item) {
    DownloadManager.getOrCreate(item);
  });
  DownloadManager.loadItems.items = [];
  DownloadManager.showNew();
  DownloadManager.clearUndefined();
};

DownloadManager.loadItems.onWindowLoaded = function() {
  DownloadManager.loadItems.window_loaded = true;
  DownloadManager.loadItems.onLoaded();
};
if (chrome.downloads) {
  DownloadManager.loadItems();

  chrome.downloads.onCreated.addListener(function(item) {
    DownloadManager.getOrCreate(item);
    DownloadManager.showNew();
    DownloadManager.startPollingProgress();
  });

  chrome.downloads.onChanged.addListener(function(delta) {
    var item = DownloadManager.getItem(delta.id);
    if (item) {
      item.onChanged(delta);
    }
  });

  chrome.downloads.onErased.addListener(function(id) {
    var item = DownloadManager.getItem(id);
    if (!item) {
      return;
    }
    item.onErased();
    DownloadManager.loadItems();
  });

  window.onload = function() {
    setLastOpened();
    loadI18nMessages();
    DownloadManager.loadItems.onWindowLoaded();
    document.getElementById("older").onclick = function() {
      DownloadManager.showOlder();
      return false;
    };
    document.getElementById("clear-all").onclick = function() {
      DownloadManager.clearAll();
      return false;
    };
    DownloadManager.startPollingProgress();

    $(function() {
      $("#items").contextMenu({
        selector: ".item",
        zIndex: 100,
        className: "contextMenu",
        reposition: false,
        callback: function(key, options) {
          var item_89 = DownloadManager.getItem($(this)[0].id.substr(4));
          item_89.open(); //DownloadManager.getItem(data.id);
          var m = "clicked: " + key + " on " + $(this);
          console.log($(this)[0].id);
        },
        items: {
          open: {
            name: chrome.i18n.getMessage("contextMenuOpen"),
            callback: function(key, options) {
              DownloadManager.getItem($(this)[0].id.substr(4)).open();
              window.close();
            },
            disabled: function(key, options) {
              var item = DownloadManager.getItem($(this)[0].id.substr(4));
              return !(
                item.state != "interrupted" &&
                item.exists &&
                !item.deleted
              );
            }
          },
          folder: {
            name: chrome.i18n.getMessage("contextMenuOpenFolder"),
            callback: function(key, options) {
              DownloadManager.getItem($(this)[0].id.substr(4)).show();
              window.close();
            },
            disabled: function(key, options) {
              var item = DownloadManager.getItem($(this)[0].id.substr(4));
              return !(
                item.state != "interrupted" &&
                item.exists &&
                !item.deleted
              );
            }
          },

          erase: {
            name: chrome.i18n.getMessage("contextMenuRemoveFromList"),
            callback: function(key, options) {
              DownloadManager.getItem($(this)[0].id.substr(4)).erase();
            },
            disabled: function(key, options) {
              var item = DownloadManager.getItem($(this)[0].id.substr(4));
              return item.state == "in_progress";
            }
          }
        }
      });
    });

    setup();
  };
}

function copyTextToClipboard(text) {
  var copyFrom = $("<textarea/>");
  copyFrom.text(text);
  $("body").append(copyFrom);
  copyFrom.select();
  document.execCommand("copy");
  copyFrom.remove();
}

var selectedItem;
var selectedItemIndex;

document.addEventListener("keydown", function(event) {
  if (event.keyCode == 13 && event.ctrlKey) {
    if (selectedItem == undefined) return;
    if (document.createEvent) {
      var ev = document.createEvent("HTMLEvents");
      ev.initEvent("contextmenu", true, false);
      selectedItem.dispatchEvent(ev);
    }
  } else if (document.getElementById("context-menu-layer") !== null) return;
  else if (event.keyCode == 38) {
    var items = document.getElementById("items").childNodes;
    if (items.length == 0) return;
    if (selectedItem === undefined || selectedItemIndex === undefined) {
      selectedItemIndex = 0;
    } else if (
      selectedItemIndex < 0 ||
      selectedItemIndex == 0 ||
      selectedItemIndex > items.length - 1
    ) {
      selectedItemIndex = 0;
    } else {
      selectedItemIndex--;
    }

    if (items[selectedItemIndex].hidden == true) {
      while (
        selectedItemIndex >= 0 &&
        items[selectedItemIndex].hidden == true
      ) {
        selectedItemIndex--;
      }
    }
    if (selectedItemIndex < 0) return;
    var previousSelectedItem = selectedItem;
    selectedItem = items[selectedItemIndex];
    deSelectAnItem(previousSelectedItem);
    selectAnItem(selectedItem);
  } else if (event.keyCode == 40) {
    var items = document.getElementById("items").childNodes;
    if (items.length == 0) return;
    if (selectedItem === undefined || selectedItemIndex === undefined) {
      selectedItemIndex = 0;
    } else if (selectedItemIndex < 0 || selectedItemIndex > items.length - 1) {
      selectedItemIndex = 0;
    } else if (selectedItemIndex == items.length - 1) {
    } else selectedItemIndex++;

    if (items[selectedItemIndex].hidden == true) {
      while (
        selectedItemIndex < items.length - 1 &&
        items[selectedItemIndex].hidden == true
      ) {
        selectedItemIndex++;
      }
    }
    if (selectedItemIndex > items.length - 1) return;

    var previousSelectedItem = selectedItem;
    selectedItem = items[selectedItemIndex];
    deSelectAnItem(previousSelectedItem);
    selectAnItem(selectedItem);
  } else if (event.keyCode == 13) {
    openSelectedItem(selectedItem);
  }
});

function selectAnItem(item) {
  if (item === undefined) return;
  var item2 = DownloadManager.getItem(item.id.substr(4));
  if (item2.state != "interrupted" && item2.exists && !item2.deleted)
    item.style.backgroundColor = "rgb(236,236,236)";
  else item.style.backgroundColor = "rgb(252,252,252)";
  item.scrollIntoViewIfNeeded();
}

function deSelectAnItem(item) {
  if (item === undefined) return;
  item.style.backgroundColor = null;
}

function openSelectedItem(item) {
  if (item === undefined || item.hidden == true) return;
  chrome.downloads.open(parseInt(item.id.substr(4)));
}

function setup() {
  document.getElementById("all-downloads").onclick = function() {
    chrome.tabs.create({ url: "chrome://downloads" });
    event.stopPropagation();
    return false;
  };
}
