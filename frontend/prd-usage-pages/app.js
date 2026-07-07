function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1700);
}

document.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  if (!action) return;

  const message = action.dataset.message || `${action.textContent.trim()} 처리`;
  showToast(message);

  if (action.dataset.toggleTarget) {
    const target = document.querySelector(action.dataset.toggleTarget);
    if (target) target.classList.toggle("active");
  }
});
