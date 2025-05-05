import { getData2 } from "./getData2.js";

export async function parseDataToTable(time, startDate, endDate) {
  const rows = await getData2(
    time,
    startDate,
    endDate,
    "status",
    "system_status"
  );
  console.log(rows);

  const parsedData = rows.map((row) => {
    const dateObj = new Date(row._time);

    const date = dateObj.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeStr = dateObj.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      status: row._value,
      date: date,
      time: timeStr,
      timestamp: dateObj.getTime(),
    };
  });
  console.log(parsedData);
  return parsedData;
}
