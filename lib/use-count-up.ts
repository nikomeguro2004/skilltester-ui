"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";

export function useCountUp(target: number, durationMs = 900, onComplete?: () => void) {
  const [value, setValue] = useState(0);
  const objRef = useRef({ v: 0 });
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    const obj = objRef.current;
    const animation = animate(obj, {
      v: target,
      duration: durationMs,
      ease: "outExpo",
      onUpdate: () => setValue(Math.round(obj.v)),
      onComplete: () => onCompleteRef.current?.(),
    });
    return () => {
      animation.pause();
    };
  }, [target, durationMs]);

  return value;
}
