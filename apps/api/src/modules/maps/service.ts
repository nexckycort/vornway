const GOOGLE_MAPS_HOSTS = new Set([
  'maps.app.goo.gl',
  'goo.gl',
  'google.com',
  'maps.google.com',
  'www.google.com',
]);

type ResolveMapUrlResult = {
  originalUrl: string;
  resolvedUrl: string;
  embedUrl: string | null;
};

export async function resolveGoogleMapsUrl(
  inputUrl: string,
): Promise<ResolveMapUrlResult> {
  const url = new URL(inputUrl);
  const host = url.hostname.replace(/^www\./, '');

  if (!GOOGLE_MAPS_HOSTS.has(host) && !host.endsWith('.google.com')) {
    throw new Error('Solo se permiten enlaces de Google Maps');
  }

  const resolvedUrl = await getResolvedUrl(inputUrl);
  const embedUrl = buildGoogleMapsEmbedUrl(resolvedUrl);

  return {
    originalUrl: inputUrl,
    resolvedUrl,
    embedUrl,
  };
}

async function getResolvedUrl(inputUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(inputUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    return response.url || inputUrl;
  } finally {
    clearTimeout(timeout);
  }
}

function buildGoogleMapsEmbedUrl(value: string) {
  const url = new URL(value);

  if (isGoogleMapsEmbedUrl(url)) {
    return url.toString();
  }

  const coordinates = extractCoordinates(url.toString());
  if (coordinates) {
    return `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}&output=embed`;
  }

  const query = extractGoogleMapsQuery(url);
  if (query) {
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  }

  return null;
}

function isGoogleMapsEmbedUrl(url: URL) {
  const hostname = url.hostname.replace(/^www\./, '');
  return (
    (hostname === 'google.com' || hostname.endsWith('.google.com')) &&
    url.pathname.includes('/maps/embed')
  );
}

function extractCoordinates(value: string) {
  const match = value.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (!match) return null;

  return {
    lat: match[1],
    lng: match[2],
  };
}

function extractGoogleMapsQuery(url: URL) {
  const queryParam = url.searchParams.get('q') || url.searchParams.get('query');
  if (queryParam?.trim()) return queryParam.trim();

  const placeMatch = url.pathname.match(/\/maps\/place\/([^/]+)/);
  if (placeMatch?.[1]) {
    return decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
  }

  return null;
}
