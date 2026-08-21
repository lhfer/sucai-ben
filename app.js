(function () {
  "use strict";
  var STORAGE_KEY = "intel-read-v1";
  var CATEGORIES = ["好玩AI", "提示词", "视觉尝试", "小众工具", "硬科技", "痛点", "跨行业", "趋势"];
  var state = { items: [], updated: "", read: [], linger: [], filter: "unread", category: "", query: "" };

  function loadRead() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveRead() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.read));
  }
  function isRead(id) { return state.read.indexOf(id) !== -1; }
  function markRead(id) {
    if (!isRead(id)) { state.read.push(id); saveRead(); }
    if (state.linger.indexOf(id) === -1) state.linger.push(id);
  }
  function markUnread(id) {
    state.read = state.read.filter(function (x) { return x !== id; });
    saveRead();
  }
  function formatDate(iso) {
    var p = iso.split("-");
    return p[0] + "年" + Number(p[1]) + "月" + Number(p[2]) + "日";
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function matches(item) {
    if (state.category && item.category !== state.category) return false;
    var q = state.query.trim().toLowerCase();
    if (q) {
      var hay = (item.title + "\n" + item.body).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (state.filter === "unread" && isRead(item.id) && state.linger.indexOf(item.id) === -1) return false;
    return true;
  }
  function unreadCount() {
    return state.items.filter(function (it) { return !isRead(it.id); }).length;
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function renderChips() {
    var box = document.getElementById("chips");
    while (box.firstChild) box.removeChild(box.firstChild);
    var names = [""].concat(CATEGORIES);
    names.forEach(function (c) {
      var b = el("button", "chip", c ? c : "全部分类");
      b.type = "button";
      b.dataset.cat = c;
      b.setAttribute("aria-pressed", state.category === c ? "true" : "false");
      box.appendChild(b);
    });
  }

  function cardNode(it) {
    var read = isRead(it.id);
    var art = el("article", "card " + (read ? "read" : "unread"));
    art.dataset.id = it.id;
    var meta = el("div", "meta");
    meta.appendChild(el("span", "", formatDate(it.date)));
    meta.appendChild(el("span", "cat-tag", it.category));
    art.appendChild(meta);
    art.appendChild(el("h3", "title", it.title));
    art.appendChild(el("p", "body", it.body));
    addExtras(art, it, read);
    return art;
  }
  function addExtras(art, it, read) {
    if (it.links && it.links.length) {
      var links = el("div", "links");
      it.links.forEach(function (l) {
        var a = el("a", "", l.label);
        a.href = l.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        links.appendChild(a);
      });
      art.appendChild(links);
    }
    if (it.prompt) {
      var box = el("div", "prompt");
      var bar = el("div", "prompt-bar");
      bar.appendChild(el("span", "", "提示词"));
      var copy = el("button", "copy", "复制");
      copy.type = "button";
      copy.dataset.copy = it.id;
      bar.appendChild(copy);
      box.appendChild(bar);
      box.appendChild(el("pre", "", it.prompt));
      art.appendChild(box);
    }
    var actions = el("div", "actions");
    var tog = el("button", "toggle-read", read ? "标为未读" : "标为已读");
    tog.type = "button";
    tog.dataset.toggle = it.id;
    actions.appendChild(tog);
    art.appendChild(actions);
  }

  function render() {
    document.getElementById("unread-num").textContent = unreadCount();
    document.getElementById("filter-unread").setAttribute("aria-pressed", state.filter === "unread" ? "true" : "false");
    document.getElementById("filter-all").setAttribute("aria-pressed", state.filter === "all" ? "true" : "false");
    renderChips();
    var visible = state.items.filter(matches);
    var feed = document.getElementById("feed");
    var empty = document.getElementById("empty");
    while (feed.firstChild) feed.removeChild(feed.firstChild);
    if (!visible.length) {
      empty.classList.remove("hidden");
      empty.replaceChildren();
      if (state.filter === "unread" && !state.query && !state.category && unreadCount() === 0) {
        empty.appendChild(document.createTextNode("都看完了"));
        empty.appendChild(el("p", "", "切到「全部」，或等下一期剪报。"));
      } else {
        empty.appendChild(document.createTextNode("没有对上的条目"));
        empty.appendChild(el("p", "", "换个词，或清掉分类再看。"));
      }
      return;
    }
    empty.classList.add("hidden");
    var groups = {};
    var order = [];
    visible.forEach(function (it) {
      if (!groups[it.date]) { groups[it.date] = []; order.push(it.date); }
      groups[it.date].push(it);
    });
    order.sort(function (a, b) { return a < b ? 1 : a > b ? -1 : 0; });
    order.forEach(function (date) {
      var sec = el("section", "day");
      var head = el("div", "day-head");
      head.appendChild(el("h2", "", formatDate(date)));
      head.appendChild(el("span", "", groups[date].length + " 条"));
      sec.appendChild(head);
      groups[date].forEach(function (it) { sec.appendChild(cardNode(it)); });
      feed.appendChild(sec);
    });
  }

  function itemById(id) {
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === id) return state.items[i];
    }
    return null;
  }
  function bind() {
    document.getElementById("filter-unread").addEventListener("click", function () {
      state.filter = "unread";
      state.linger = [];
      render();
    });
    document.getElementById("filter-all").addEventListener("click", function () {
      state.filter = "all";
      render();
    });
    document.getElementById("search").addEventListener("input", function (e) {
      state.query = e.target.value;
      render();
    });
    document.getElementById("mark-all").addEventListener("click", function () {
      if (!confirm("把目前全部条目标为已读？")) return;
      state.items.forEach(function (it) { markRead(it.id); });
      render();
    });
    document.getElementById("chips").addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      state.category = btn.getAttribute("data-cat") || "";
      render();
    });
    document.getElementById("feed").addEventListener("click", onFeedClick);
  }
  function onFeedClick(e) {
    var copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) {
      e.stopPropagation();
      var item = itemById(copyBtn.getAttribute("data-copy"));
      if (item && item.prompt && navigator.clipboard) {
        navigator.clipboard.writeText(item.prompt).then(function () {
          copyBtn.textContent = "已复制";
          setTimeout(function () { copyBtn.textContent = "复制"; }, 1200);
        });
      }
      return;
    }
    if (e.target.closest("a")) return;
    var toggle = e.target.closest("[data-toggle]");
    if (toggle) {
      e.stopPropagation();
      var tid = toggle.getAttribute("data-toggle");
      if (isRead(tid)) markUnread(tid);
      else markRead(tid);
      render();
      return;
    }
    var card = e.target.closest(".card");
    if (card) {
      markRead(card.getAttribute("data-id"));
      render();
    }
  }
  function boot() {
    state.read = loadRead();
    if (window.INTEL_DATA) { onData(window.INTEL_DATA); return; }
    fetch("data.json").then(function (r) { return r.json(); }).then(onData).catch(onFail);
  }
  function onData(data) {
    state.items = data.items || [];
    state.updated = data.updated || "";
    if (state.updated) {
      document.getElementById("issue-date").textContent = "更新 " + formatDate(state.updated);
    }
    bind();
    render();
  }
  function onFail() {
    var empty = document.getElementById("empty");
    empty.classList.remove("hidden");
    empty.replaceChildren();
    empty.appendChild(document.createTextNode("读不到 data.json"));
    empty.appendChild(el("p", "", "用静态服务器打开，或确认文件在同一目录。"));
  }
  boot();
})();
