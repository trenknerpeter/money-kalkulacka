import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  /** Extra classes for the thumb, e.g. a focus ring that shows on a dark surface. */
  thumbClassName?: string;
};

/**
 * The focusable element is the thumb (it carries role="slider"), so the accessible name
 * and the spoken value go there, not on the wrapper.
 */
const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  (
    {
      className,
      thumbClassName,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-valuetext": ariaValueText,
      ...props
    },
    ref,
  ) => (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex h-6 w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-neutral-fill">
        <SliderPrimitive.Range className="absolute h-full bg-accent" />
      </SliderPrimitive.Track>
      {/* 22px thumb with a 44px hit area around it (the ::after box). */}
      <SliderPrimitive.Thumb
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-valuetext={ariaValueText}
        className={cn(
          "relative block size-[22px] cursor-grab rounded-full border-2 border-primary bg-card shadow-md transition-[transform,box-shadow] after:absolute after:-inset-3 after:content-[''] hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50",
          thumbClassName,
        )}
      />
    </SliderPrimitive.Root>
  ),
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
