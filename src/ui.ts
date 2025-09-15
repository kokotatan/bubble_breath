export const toast = (msg: string, ms = 1800) => {
  const el = document.getElementById("toast")!;
  el.textContent = msg;
  el.hidden = false;
  window.clearTimeout((el as any)._t);
  (el as any)._t = window.setTimeout(() => (el.hidden = true), ms);
};

export const setSupportMsg = (html: string) => {
  const el = document.getElementById("supportMsg")!;
  el.innerHTML = html;
};

export const toggleButtons = (inSession: boolean) => {
  const start = document.getElementById("startBtn") as HTMLButtonElement;
  const end = document.getElementById("endBtn") as HTMLButtonElement;
  start.hidden = inSession;
  end.hidden = !inSession;
  start.disabled = inSession;
};
