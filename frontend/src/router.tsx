/* oxlint-disable react/only-export-components -- router intentionally exports components and hooks as one compatibility module */
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

type Location = {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
  key: string;
};

type RouterValue = {
  location: Location;
  navigate: (to: string, replace?: boolean, state?: unknown) => void;
};

type RouteProps = {
  path?: string;
  index?: boolean;
  element?: ReactNode;
  children?: ReactNode;
};

type LinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  to: string;
  replace?: boolean;
  state?: unknown;
};

const RouterContext = createContext<RouterValue | null>(null);
const ParamsContext = createContext<Record<string, string>>({});
const OutletContext = createContext<ReactNode>(null);

function currentLocation(): Location {
  return {
    pathname: window.location.pathname || "/",
    search: window.location.search,
    hash: window.location.hash,
    state: window.history.state,
    key: `${window.location.pathname}${window.location.search}${window.location.hash}`,
  };
}

function useRouter(): RouterValue {
  const value = useContext(RouterContext);
  if (!value) throw new Error("Router components must be rendered inside BrowserRouter");
  return value;
}

export function BrowserRouter({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Location>(currentLocation);

  useEffect(() => {
    const onPopState = () => setLocation(currentLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((to: string, replace = false, state?: unknown) => {
    const url = new URL(to, window.location.href);
    if (url.origin !== window.location.origin) {
      window.location.assign(url.href);
      return;
    }
    const next = `${url.pathname}${url.search}${url.hash}`;
    if (replace) window.history.replaceState(state ?? null, "", next);
    else window.history.pushState(state ?? null, "", next);
    setLocation(currentLocation());
  }, []);

  const value = useMemo(() => ({ location, navigate }), [location, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const normalize = (value: string) => {
    const decoded = decodeURIComponent(value);
    return decoded.length > 1 && decoded.endsWith("/") ? decoded.slice(0, -1) : decoded;
  };
  const expected = normalize(pattern).split("/").filter(Boolean);
  const actual = normalize(pathname).split("/").filter(Boolean);
  if (expected.length !== actual.length) return null;

  const params: Record<string, string> = {};
  for (let index = 0; index < expected.length; index += 1) {
    const segment = expected[index];
    const value = actual[index];
    if (segment.startsWith(":")) params[segment.slice(1)] = value;
    else if (segment !== value) return null;
  }
  return params;
}

function routeElements(children: ReactNode): ReactElement<RouteProps>[] {
  return Children.toArray(children).filter(
    (child): child is ReactElement<RouteProps> => isValidElement<RouteProps>(child),
  );
}

export function Routes({ children }: { children: ReactNode }) {
  const { location } = useRouter();
  const topLevel = routeElements(children);
  const layoutRoute = topLevel.find((route) => !route.props.path && !route.props.index);
  const candidates = layoutRoute ? routeElements(layoutRoute.props.children) : topLevel;

  let selected: ReactNode = null;
  let params: Record<string, string> = {};
  for (const route of candidates) {
    if (route.props.index && location.pathname === "/") {
      selected = route.props.element ?? null;
      break;
    }
    if (!route.props.path) continue;
    const matched = matchPath(route.props.path, location.pathname);
    if (matched) {
      selected = route.props.element ?? null;
      params = matched;
      break;
    }
  }

  const content = layoutRoute?.props.element ?? selected;
  return (
    <ParamsContext.Provider value={params}>
      <OutletContext.Provider value={layoutRoute ? selected : null}>
        {content}
      </OutletContext.Provider>
    </ParamsContext.Provider>
  );
}

export function Route(_props: RouteProps) {
  return null;
}

export function Outlet() {
  return useContext(OutletContext);
}

export function Link({
  to,
  replace = false,
  state,
  onClick,
  target,
  download,
  children,
  ...props
}: LinkProps) {
  const { navigate } = useRouter();
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.altKey
      || event.ctrlKey
      || event.shiftKey
      || target === "_blank"
      || download
    ) return;

    const url = new URL(to, window.location.href);
    if (url.origin !== window.location.origin) return;
    event.preventDefault();
    navigate(to, replace, state);
  };

  return (
    <a href={to} target={target} download={download} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}

export function useLocation(): Location {
  return useRouter().location;
}

export function useParams(): Record<string, string | undefined> {
  return useContext(ParamsContext);
}
