
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthGridDates(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const leadingDays = (firstOfMonth.getDay() + 6) % 7;
  const weekCount = Math.ceil((leadingDays + daysInMonth) / 7);

  const dates = [];
  for (let i = 0; i < weekCount * 7; i++) {
    dates.push(new Date(year, month, 1 - leadingDays + i));
  }
  return dates;
}

function createNavButton(label, ariaLabel) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "calendar-nav-button";
  button.textContent = label;
  button.setAttribute("aria-label", ariaLabel);
  return button;
}

export function createCalendar(container) {
  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();

  const title = document.createElement("h2");
  title.className = "calendar-title";

  const header = document.createElement("div");
  header.className = "calendar-header";
  const prevButton = createNavButton("‹", "Previous month");
  const nextButton = createNavButton("›", "Next month");
  const todayButton = createNavButton("Today", "Go to today");
  todayButton.classList.add("calendar-today-button");

  prevButton.addEventListener("click", () => changeMonth(-1));
  nextButton.addEventListener("click", () => changeMonth(1));
  todayButton.addEventListener("click", () => {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    render();
  });

  header.append(title, prevButton, nextButton, todayButton);

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

  // Moves the view forward or back by a number of months. The Date constructor
  // handles rolling over into the next or previous year.
  function changeMonth(offset) {
    const target = new Date(viewYear, viewMonth + offset, 1);
    viewYear = target.getFullYear();
    viewMonth = target.getMonth();
    render();
  }

  function render() {
    const todayKey = toDateKey(new Date());

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

      if (cell.dataset.date === todayKey) {
        cell.classList.add("is-today");
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
