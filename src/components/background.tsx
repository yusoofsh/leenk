import { useStore } from "@nanostores/react";
import {
  type HTMLMotionProps,
  motion,
  type SpringOptions,
  type Transition,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import React from "react";

import { bioMode } from "~/lib/stores/bio-mode";
import { cn } from "~/lib/utils";
type BackgroundProps = React.ComponentProps<"div">;

type StarLayerProps = HTMLMotionProps<"div"> & {
  count?: number;
  size?: number;
  starColor?: string;
  transition?: Transition;
};

type StarsBackgroundProps = React.ComponentProps<"div"> & {
  factor?: number;
  pointerEvents?: boolean;
  speed?: number;
  starColor?: string;
  transition?: SpringOptions;
};

const defaultStarTransition: Transition = {
  duration: 50,
  ease: "linear",
  repeat: Infinity,
};

const defaultSpringTransition: SpringOptions = {
  damping: 20,
  stiffness: 50,
};

function generateStars(count: number, starColor: string) {
  const shadows: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 4000) - 2000;
    const y = Math.floor(Math.random() * 4000) - 2000;
    shadows.push(`${x}px ${y}px ${starColor}`);
  }
  return shadows.join(", ");
}

function StarLayer({
  className,
  count = 1000,
  size = 1,
  starColor = "#fff",
  transition = defaultStarTransition,
  ...props
}: StarLayerProps) {
  const [boxShadow, setBoxShadow] = React.useState<string>("");
  const shouldReduceMotion = useReducedMotion();

  React.useEffect(() => {
    setBoxShadow(generateStars(count, starColor));
  }, [count, starColor]);

  return (
    <motion.div
      animate={shouldReduceMotion ? false : { y: [0, -2000] }}
      className={cn("absolute top-0 left-0 h-[2000px] w-full", className)}
      data-slot="star-layer"
      transition={transition}
      {...props}
    >
      <div
        className="absolute rounded-full bg-transparent"
        style={{
          boxShadow: boxShadow,
          height: `${size}px`,
          width: `${size}px`,
        }}
      />
      <div
        className="absolute top-[2000px] rounded-full bg-transparent"
        style={{
          boxShadow: boxShadow,
          height: `${size}px`,
          width: `${size}px`,
        }}
      />
    </motion.div>
  );
}

function StarsBackground({
  children,
  className,
  factor = 0.05,
  pointerEvents = true,
  speed = 50,
  starColor = "#fff",
  transition = defaultSpringTransition,
  ...props
}: StarsBackgroundProps) {
  const offsetX = useMotionValue(1);
  const offsetY = useMotionValue(1);
  const shouldReduceMotion = useReducedMotion();

  const springX = useSpring(offsetX, transition);
  const springY = useSpring(offsetY, transition);

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (shouldReduceMotion) {
        return;
      }

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const newOffsetX = -(event.clientX - centerX) * factor;
      const newOffsetY = -(event.clientY - centerY) * factor;
      offsetX.set(newOffsetX);
      offsetY.set(newOffsetY);
    },
    [factor, offsetX, offsetY, shouldReduceMotion],
  );

  return (
    <div
      className={cn(
        "relative min-h-screen w-full overflow-hidden bg-[radial-gradient(ellipse_at_bottom,_#262626_0%,_#000_100%)]",
        className,
      )}
      data-slot="stars-background"
      onPointerMove={handlePointerMove}
      {...props}
    >
      <motion.div
        className={cn({ "pointer-events-none": !pointerEvents })}
        style={shouldReduceMotion ? {} : { x: springX, y: springY }}
      >
        <StarLayer
          count={900}
          size={2}
          starColor={starColor}
          transition={{ duration: speed, ease: "circInOut", repeat: Infinity }}
        />
        <StarLayer
          count={600}
          size={4}
          starColor={starColor}
          transition={{
            duration: speed * 2,
            ease: "circInOut",
            repeat: Infinity,
          }}
        />
        <StarLayer
          count={300}
          size={6}
          starColor={starColor}
          transition={{
            duration: speed * 3,
            ease: "circInOut",
            repeat: Infinity,
          }}
        />
      </motion.div>
      {children}
    </div>
  );
}

export const Background: React.FC<BackgroundProps> = ({
  className,
  ...props
}) => {
  const mode = useStore(bioMode);

  const starColor = mode === "tldr" ? "#FFF" : "#000";

  return (
    <StarsBackground
      className={cn(
        "flex items-center justify-center rounded-xl",
        "bg-[radial-gradient(ellipse_at_bottom,_#f5f5f5_0%,_#fff_100%)] dark:bg-[radial-gradient(ellipse_at_bottom,_#262626_0%,_#000_100%)]",
        className,
      )}
      starColor={starColor}
      {...props}
    />
  );
};
