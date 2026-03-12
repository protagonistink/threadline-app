export function buildLocalDayWindow(date: string) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);

  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  };
}
