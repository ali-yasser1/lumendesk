// shared date and time helpers so every view formats values the same way

const fullDate = { day: "numeric", month: "short", year: "numeric" };

// formats a date string as readable text, full date unless other options are given
export const formatDate = (value, options = fullDate) =>
  new Intl.DateTimeFormat("en-GB", options).format(new Date(`${value}T00:00:00`));

// formats a time string such as 14:30 as a readable time
export const formatTime = (value) => {
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" })
    .format(new Date(2000, 0, 1, hour, minute));
};

// returns today as a date string the date input understands
export const today = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};
