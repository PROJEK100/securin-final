import fs from "fs";

// Fungsi untuk menghasilkan data dummy lokasi
export const generateDummyLocationData = (
  vehicleId = "DUMMY123",
  count = 1000
) => {
  const baseLat = -7.28569;
  const baseLng = 112.801144;
  const startTime = new Date("2025-05-02T14:00:00.000Z");
  const result = [];

  const seed =
    [...String(vehicleId)].reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    100;

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(startTime.getTime() + i * 1000).toISOString();
    const noiseFactor = ((Math.sin(i + seed) + 1) / 2) * 0.00001;
    const lat = baseLat + (Math.random() - 0.5) * noiseFactor;
    const lng = baseLng + (Math.random() - 0.5) * noiseFactor;
    result.push([vehicleId, "0", timestamp, lat.toString(), lng.toString()]);
  }

  return result;
};

// Simpan ke file (optional)
// console.log(
//   "Generating dummy location data...",
//   generateDummyLocationData(5000)
// );
