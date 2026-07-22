export const ANIMATIONS = {
  float: { animate: { y: [0, -15, 0] }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const } },
  pulse: { animate: { scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }, transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" as const } },
  spin: { animate: { rotate: 360 }, transition: { duration: 8, repeat: Infinity, ease: "linear" as const } },
  pop: { animate: { scale: [0.8, 1.1, 1] }, transition: { duration: 0.5, type: "spring" as const, bounce: 0.6, repeat: Infinity, repeatDelay: 1 } },
  flip: { animate: { rotateY: 360 }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const, repeatDelay: 1 } }
};
