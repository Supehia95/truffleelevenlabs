/* Shared site behaviour: standard footer, one persistent ElevenLabs widget,
   and in-place page navigation so the widget (and its conversation) is never
   destroyed when a visitor moves between pages. */
(function () {
  'use strict';

  var AGENT_ID = 'agent_4501m75j2mbsentr122hcn6h6a15';
  var WIDGET_SRC = 'https://unpkg.com/@elevenlabs/convai-widget-embed';

  /* Links that count as "this site". Keys are hrefs (production URLs or local
     files); values are the page that is loaded in place. Anything not listed
     (case studies, blog, careers, social, mailto) navigates normally. */
  var ROUTES = {
    'https://www.trufflecorp.com': 'index.html',
    'https://www.trufflecorp.com/': 'index.html',
    'https://www.trufflecorp.com/claude-for-salesforce': 'claudeforce.html',
    'https://www.trufflecorp.com/contact': 'contactus.html',
    'index.html': 'index.html',
    'claudeforce.html': 'claudeforce.html',
    'contactus.html': 'contactus.html'
  };

  function norm(href) { return href.replace(/[?#].*$/, ''); }

  function routeFor(a) {
    var raw = a.getAttribute('href');
    if (!raw || raw.charAt(0) === '#') return null;
    if (ROUTES[norm(raw)]) return ROUTES[norm(raw)];
    var u;
    try { u = new URL(raw, location.href); } catch (e) { return null; }
    if (u.origin !== location.origin) return null;
    var file = u.pathname.split('/').pop() || 'index.html';
    return ROUTES[file] || null;
  }

  /* ---- Footer (single source: footer.html) ---- */
  function loadFooter() {
    var slot = document.getElementById('site-footer');
    if (!slot) return;
    fetch('footer.html').then(function (r) { return r.text(); }).then(function (html) {
      slot.innerHTML = html;
    });
  }

  /* ---- Widget: added once, lives outside the swapped regions ---- */
  function mountWidget() {
    if (!document.querySelector('elevenlabs-convai')) {
      var w = document.createElement('elevenlabs-convai');
      w.setAttribute('agent-id', AGENT_ID);
      w.setAttribute('persistent-session', 'true');
      document.body.appendChild(w);
    }
    if (!document.querySelector('script[data-convai]')) {
      var s = document.createElement('script');
      s.src = WIDGET_SRC; s.async = true; s.type = 'text/javascript';
      s.setAttribute('data-convai', '');
      document.body.appendChild(s);
    }
  }

  /* ---- In-place navigation ---- */
  function runInlineScripts(doc) {
    doc.querySelectorAll('body script:not([src])').forEach(function (old) {
      var s = document.createElement('script');
      s.textContent = old.textContent;
      document.body.appendChild(s);
      s.remove();
    });
  }

  function swapIn(doc) {
    document.title = doc.title;
    // Page styles: add the new sheet first, then drop the old one (no flash).
    var oldStyle = document.querySelector('style[data-page]') || document.querySelector('head style');
    var newStyle = doc.querySelector('head style');
    if (newStyle) {
      var st = document.createElement('style');
      st.setAttribute('data-page', '');
      st.textContent = newStyle.textContent;
      document.head.appendChild(st);
      if (oldStyle) oldStyle.remove();
    }
    ['header', 'main'].forEach(function (tag) {
      var cur = document.body.querySelector(':scope > ' + tag);
      var next = doc.body.querySelector(':scope > ' + tag);
      if (cur && next) cur.replaceWith(document.importNode(next, true));
    });
    runInlineScripts(doc);
  }

  var cache = {};
  function load(target) {
    if (cache[target]) return Promise.resolve(cache[target]);
    return fetch(target).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (t) {
      var doc = new DOMParser().parseFromString(t, 'text/html');
      cache[target] = doc;
      return doc;
    });
  }

  function go(target, push) {
    load(target).then(function (doc) {
      swapIn(doc);
      if (push) history.pushState({ page: target }, '', target);
      window.scrollTo(0, 0);
    }).catch(function () {
      location.href = target; // fall back to a normal page load
    });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var target = routeFor(a);
    if (!target) return;
    e.preventDefault();
    if (norm(location.pathname).split('/').pop() === target) { window.scrollTo(0, 0); return; }
    go(target, true);
  });

  window.addEventListener('popstate', function () {
    var file = location.pathname.split('/').pop() || 'index.html';
    go(ROUTES[file] || 'index.html', false);
  });

  history.replaceState({ page: location.pathname.split('/').pop() || 'index.html' }, '');
  loadFooter();
  mountWidget();


  function open_contact_page(pageName){
    alert('open_contact_page',pageName);
  }
})();
