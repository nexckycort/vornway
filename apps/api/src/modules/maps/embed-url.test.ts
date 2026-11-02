import { describe, expect, test } from 'bun:test';
import { buildGoogleMapsEmbedUrl, isGoogleMapsUrl } from './embed-url';

describe('isGoogleMapsUrl', () => {
  test('accepts Google Maps hosts and their subdomains only', () => {
    expect(isGoogleMapsUrl(new URL('https://maps.app.goo.gl/abc'))).toBe(true);
    expect(
      isGoogleMapsUrl(new URL('https://www.google.com/maps/place/Paris')),
    ).toBe(true);
    expect(isGoogleMapsUrl(new URL('https://maps.google.com/x'))).toBe(true);
    expect(isGoogleMapsUrl(new URL('https://google.es/maps'))).toBe(false);
    expect(isGoogleMapsUrl(new URL('https://notgoogle.com/maps'))).toBe(false);
    expect(isGoogleMapsUrl(new URL('https://example.com/?q=google.com'))).toBe(
      false,
    );
  });
});

describe('buildGoogleMapsEmbedUrl', () => {
  test('keeps URLs that already are embeds', () => {
    const embed = 'https://www.google.com/maps/embed?pb=abc';
    expect(buildGoogleMapsEmbedUrl(embed)).toBe(embed);
  });

  test('uses the coordinates from the @lat,lng segment', () => {
    expect(
      buildGoogleMapsEmbedUrl(
        'https://www.google.com/maps/@48.8566,2.3522,15z',
      ),
    ).toBe('https://www.google.com/maps?q=48.8566,2.3522&output=embed');
  });

  test('falls back to the place name or the q parameter', () => {
    expect(
      buildGoogleMapsEmbedUrl(
        'https://www.google.com/maps/place/Torre+Eiffel/',
      ),
    ).toBe('https://www.google.com/maps?q=Torre%20Eiffel&output=embed');
    expect(
      buildGoogleMapsEmbedUrl(
        'https://www.google.com/maps/search/?q=cafe+bogota',
      ),
    ).toBe('https://www.google.com/maps?q=cafe%20bogota&output=embed');
  });

  test('is null when the URL names no place', () => {
    expect(buildGoogleMapsEmbedUrl('https://www.google.com/maps')).toBeNull();
  });
});
