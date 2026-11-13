import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex h-6 w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-neutral-fill">
      <SliderPrimitive.Range className="absolute h-full bg-accent" />
    </SliderPrimitive.Track>
    {/* 22px thumb with a 44px hit area around it (the ::after box). */}
    <SliderPrimitive.Thumb className="relative block size-[22px] cursor-grab rounded-full border-2 border-primary bg-card shadow-md transition-[transform,box-shadow] after:absolute after:-inset-3 after:content-[''] hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
