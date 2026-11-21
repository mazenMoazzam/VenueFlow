import { toDateKey } from "./calendar.js";
import { showErrors, clearErrors } from "./form-errors.js";

const dueDateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json" }
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error((body.errors || ["Something went wrong."]).join("\n"));
  }

  return body;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isOverdue(task) {
  return !task.completed_at && task.due_date !== null && task.due_date < toDateKey(new Date());
}

function describeDueDate(task) {
  if (!task.due_date) {
    return "No due date";
  }

  const label = `Due ${dueDateFormat.format(parseDateKey(task.due_date))}`;
  return isOverdue(task) ? `Overdue · ${label}` : label;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function createField(labelText, control) {
  const label = createElement("label", "form-field");
  label.append(createElement("span", null, labelText), control);
  return label;
}

function createTaskForm(events) {
  const form = createElement("form", "task-form");
  form.noValidate = true;

  const errorList = createElement("ul", "form-errors");
  errorList.setAttribute("role", "alert");
  errorList.hidden = true;

  const titleInput = createElement("input");
  titleInput.name = "title";
  titleInput.required = true;
  titleInput.placeholder = "e.g. Book caterer";

  const eventSelect = createElement("select");
  eventSelect.name = "event_id";
  eventSelect.append(
    ...events.map((event) => {
      const option = createElement("option", null, event.name);
      option.value = event.id;
      return option;
    })
  );

  const dueDateInput = createElement("input");
  dueDateInput.name = "due_date";
  dueDateInput.type = "date";

  const submitButton = createElement("button", "button button-primary", "Add task");
  submitButton.type = "submit";

  form.append(
    errorList,
    createField("Task", titleInput),
    createField("Event", eventSelect),
    createField("Due date", dueDateInput),
    submitButton
  );

  return { form, errorList, submitButton, titleInput, dueDateInput };
}

function createTaskItem(task, onToggle) {
  const item = createElement("li", "task-item");
  item.classList.toggle("is-overdue", isOverdue(task));
  item.classList.toggle("is-complete", Boolean(task.completed_at));

  const checkbox = createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = Boolean(task.completed_at);
  checkbox.setAttribute("aria-label", `Mark "${task.title}" complete`);
  checkbox.addEventListener("change", () => onToggle(task, checkbox));

  item.append(
    checkbox,
    createElement("span", "task-title", task.title),
    createElement("span", "task-meta", `${task.event_name} · ${describeDueDate(task)}`)
  );

  return item;
}

export async function createTaskPanel(container) {
  const listArea = createElement("div");
  container.append(listArea);

  let events;
  try {
    events = await requestJson("/api/events");
  } catch {
    listArea.append(createElement("p", "panel-empty", "Unable to load tasks."));
    return;
  }

  if (events.length === 0) {
    listArea.append(createElement("p", "panel-empty", "Create an event to start adding tasks."));
    return;
  }

  const taskForm = createTaskForm(events);
  const list = createElement("ul", "task-list");
  container.insertBefore(taskForm.form, listArea);

  async function toggleTask(task, checkbox) {
    checkbox.disabled = true;
    try {
      await requestJson(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: checkbox.checked })
      });
      await renderTasks();
    } catch {
      checkbox.checked = !checkbox.checked;
      checkbox.disabled = false;
    }
  }

  async function renderTasks() {
    const tasks = await requestJson("/api/tasks");
    list.replaceChildren(...tasks.map((task) => createTaskItem(task, toggleTask)));
    listArea.replaceChildren(
      tasks.length > 0 ? list : createElement("p", "panel-empty", "No tasks yet.")
    );
  }

  async function addTask(submission) {
    submission.preventDefault();
    taskForm.submitButton.disabled = true;
    clearErrors(taskForm.errorList);

    try {
      await requestJson("/api/tasks", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(taskForm.form)))
      });
      taskForm.titleInput.value = "";
      taskForm.dueDateInput.value = "";
      await renderTasks();
    } catch (error) {
      showErrors(taskForm.errorList, error.message.split("\n"));
    } finally {
      taskForm.submitButton.disabled = false;
    }
  }

  taskForm.form.addEventListener("submit", addTask);

  try {
    await renderTasks();
  } catch {
    listArea.replaceChildren(createElement("p", "panel-empty", "Unable to load tasks."));
  }
}
