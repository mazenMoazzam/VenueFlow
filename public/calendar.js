// Month-view calendar built with plain DOM APIs.
// Weeks start on Monday to match the Figma design.

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Formats a Date as "YYYY-MM-DD" using local time, so each day cell can be
// matched to events by date later without timezone shifts.
function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Returns every date shown in the month grid, including the trailing days of
// the previous month and the leading days of the next month that fill out the
// first and last weeks.
function getMonthGridDates(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // getDay() is 0 for Sunday; shift so Monday is 0.
  const leadingDays = (firstOfMonth.getDay() + 6) % 7;
  const weekCount = Math.ceil((leadingDays + daysInMonth) / 7);

  const dates = [];
  for (let i = 0; i < weekCount * 7; i++) {
    dates.push(new Date(year, month, 1 - leadingDays + i));
  }
  return dates;
}

export function createCalendar(container) {
  const today = new Date();
  const viewYear = today.getFullYear();
  const viewMonth = today.getMonth();

  const title = document.createElement("h2");
  title.className = "calendar-title";

  const header = document.createElement("div");
  header.className = "calendar-header";
  header.append(title);

  const weekdayRow = document.createElement("div");
  weekdayRow.className = "calendar-weekdays";
  for (const name of WEEKDAYS) {
    const cell = document.createElement("div");
    cell.className = "calendar-weekday";
    cell.textContent = name;
    weekdayRow.append(cell);
  }

  const grid = document.createElement("div");
  grid.className = "calendar-grid";

  container.replaceChildren(header, weekdayRow, grid);

  function render() {
    title.textContent = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });

    const cells = getMonthGridDates(viewYear, viewMonth).map((date) => {
      const cell = document.createElement("div");
      cell.className = "calendar-day";
      cell.dataset.date = toDateKey(date);

      if (date.getMonth() !== viewMonth) {
        cell.classList.add("is-outside");
      }

      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        cell.classList.add("is-weekend");
      }

      const number = document.createElement("span");
      number.className = "calendar-day-number";
      number.textContent = date.getDate();
      cell.append(number);

      return cell;
    });

    grid.replaceChildren(...cells);
  }

  render();
}
