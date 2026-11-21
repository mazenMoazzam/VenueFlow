export function showErrors(errorList, messages) {
  errorList.replaceChildren(
    ...messages.map((message) => {
      const item = document.createElement("li");
      item.textContent = message;
      return item;
    })
  );
  errorList.hidden = false;
  errorList.scrollIntoView({ block: "nearest" });
}

export function clearErrors(errorList) {
  errorList.replaceChildren();
  errorList.hidden = true;
}
