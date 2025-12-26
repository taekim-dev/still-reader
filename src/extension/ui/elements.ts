export function getElementById<T extends HTMLElement = HTMLElement>(
  id: string
): T | null {
  const element = document.getElementById(id);
  if (!element) {
    return null;
  }
  return element as T;
}

export function requireElementById<T extends HTMLElement = HTMLElement>(
  id: string
): T {
  const element = getElementById<T>(id);
  if (!element) {
    throw new Error(`Required element with id "${id}" not found`);
  }
  return element;
}

