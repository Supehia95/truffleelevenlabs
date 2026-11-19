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
    'contactus.html': 'contactus.html',
    'book-meeting.html': 'book-meeting.html'
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

  /* ---- Details collected by the agent, used to pre-fill forms ---- */
  var PREFILL_KEY = 'truffle_prefill';
  var PREFILL_FIELDS = ['name', 'email', 'company', 'topic', 'problem'];
  function getPrefill() {
    try { return JSON.parse(sessionStorage.getItem(PREFILL_KEY)) || {}; } catch (e) { return {}; }
  }
  function setPrefill(p) {
    var clean = {};
    PREFILL_FIELDS.forEach(function (k) { if (p && p[k]) clean[k] = String(p[k]).trim(); });
    try { sessionStorage.setItem(PREFILL_KEY, JSON.stringify(clean)); } catch (e) {}
    return clean;
  }
  window.TrufflePrefill = { get: getPrefill, set: setPrefill };

  function applyPrefill() {
    var data = getPrefill();
    var filled = 0;
    document.querySelectorAll('form[data-prefill]').forEach(function (form) {
      PREFILL_FIELDS.forEach(function (k) {
        var el = form.elements[k];
        if (!el || !data[k]) return;
        if (el.tagName === 'SELECT') {
          var want = data[k].toLowerCase();
          Array.prototype.some.call(el.options, function (o) {
            if (o.text.toLowerCase() === want) { el.value = o.value || o.text; filled++; return true; }
          });
        } else {
          el.value = data[k]; filled++;
        }
      });
      var note = form.querySelector('[data-prefill-note]');
      if (note && filled) {
        note.textContent = 'We filled this in from your chat. Check the details and change anything that is off.';
        note.classList.add('is-on');
      }
    });
  }

  /* Read-only card: shows the details the agent collected, nothing to edit or save. */
  function applyCard() {
    var data = getPrefill();
    document.querySelectorAll('[data-prefill-card]').forEach(function (card) {
      var any = false;
      PREFILL_FIELDS.forEach(function (k) {
        var dd = card.querySelector('[data-card-field="' + k + '"]');
        var row = card.querySelector('[data-card-row="' + k + '"]');
        if (!dd || !row) return;
        dd.textContent = data[k] || '';
        row.hidden = !data[k];
        if (data[k]) any = true;
      });
      var empty = card.querySelector('[data-card-empty]');
      if (empty) empty.hidden = any;
    });
  }

  function go(target, push) {
    load(target).then(function (doc) {
      swapIn(doc);
      applyPrefill(); applyCard();
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
  applyPrefill(); applyCard();

  /* ---- Agent client tools ---- */
  var BASE_PAGES = { contact: 'contactus.html', booking: 'book-meeting.html', claudeforce: 'claudeforce.html' };

  function openPage(key, details) {
    if (details) setPrefill(details);
    var target = BASE_PAGES[key];
    if (norm(location.pathname).split('/').pop() === target) { applyPrefill(); applyCard(); window.scrollTo(0, 0); return; }
    go(target, true);
  }

  var clientTools = {
    open_claudeforce_page: function () {
      openPage('claudeforce');
      return 'Claudeforce page opened';
    },
    open_contact_page: function (p) {
      openPage('contact', p);
      return 'Contact page opened and pre-filled';
    },
    open_booking_page: function (p) {
      openPage('booking', p);
      return 'Booking page opened and pre-filled';
    }
  };

  var widget = document.querySelector('elevenlabs-convai');
  if (widget) {
    widget.addEventListener('elevenlabs-convai:call', function (event) {
      event.detail.config.clientTools = clientTools;
    });
  }

})();

 

    