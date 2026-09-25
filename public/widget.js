(function () {
  "use strict";
  if (window.__degoonyLoaded) return;
  window.__degoonyLoaded = true;

  var script = document.currentScript;
  var base = "https://pragya-ai.nyaaba-augustine.workers.dev";
  if (script && script.src) {
    try {
      base = new URL(script.src).origin;
    } catch (e) {}
  }

  function el(tag, styles, attrs) {
    var n = document.createElement(tag);
    if (styles) n.style.cssText = styles;
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  var root = el(
    "div",
    "position:fixed;right:20px;bottom:20px;z-index:2147483000;",
    { id: "degoony-widget" }
  );

  var btn = el(
    "button",
    [
      "width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;",
      "background:transparent;padding:0;overflow:hidden;",
      "box-shadow:0 10px 30px rgba(0,0,0,.35);",
      "transition:transform .18s ease;",
    ].join(""),
    { type: "button", "aria-label": "Chat with DEGOONY" }
  );

  btn.innerHTML =
    '<img src="https://res.cloudinary.com/dwsl2ktt2/image/upload/v1790161370/cyber_ijfhlq.png" alt="" width="60" height="60" style="width:60px;height:60px;border-radius:50%;object-fit:cover;pointer-events:none;" />';

  var panel = el(
    "div",
    [
      "position:fixed;right:20px;bottom:92px;",
      "width:min(380px, calc(100vw - 32px));",
      "height:min(600px, calc(100vh - 120px));",
      "border-radius:18px;overflow:hidden;background:#fff;",
      "box-shadow:0 24px 64px rgba(0,0,0,.4);",
      "border:1px solid rgba(0,0,0,.08);",
      "display:none;z-index:2147483001;",
      "opacity:0;transform:translateY(8px) scale(.98);",
      "transition:opacity .2s ease, transform .2s ease;",
    ].join("")
  );

  var iframe = el(
    "iframe",
    "width:100%;height:100%;border:0;display:block;background:#fff;",
    {
      src: base + "/embed",
      title: "DEGOONY Sales Intelligence",
      allow: "clipboard-write",
    }
  );

  var close = el(
    "button",
    [
      "position:absolute;top:8px;right:8px;width:32px;height:32px;",
      "border-radius:50%;border:none;background:rgba(255,255,255,.92);",
      "cursor:pointer;display:flex;align-items:center;justify-content:center;",
      "box-shadow:0 2px 8px rgba(0,0,0,.18);z-index:2;padding:0;",
    ].join(""),
    { type: "button", "aria-label": "Close chat" }
  );
  close.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  panel.appendChild(iframe);
  panel.appendChild(close);

  var open = false;

  function setOpen(v) {
    open = v;
    if (v) {
      panel.style.display = "block";
      requestAnimationFrame(function () {
        panel.style.opacity = "1";
        panel.style.transform = "translateY(0) scale(1)";
      });
      btn.style.transform = "scale(0.92)";
    } else {
      panel.style.opacity = "0";
      panel.style.transform = "translateY(8px) scale(.98)";
      btn.style.transform = "";
      setTimeout(function () {
        if (!open) panel.style.display = "none";
      }, 200);
    }
  }

  btn.addEventListener("click", function () {
    setOpen(!open);
  });
  close.addEventListener("click", function (e) {
    e.stopPropagation();
    setOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && open) setOpen(false);
  });

  root.appendChild(btn);
  document.body.appendChild(root);
  document.body.appendChild(panel);
})();
