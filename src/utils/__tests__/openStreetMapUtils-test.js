import { reverseGeocodeOpenStreetMap } from '../openStreetMapUtils';

describe('OpenStreetMap reverse geocoding', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns the address for the selected coordinates in French', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ display_name: 'Paris, France' }),
    });

    await expect(reverseGeocodeOpenStreetMap(48.8566, 2.3522))
      .resolves.toBe('Paris, France');

    const [url, options] = global.fetch.mock.calls[0];
    expect(new URL(url).searchParams.get('lat')).toBe('48.8566');
    expect(new URL(url).searchParams.get('lon')).toBe('2.3522');
    expect(options.headers['Accept-Language']).toBe('fr');
  });

  test('returns null when OpenStreetMap has no address for the point', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await expect(reverseGeocodeOpenStreetMap(48.8566, 2.3522))
      .resolves.toBeNull();
  });

  test('surfaces OpenStreetMap request errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

    await expect(reverseGeocodeOpenStreetMap(48.8566, 2.3522))
      .rejects.toThrow('OpenStreetMap Error: 503');
  });
});
