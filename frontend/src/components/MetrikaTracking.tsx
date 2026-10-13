import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackGoal, trackPageView } from "../lib/metrika";

export default function MetrikaTracking() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    if (previousPath.current !== pathname) trackPageView(pathname);
    previousPath.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const click = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      const href = element?.getAttribute("href") ?? "";
      if (href.startsWith("tel:")) trackGoal("phone_click");
      if (href.startsWith("mailto:")) trackGoal("email_click");
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);
  return null;
}
