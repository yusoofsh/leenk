import {
  motion,
  type SpringOptions,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "motion/react";
import React from "react";
import * as stylex from "@stylexjs/stylex";

import { createStarShadows, shouldTrackPointer } from "~/lib/presentation";
import { mergeStylex } from "~/lib/sx";
import { useReducedMotionPreference } from "~/lib/use-reduced-motion";

type BackgroundProps = React.ComponentProps<"div">;

type StarLayerProps = {
  count: number;
  duration: number;
  seed: number;
  shouldReduceMotion: boolean;
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

const styles = stylex.create({
  content: {
    alignItems: "center",
    display: "flex",
    justifyContent: "center",
    minHeight: "100vh",
    position: "relative",
    width: "100%",
    zIndex: 10,
  },
  duplicateStar: {
    backgroundColor: "transparent",
    borderRadius: "9999px",
    position: "absolute",
    top: "2000px",
  },
  layer: {
    height: "2000px",
    left: 0,
    position: "absolute",
    top: 0,
    width: "100%",
  },
  root: {
    backgroundImage: {
      default: "radial-gradient(ellipse at bottom, #f5f5f5 0%, #fff 100%)",
      ":is(.dark *)":
        "radial-gradient(ellipse at bottom, #262626 0%, #000 100%)",
    },
    minHeight: "100vh",
    overflow: "hidden",
    position: "relative",
    transitionDuration: "200ms",
    transitionProperty: "background-color, background-image",
    width: "100%",
  },
  star: {
    backgroundColor: "transparent",
    borderRadius: "9999px",
    position: "absolute",
  },
  starField: {
    color: {
      default: "black",
      ":is(.dark *)": "white",
    },
    inset: 0,
    pointerEvents: "none",
    position: "absolute",
  },
  veil: {
    inset: 0,
    pointerEvents: "none",
    position: "absolute",
    zIndex: 1,
  },
});

function StarLayer({
  count,
  duration,
  seed,
  shouldReduceMotion,
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
      {...stylex.props(styles.layer)}
    >
      <div
        {...stylex.props(styles.star)}
        style={{ boxShadow, height: `${size}px`, width: `${size}px` }}
      />
      <div
        {...stylex.props(styles.duplicateStar)}
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
  style,
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
      data-slot="stars-background"
      onPointerLeave={resetParallax}
      onPointerMove={handlePointerMove}
      {...props}
      {...mergeStylex(stylex.props(styles.root), className, style)}
    >
      <motion.div
        aria-hidden="true"
        data-slot="star-field"
        style={{
          transform:
            shouldReduceMotion || !hasFinePointer
              ? "translate3d(0, 0, 0)"
              : parallaxTransform,
        }}
        {...stylex.props(styles.starField)}
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
        className="reading-veil"
        {...stylex.props(styles.veil)}
      />
      <div {...stylex.props(styles.content)}>{children}</div>
    </div>
  );
}

export const Background: React.FC<BackgroundProps> = ({
  className,
  ...props
}) => <StarsBackground className={className} {...props} />;
