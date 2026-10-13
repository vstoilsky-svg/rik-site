const COUNTER_ID = 112649563;

export type MetrikaGoal = "request_success" | "project_success" | "phone_click" | "email_click";

export function trackGoal(goal: MetrikaGoal) {
  if (window.__rikMetrikaLoaded && window.ym) window.ym(COUNTER_ID, "reachGoal", goal);
}

export function trackPageView(pathname: string) {
  if (window.__rikMetrikaLoaded && window.ym) {
    // Передаём только адрес страницы: без значений форм и параметров URL.
    window.ym(COUNTER_ID, "hit", window.location.origin + pathname);
  }
}
