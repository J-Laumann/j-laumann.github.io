const FLAG = "emberheim-gm";
const PASSWORD = "emberheim";

function isUnlocked() {
  let stored = false;
  try {
    stored = sessionStorage.getItem(FLAG) === "1";
  } catch (error) {
    stored = false;
  }
  return stored || window.name.indexOf(FLAG) !== -1;
}

function setUnlocked(on) {
  try {
    if (on) sessionStorage.setItem(FLAG, "1");
    else sessionStorage.removeItem(FLAG);
  } catch (error) {
    /* file pages can refuse storage; window.name still covers this tab */
  }
  if (on) {
    if (window.name.indexOf(FLAG) === -1) window.name = `${window.name} ${FLAG}`.trim();
  } else {
    window.name = window.name.replaceAll(FLAG, "").trim();
  }
  document.documentElement.classList.toggle("gm", on);
  document.dispatchEvent(new CustomEvent("emberheim-gm", { detail: on }));
  const button = document.querySelector("#gm-lock");
  if (!button) return;
  button.setAttribute("aria-pressed", on ? "true" : "false");
  button.setAttribute("aria-label", on ? "Lock GM notes" : "Unlock GM notes");
  button.title = on ? "Lock GM notes" : "Unlock GM notes";
}

const button = document.querySelector("#gm-lock");
const gate = document.querySelector("#gm-gate");
const pass = document.querySelector("#gm-pass");
const error = document.querySelector("#gm-error");

setUnlocked(isUnlocked());

if (button && gate && pass) {
  button.addEventListener("click", () => {
    if (document.documentElement.classList.contains("gm")) {
      setUnlocked(false);
      gate.hidden = true;
      return;
    }
    gate.hidden = !gate.hidden;
    error.hidden = true;
    if (!gate.hidden) {
      pass.value = "";
      pass.focus();
    }
  });

  gate.addEventListener("submit", (event) => {
    event.preventDefault();
    if (pass.value.trim().toLowerCase() === PASSWORD) {
      setUnlocked(true);
      gate.hidden = true;
      pass.value = "";
      error.hidden = true;
      return;
    }
    error.hidden = false;
    pass.select();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".gm-slot")) gate.hidden = true;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") gate.hidden = true;
  });
}

document.querySelectorAll("summary a").forEach((link) => {
  link.addEventListener("click", (event) => event.stopPropagation());
});
