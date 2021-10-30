import {
  withLatestFrom,
  zip,
  combineLatest,
  interval,
  fromEvent,
  merge,
} from "rxjs";
import {
  distinctUntilChanged,
  scan,
  sample,
  startWith,
  mapTo,
  filter,
  map,
} from "rxjs/operators";

const keyDown$ = fromEvent(document, "keydown");
const keyUp$ = fromEvent(document, "keyup");

const [x0, y0] = [0, 200];

const leftState = merge(
  keyDown$.pipe(
    filter(({ key }) => key === "ArrowLeft"),
    mapTo({ playerMove: [-2, 0], moving: true, transform: -1 })
  ),
  keyUp$.pipe(
    filter(({ key }) => key === "ArrowLeft"),
    mapTo({ playerMove: [0, 0], moving: false, transform: -1 })
  )
).pipe(startWith({ playerMove: [0, 0], moving: false, transform: -1 }));

const rightState = merge(
  keyDown$.pipe(
    filter(({ key }) => key === "ArrowRight"),
    mapTo({ playerMove: [2, 0], moving: true, transform: 1 })
  ),
  keyUp$.pipe(
    filter(({ key }) => key === "ArrowRight"),
    mapTo({ playerMove: [0, 0], moving: false, transform: 1 })
  )
).pipe(startWith({ playerMove: [0, 0], moving: false, transform: 1 }));

const upState = merge(
  keyDown$.pipe(
    filter(({ key }) => key === "ArrowUp"),
    mapTo({ playerMove: [0, -2] })
  ),
  keyUp$.pipe(
    filter(({ key }) => key === "ArrowUp"),
    mapTo({ playerMove: [0, 0] })
  )
).pipe(startWith({ playerMove: [0, 0] }));

const downState = merge(
  keyDown$.pipe(
    filter(({ key }) => key === "ArrowDown"),
    mapTo({ playerMove: [0, 2] })
  ),
  keyUp$.pipe(
    filter(({ key }) => key === "ArrowDown"),
    mapTo({ playerMove: [0, 0] })
  )
).pipe(startWith({ playerMove: [0, 0] }));

const moves = combineLatest(leftState, rightState, upState, downState).pipe(
  map((all) => all.map(({ playerMove }) => playerMove)),
  map((moves) =>
    moves.reduce((acc, move) => [acc[0] + move[0], acc[1] + move[1]], [0, 0])
  )
);

const sampledMoves = interval(16).pipe(
  withLatestFrom(moves),
  map(([_, move]) => move)
);

const sampledMoveLeft = interval(16).pipe(
  withLatestFrom(leftState),
  map(([_, move]) => move)
);

const sampledImage = interval(16 * 30).pipe(
  startWith(1),
  scan((acc, _) => (acc >= 4 ? 1 : acc + 1)),
  map((i) => `mario${i}`),
  withLatestFrom(
    merge(
      rightState.pipe(map(({ moving }) => moving)),
      leftState.pipe(map(({ moving }) => moving))
    )
  ),
  map(([image, moving]) => (moving ? image : "mario0")),
  distinctUntilChanged()
);

const sampledTransformX = interval(16 * 10).pipe(
  withLatestFrom(
    merge(
      rightState.pipe(map(({ transform }) => transform)),
      leftState.pipe(map(({ transform }) => transform))
    ).pipe(startWith(0))
  ),
  map(([i, t]) => {
    const s = (i % 4) / 10;
    const v = (Math.abs(t) + s) * t;
    return `scaleX(${v})`;
  }),
  distinctUntilChanged()
);

const sampledTransformY = interval(16 * 10).pipe(
  withLatestFrom(
    merge(
      rightState.pipe(map(({ transform }) => transform)),
      leftState.pipe(map(({ transform }) => transform))
    ).pipe(startWith(0))
  ),
  map(([i, t]) => {
    const s = (i % 2) / 10;
    const v = Math.abs(t) + s;
    return `scaleY(${v})`;
  }),
  distinctUntilChanged()
);

combineLatest(sampledTransformX, sampledTransformY).subscribe(([x, y]) => {
  window.player.style.transform = `${x} ${y}`;
});

sampledImage.subscribe((className) => {
  window.player.className = className;
});

const position = sampledMoves
  .pipe(
    map(([x, y]) => [parseInt(x), parseInt(y)]),
    startWith([0, 0]),
    scan(([x0, y0], [x, y]) => [x0 + x, y0 + y])
  )
  .subscribe(([x, y]) => {
    window.player.style.left = x + "px";
    window.player.style.top = y + "px";
  });
