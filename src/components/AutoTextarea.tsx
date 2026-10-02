"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, type TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string };

/** A textarea that grows with its content. */
const AutoTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoTextarea(props, ref) {
  const inner = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => inner.current!);

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [props.value]);

  return <textarea ref={inner} rows={1} {...props} />;
});

export default AutoTextarea;
