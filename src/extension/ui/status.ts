export type StatusType = 'info' | 'success' | 'error';

export interface StatusOptions {
  autoClear?: boolean;
  clearAfter?: number;
}

export function setStatus(
  element: HTMLElement | null,
  message: string,
  type: StatusType = 'info',
  options: StatusOptions = {}
): void {
  if (!element) {
    console.warn('Status element is null, cannot show status');
    return;
  }

  element.textContent = message;
  element.className = `status ${type}`;

  const { autoClear = false, clearAfter = 5000 } = options;
  if (autoClear) {
    setTimeout(() => {
      if (element) {
        element.className = 'status';
        element.textContent = '';
      }
    }, clearAfter);
  }
}

