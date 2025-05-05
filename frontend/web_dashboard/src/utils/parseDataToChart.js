import { getData } from "./getData.js";
export async function parseDataToChart(
  time,
  range,
  title,
  field,
  _measurement
) {
  const rows = await getData(time, range, field, _measurement);
  console.log(rows);

  const chartData = rows.map((row, index) => {
    let tanggal;
    switch (range) {
      case "1h":
        tanggal = new Date(row._time).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });
        break;
      case "3h":
        tanggal = new Date(row._time).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });
        break;
      case "5h":
        tanggal = new Date(row._time).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });
        break;
      case "8h":
        tanggal = new Date(row._time).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });
        break;
      case "12h":
        tanggal = new Date(row._time).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });
        break;
      case "1d":
        tanggal = new Date(row._time).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });
        break;
      case "7d":
        tanggal = new Date(row._time).toLocaleTimeString("id-ID", {
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        break;
      case "30d":
        tanggal = new Date(row._time).toLocaleTimeString("id-ID", {
          weekday: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        break;
      default:
        break;
    }

    return {
      x: tanggal,
      [title]: row._value,
    };
  });

  return chartData;
}

// console.log(await parseDataToChart("60s", "7d", "gas", "gas_risk", "risks"));
