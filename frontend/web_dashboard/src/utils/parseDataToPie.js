import { color } from "chart.js/helpers";
import { getData } from "./getData.js";
import generateRandomHexColor from "./getRandomColor.js";
export const parseDataToPie = async (
  time,
  range,
  title,
  field,
  _measurement
) => {
  const rows = await getData(time, range, field, _measurement);
  //   console.log(rows);
  let jumlah = 0;
  rows.map((row, index) => {
    jumlah += row._value;
  });

  jumlah = jumlah / rows.length;
  //   console.log(jumlah);
  return {
    name: title,
    value: jumlah,
    color: generateRandomHexColor(),
  };
  //   return jumlah;
};
// console.log(await parseDataToPie("60s", "7d", "gas", "gas_risk", "risks"));
