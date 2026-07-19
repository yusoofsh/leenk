import {
  motion,
  type SpringOptions,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "motion/react";
import React from "react";

import { createStarShadows, shouldTrackPointer } from "~/lib/presentation";
import { useReducedMotionPreference } from "~/lib/use-reduced-motion";
import { cn } from "~/lib/utils";

type BackgroundProps = React.ComponentProps<"div">;

type StarLayerProps = {
  count: number;
  duration: number;
  shouldReduceMotion: boolean;
  seed: number;
  size: number;
};

type StarsBackgroundProps = React.ComponentProps<"div"> & {
  factor?: number;
  speed?: number;
  transition?: SpringOptions;
};

const defaultSpringTransition: SpringOptions = {
  damping: 20,
  stiffness: 50,
};

const easeOut = [0.23, 1, 0.32, 1] as const;

function StarLayer({
  count,
  duration,
  shouldReduceMotion,
  seed,
  size,
}: StarLayerProps) {
  const [boxShadow, setBoxShadow] = React.useState("");

  React.useEffect(() => {
    setBoxShadow(createStarShadows(count, seed));
  }, [count, seed]);

  const isReady = boxShadow.length > 0;

  return (
    <motion.div
      animate={{
        opacity: isReady ? 1 : 0,
        transform: shouldReduceMotion
          ? "translate3d(0, 0, 0)"
          : "translate3d(0, -2000px, 0)",
      }}
      aria-hidden="true"
      className="absolute top-0 left-0 h-[2000px] w-full"
      data-slot="star-layer"
      initial={{ opacity: 0, transform: "translate3d(0, 0, 0)" }}
      transition={{
        opacity: { duration: 0.2, ease: easeOut },
        transform: shouldReduceMotion
          ? { duration: 0 }
          : {
              duration,
              ease: "linear",
              repeat: Infinity,
              repeatType: "loop",
            },
      }}
    >
      <div
        className="absolute rounded-full bg-transparent"
        style={{ boxShadow, height: `${size}px`, width: `${size}px` }}
      />
      <div
        className="absolute top-[2000px] rounded-full bg-transparent"
        style={{ boxShadow, height: `${size}px`, width: `${size}px` }}
      />
    </motion.div>
  );
}

function StarsBackground({
  children,
  className,
  factor = 0.05,
  speed = 50,
  transition = defaultSpringTransition,
  ...props
}: StarsBackgroundProps) {
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);
  const springX = useSpring(offsetX, transition);
  const springY = useSpring(offsetY, transition);
  const parallaxTransform = useMotionTemplate`translate3d(${springX}px, ${springY}px, 0)`;
  const shouldReduceMotion = useReducedMotionPreference();
  const [hasFinePointer, setHasFinePointer] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updatePointerCapability = () => {
      setHasFinePointer(mediaQuery.matches);
    };

    updatePointerCapability();
    mediaQuery.addEventListener("change", updatePointerCapability);

    return () => {
      mediaQuery.removeEventListener("change", updatePointerCapability);
    };
  }, []);

  React.useEffect(() => {
    if (shouldReduceMotion || !hasFinePointer) {
      offsetX.set(0);
      offsetY.set(0);
    }
  }, [hasFinePointer, offsetX, offsetY, shouldReduceMotion]);

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (
        !shouldTrackPointer(
          event.pointerType,
          hasFinePointer,
          shouldReduceMotion,
        )
      ) {
        return;
      }

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      offsetX.set(-(event.clientX - centerX) * factor);
      offsetY.set(-(event.clientY - centerY) * factor);
    },
    [factor, hasFinePointer, offsetX, offsetY, shouldReduceMotion],
  );

  const resetParallax = React.useCallback(() => {
    offsetX.set(0);
    offsetY.set(0);
  }, [offsetX, offsetY]);

  return (
    <div
      className={cn(
        "relative min-h-screen w-full overflow-hidden bg-[radial-gradient(ellipse_at_bottom,_#f5f5f5_0%,_#fff_100%)] transition-colors duration-200 dark:bg-[radial-gradient(ellipse_at_bottom,_#262626_0%,_#000_100%)]",
        className,
      )}
      data-slot="stars-background"
      onPointerLeave={resetParallax}
      onPointerMove={handlePointerMove}
      {...props}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 text-black dark:text-white"
        data-slot="star-field"
        style={{
          transform:
            shouldReduceMotion || !hasFinePointer
              ? "translate3d(0, 0, 0)"
              : parallaxTransform,
        }}
      >
        <StarLayer
          count={900}
          duration={speed}
          seed={101}
          shouldReduceMotion={shouldReduceMotion}
          size={2}
        />
        <StarLayer
          count={600}
          duration={speed * 2}
          seed={202}
          shouldReduceMotion={shouldReduceMotion}
          size={4}
        />
        <StarLayer
          count={300}
          duration={speed * 3}
          seed={303}
          shouldReduceMotion={shouldReduceMotion}
          size={6}
        />
      </motion.div>
      <div
        aria-hidden="true"
        className="reading-veil pointer-events-none absolute inset-0 z-[1]"
      />
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export const Background: React.FC<BackgroundProps> = ({
  className,
  ...props
}) => <StarsBackground className={className} {...props} />;
