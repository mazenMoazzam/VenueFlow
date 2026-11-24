import { createCalendar } from "./calendar.js";
import { createTaskPanel } from "./tasks.js";

createCalendar(document.getElementById("calendar-panel"));
createTaskPanel(document.getElementById("tasks-panel"));
