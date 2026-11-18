export const reverseGeocodeOpenStreetMap = async (latitude, longitude) => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new TypeError('A valid latitude and longitude are required.');
  }

  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: { 'Accept-Language': 'fr' },
  });
  if (!response.ok) {
    throw new Error(`OpenStreetMap Error: ${response.status}`);
  }

  const place = await response.json();
  return typeof place.display_name === 'string' ? place.display_name : null;
};
