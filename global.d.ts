import * as P5 from "p5";
import * as p5Global from "p5/global";

export = P5;
export as namespace p5;

declare global {
  interface Window {
    p5: typeof P5;
  }
}
