/* AiProtocol analytics: GA4 events, UTM capture, optional Meta Pixel / Yandex Metrika. */
(function () {
  var cfg = window.AIP_CONFIG || {};
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () { window.dataLayer.push(arguments); };
  }
  // Load GA4 on pages that don't have the inline snippet yet.
  if (cfg.ga4Id && !document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + cfg.ga4Id;
    document.head.appendChild(g);
    gtag('js', new Date());
    gtag('config', cfg.ga4Id);
  }

  // Meta Pixel (only when configured)
  if (cfg.metaPixelId) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', cfg.metaPixelId);
    fbq('track', 'PageView');
  }

  // Yandex Metrika (only when configured)
  if (cfg.yandexMetrikaId) {
    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0];
    k.async=1;k.src=r;a.parentNode.insertBefore(k,a)})
    (window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    ym(Number(cfg.yandexMetrikaId), 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
  }

  function ymGoal(name, params) {
    if (cfg.yandexMetrikaId && typeof window.ym === 'function') ym(Number(cfg.yandexMetrikaId), 'reachGoal', name, params);
  }

  // ---- UTM capture (first touch per session, falls back to localStorage last touch) ----
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', 'yclid'];
  var STORE = 'aip_utm';
  try {
    var qs = new URLSearchParams(window.location.search), found = {}, any = false;
    UTM_KEYS.forEach(function (k) { var v = qs.get(k); if (v) { found[k] = v.slice(0, 200); any = true; } });
    if (any) {
      found.landing_page = window.location.pathname;
      found.captured_at = new Date().toISOString();
      localStorage.setItem(STORE, JSON.stringify(found));
    }
    if (!localStorage.getItem(STORE + '_ref') && document.referrer && document.referrer.indexOf(location.host) === -1) {
      localStorage.setItem(STORE + '_ref', document.referrer.slice(0, 300));
    }
  } catch (e) { /* storage blocked */ }

  window.aipGetUtm = function () {
    var out = {};
    try { out = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) {}
    UTM_KEYS.forEach(function (k) { if (!out[k]) out[k] = ''; });
    try { out.referrer = localStorage.getItem(STORE + '_ref') || ''; } catch (e) { out.referrer = ''; }
    out.page_url = window.location.href.split('#')[0];
    out.page_lang = document.documentElement.lang || '';
    return out;
  };

  // ---- Lead event (called by form handlers after a successful submit) ----
  window.aipTrackLead = function (formId, extra) {
    var u = window.aipGetUtm();
    var p = Object.assign({
      form_id: formId || 'unknown',
      page_lang: u.page_lang,
      utm_source: u.utm_source, utm_medium: u.utm_medium, utm_campaign: u.utm_campaign
    }, extra || {});
    gtag('event', 'generate_lead', p);
    if (typeof window.fbq === 'function') fbq('track', 'Lead', { content_name: p.form_id });
    ymGoal('generate_lead', p);
  };

  // ---- Click tracking (delegated) ----
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var location_ = (a.closest('[id]') || {}).id || '';
    if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/i.test(href)) {
      gtag('event', 'click_whatsapp', { link_url: href.split('?')[0], click_location: location_ });
      if (typeof window.fbq === 'function') fbq('track', 'Contact', { method: 'whatsapp' });
      ymGoal('click_whatsapp');
    } else if (/^tel:/i.test(href)) {
      gtag('event', 'click_phone', { phone: href.slice(4), click_location: location_ });
      if (typeof window.fbq === 'function') fbq('track', 'Contact', { method: 'phone' });
      ymGoal('click_phone');
    } else if (/^mailto:/i.test(href)) {
      gtag('event', 'click_email', { click_location: location_ });
      ymGoal('click_email');
    } else if (a.classList.contains('lang-link')) {
      gtag('event', 'language_switch', {
        from_lang: document.documentElement.lang || '',
        to_lang: a.getAttribute('hreflang') || a.getAttribute('lang') || a.textContent.trim().toLowerCase()
      });
    } else if (/^https?:\/\//i.test(href)) {
      try {
        var url = new URL(href);
        if (url.host !== location.host && url.host !== 'aiprotocol.kz' && url.host !== 'www.aiprotocol.kz') {
          gtag('event', 'click_outbound', { link_url: url.origin + url.pathname, link_domain: url.host, outbound: true });
        }
      } catch (err) {}
    }
  }, true);
})();
