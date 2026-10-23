// Vercel serverless function: POST /api/lead -> Telegram message.
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID. Missing env => 204 no-op.
const MAX_BODY = 8 * 1024;
const FIELDS = {
  name: 100, phone: 40, company: 150, industry: 60, form: 40,
  utm_source: 100, utm_medium: 100, utm_campaign: 150, utm_content: 150, utm_term: 150,
  gclid: 200, fbclid: 200, yclid: 200,
  referrer: 300, page_url: 300, page_lang: 10, landing_page: 200
};
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5; // per IP per window (per warm instance; best-effort)
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > RATE_MAX;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (typeof req.body === 'string') {
      if (req.body.length > MAX_BODY) return reject(new Error('too_large'));
      try { return resolve(JSON.parse(req.body)); } catch (e) { return reject(new Error('bad_json')); }
    }
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (e) { reject(new Error('bad_json')); }
    });
    req.on('error', reject);
  });
}

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function clean(input) {
  const out = {};
  for (const [k, max] of Object.entries(FIELDS)) {
    const v = input[k];
    if (v === undefined || v === null) continue;
    const s = String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
    if (s) out[k] = s;
  }
  return out;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const len = Number(req.headers['content-length'] || 0);
  if (len > MAX_BODY) return res.status(413).json({ error: 'too_large' });

  let body;
  try { body = await readBody(req); } catch (e) {
    return res.status(e.message === 'too_large' ? 413 : 400).json({ error: e.message });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'bad_json' });

  // Honeypot: bots fill hidden "website" field -> pretend success.
  if (body.website) return res.status(204).end();

  const lead = clean(body);
  const digits = (lead.phone || '').replace(/\D/g, '');
  if (!lead.name || digits.length < 10 || digits.length > 15) {
    return res.status(422).json({ error: 'name_and_phone_required' });
  }

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  if (rateLimited(ip || 'unknown')) return res.status(429).json({ error: 'rate_limited' });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return res.status(204).end();

  const line = (label, v) => (v ? `<b>${label}:</b> ${esc(v)}\n` : '');
  const utm = [lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(' / ');
  const text =
    `🟢 <b>Новая заявка</b> (${esc(lead.form || 'form')})\n\n` +
    line('Имя', lead.name) + line('Телефон', lead.phone) + line('Компания', lead.company) +
    line('Отрасль', lead.industry && lead.industry !== 'test_drive' ? lead.industry : '') +
    line('Язык', lead.page_lang) + line('UTM', utm) + line('utm_content', lead.utm_content) +
    line('utm_term', lead.utm_term) + line('Click ID', lead.gclid || lead.fbclid || lead.yclid) +
    line('Referrer', lead.referrer) + line('Страница', lead.page_url) +
    `\n<a href="https://wa.me/${digits}">Написать в WhatsApp</a>`;

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true })
    });
    if (!r.ok) {
      console.error('telegram_error', r.status, (await r.text()).slice(0, 300));
      return res.status(502).json({ error: 'telegram_failed' });
    }
  } catch (e) {
    console.error('telegram_fetch_error', e && e.message);
    return res.status(502).json({ error: 'telegram_unreachable' });
  }
  return res.status(204).end();
};
