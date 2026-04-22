import { useCallback, useEffect } from "react";
import {
  useBeforeUnload,
  useBlocker,
  type BlockerFunction
} from "react-router-dom";

interface UnsavedChangesGuardOptions {
  message: string;
  when: boolean;
}

export function useUnsavedChangesGuard({
  message,
  when
}: UnsavedChangesGuardOptions) {
  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      when &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
    [when]
  );
  const blocker = useBlocker(shouldBlock);

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!when) {
          return;
        }

        event.preventDefault();
        event.returnValue = message;
      },
      [message, when]
    )
  );

  useEffect(() => {
    if (blocker.state !== "blocked") {
      return;
    }

    if (typeof window !== "undefined" && window.confirm(message)) {
      blocker.proceed();
      return;
    }

    blocker.reset();
  }, [blocker, message]);
}
