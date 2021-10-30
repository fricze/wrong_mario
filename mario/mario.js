import {
  withLatestFrom,
  zip,
  combineLatest,
  interval,
  fromEvent,
  merge,
} from "rxjs";
import {
  scan,
  sample,
  startWith,
  mapTo,
  filter,
  map,
} from "rxjs/operators";

const keyDown$ = fromEvent(document, "keydown");
const keyUp$ = fromEvent(document, "keyup");

const [x0, y0] = [0, 0];

const leftState = merge(
  keyDown$.pipe(
    filter(({ key }) => key === "ArrowLeft"),
    mapTo({ left: true })
  ),
  keyUp$.pipe(
    filter(({ key }) => key === "ArrowLeft"),
    mapTo({ left: false })
  )
);

const rightState = merge(
  keyDown$.pipe(
    filter(({ key }) => key === "ArrowRight"),
    mapTo({ right: true })
  ),
  keyUp$.pipe(
    filter(({ key }) => key === "ArrowRight"),
    mapTo({ right: false })
  )
);

const upState = merge(
  keyDown$.pipe(
    filter(({ key }) => key === "ArrowUp"),
    mapTo({ up: true })
  ),
  keyUp$.pipe(
    filter(({ key }) => key === "ArrowUp"),
    mapTo({ up: false })
  )
);

const downState = merge(
  keyDown$.pipe(
    filter(({ key }) => key === "ArrowDown"),
    mapTo({ down: true })
  ),
  keyUp$.pipe(
    filter(({ key }) => key === "ArrowDown"),
    mapTo({ down: false })
  )
);

const keys = merge(leftState, rightState, upState, downState).pipe(
  startWith({ up: false, left: false, down: false, right: false }),
  scan((acc, ev) => ({ ...acc, ...ev }))
);

// interval(300)
//   .pipe(withLatestFrom(keys))
//   .subscribe(([_, a]) => console.log(a));

// const position = merge(arrowLeft, arrowRight, arrowDown, arrowUp)
//   .pipe(
//     startWith([x0, y0]),
//     scan(([x0, y0], [x, y]) => [x0 + x, y0 + y])
//   )
//   .subscribe(([x, y]) => {
//     window.player.style.left = x + "px";
//     window.player.style.top = y + "px";
//   });
