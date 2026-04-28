// Browse proxy — strips X-Frame-Options so external pages load in Botler's iframe
export default async (req) => {
  const url = new URL(req.url);
  const target = url.searchParams.get('url');
  if (!target) return new Response('Missing url param', { status: 400 });

  // Basic safety: only proxy http/https
  if (!/^https?:\/\//i.test(target)) return new Response('Invalid URL', { status: 400 });

  try {
    const resp = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': req.headers.get('Accept') || 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        // Forward cookies would break same-origin policy — skip
      },
      redirect: 'follow',
    });

    // Rebuild headers, dropping frame-blocking ones
    const headers = new Headers();
    for (const [k, v] of resp.headers.entries()) {
      const kl = k.toLowerCase();
      if (kl === 'x-frame-options') continue;
      if (kl === 'content-security-policy') continue;
      if (kl === 'content-security-policy-report-only') continue;
      if (kl === 'transfer-encoding') continue; // edge strips this anyway
      headers.set(k, v);
    }
    // Explicitly allow framing
    headers.set('X-Frame-Options', 'ALLOWALL');
    // Rewrite absolute URLs in Location redirects to go through the proxy
    if (headers.get('location')) {
      const loc = headers.get('location');
      if (/^https?:\/\//i.test(loc)) {
        headers.set('location', `/api/browse?url=${encodeURIComponent(loc)}`);
      }
    }

    return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers });
  } catch (err) {
    return new Response(`Browse proxy error: ${err.message}`, { status: 502 });
  }
};

export const config = { path: '/api/browse' };
