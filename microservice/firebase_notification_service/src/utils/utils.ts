export const haversineDistance = (
  location1: { lat: number; lng: number },
  location2: { lat: number; lng: number },
): number => {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const R = 6371; 
  const lat1 = toRadians(location1.lat);
  const lng1 = toRadians(location1.lng);
  const lat2 = toRadians(location2.lat);
  const lng2 = toRadians(location2.lng);

  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; 
};
