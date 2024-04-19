import * as P5 from "p5";

export = P5;
export as namespace p5;

declare global {
  interface Window {
    p5: typeof P5;
  }
}
