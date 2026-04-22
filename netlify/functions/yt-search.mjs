// Netlify Function — YouTube search via Innertube (no key required)
export const handler = async (event) => {
  const cors = {
    'access-control-allow-origin': '*',
    'content-type': 'application/json; charset=utf-8',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  const q = (event.queryStringParameters || {}).q || '';
  if (!q.trim()) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'q required' }) };
  }

  try {
    const res = await fetch(
      'https://www.youtube.com/youtubei/v1/search?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0' },
        body: JSON.stringify({
          query: q,
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20240101.00.00',
              hl: 'en',
              gl: 'US',
            },
          },
        }),
      }
    );

    const data = await res.json();
    const items =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents ?? [];

    const videos = [];
    for (const section of items) {
      const contents = section?.itemSectionRenderer?.contents ?? [];
      for (const item of contents) {
        const v = item?.videoRenderer;
        if (!v?.videoId) continue;
        const thumbs = (v.thumbnail?.thumbnails ?? []).map((t) => ({
          url: t.url,
          width: t.width ?? 0,
          height: t.height ?? 0,
          quality: 'medium',
        }));
        const dur = v.lengthText?.simpleText ?? '';
        let secs = 0;
        const parts = dur.split(':').map(Number);
        if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
        else if (parts.length === 2) secs = parts[0] * 60 + parts[1];
        else if (parts.length === 1) secs = parts[0];

        videos.push({
          videoId: v.videoId,
          title: v.title?.runs?.[0]?.text ?? '',
          author: v.ownerText?.runs?.[0]?.text ?? '',
          lengthSeconds: secs || null,
          videoThumbnails: thumbs,
        });
        if (videos.length >= 12) break;
      }
      if (videos.length >= 12) break;
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify(videos) };
  } catch (err) {
    return {
      statusCode: 502,
      headers: cors,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
