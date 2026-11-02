const GOOGLE_MAPS_HOSTS = new Set([
  'maps.app.goo.gl',
  'goo.gl',
  'google.com',
  'maps.google.com',
]);

const hostOf = (url: URL) => url.hostname.replace(/^www\./, '');

export const isGoogleMapsUrl = (url: URL) => {
  const host = hostOf(url);
  return GOOGLE_MAPS_HOSTS.has(host) || host.endsWith('.google.com');
};

export const buildGoogleMapsEmbedUrl = (value: string) => {
  const url = new URL(value);

  if (isGoogleMapsEmbedUrl(url)) return url.toString();

  const coordinates = extractCoordinates(url.toString());
  if (coordinates) {
    return `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}&output=embed`;
  }

  const query = extractGoogleMapsQuery(url);
  if (query) {
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  }

  return null;
};

const isGoogleMapsEmbedUrl = (url: URL) =>
  (hostOf(url) === 'google.com' || hostOf(url).endsWith('.google.com')) &&
  url.pathname.includes('/maps/embed');

const extractCoordinates = (value: string) => {
  const match = value.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  return { lat: match[1], lng: match[2] };
};

const extractGoogleMapsQuery = (url: URL) => {
  const queryParam = url.searchParams.get('q') || url.searchParams.get('query');
  if (queryParam?.trim()) return queryParam.trim();

  const placeMatch = url.pathname.match(/\/maps\/place\/([^/]+)/);
  if (placeMatch?.[1]) {
    return decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
  }

  return null;
};
