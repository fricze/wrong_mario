import {
  withLatestFrom,
  zip,
  combineLatest,
  interval,
  fromEvent,
  merge,
  Subject,
  BehaviorSubject,
} from "rxjs";
import {
  exhaustMap,
  mergeMap,
  concatMap,
  switchMap,
  distinctUntilChanged,
  scan,
  sample,
  startWith,
  mapTo,
  filter,
  skip,
  map,
  take,
} from "rxjs/operators";

const keyDown$ = fromEvent(document, "keydown");
const keyUp$ = fromEvent(document, "keyup");

const [x0, y0] = [0, 610];

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
    mapTo({ playerMove: [0, -2], moving: true })
  ),
  keyUp$.pipe(
    filter(({ key }) => key === "ArrowUp"),
    mapTo({ playerMove: [0, 0], moving: false })
  )
).pipe(startWith({ playerMove: [0, 0], moving: false }));

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

const jumpSteps = [2, 8, 14, 20, 22, 24, 28, 24, 22, 20, 14, 8, 2, 0].map(
  (x) => y0 - x * 1.5
);

const jump$ = () =>
  interval(16 * 3).pipe(
    take(jumpSteps.length),
    map((i) => jumpSteps[i])
  );

const jumping$ = upState.pipe(
  map(({ moving }) => moving),
  distinctUntilChanged(),
  filter((x) => x),
  exhaustMap(jump$)
);

const reduceMoves = (moves) => moves.reduce((acc, move) => acc + move[0], 0);

const horizontalMoves = combineLatest(
  leftState.pipe(map(({ playerMove }) => playerMove)),
  rightState.pipe(map(({ playerMove }) => playerMove))
).pipe(map(reduceMoves));

const sampledMoves = interval(16).pipe(
  withLatestFrom(horizontalMoves),
  map(([_, move]) => parseInt(move))
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

const moveHorizontally = (x0, [x, v]) => {
  const newPos = x0 + x * v;

  return newPos;
};

const velocitySub$ = new BehaviorSubject(1);

const horizontalPosition$ = sampledMoves.pipe(
  startWith(x0),
  withLatestFrom(velocitySub$),
  scan(moveHorizontally, 0)
);

const groundObstacle$ = horizontalPosition$.pipe(
  map((x) => (x >= 274 && x <= 326 ? 26 : 0))
);

horizontalPosition$.subscribe((x) => {
  window.player.style.left = x + "px";
});

const jumpingWithObstacle$ = jumping$.pipe(
  withLatestFrom(groundObstacle$),
  map(([jump, obstacle]) => {
    const localJump = Math.abs(jump - y0);
    if (localJump < obstacle) {
      return [true, y0 - obstacle];
    }

    return [false, jump];
  })
);

const goDownSteps = [26, 24, 22, 20, 14, 8, 2, 0].map((x) => y0 - x);

const down$ = () =>
  interval(16 * 3).pipe(
    take(goDownSteps.length),
    map((i) => goDownSteps[i])
  );

const falling$ = groundObstacle$.pipe(
  distinctUntilChanged(),
  filter((x) => x === 0)
);

const standingOnObstacle$ = jumpingWithObstacle$.pipe(
  map(([x]) => x),
  distinctUntilChanged(),
  filter((x) => x)
);

const fallFromObstacle$ = standingOnObstacle$.pipe(
  sample(falling$),
  exhaustMap(down$)
);

const positionY$ = merge(
  jumpingWithObstacle$.pipe(
    map(([_, x]) => x),
    startWith(y0)
  ),
  fallFromObstacle$
);

const jumpVelocity$ = positionY$.pipe(
  filter((pos) => pos >= 26),
  mapTo(1.5)
);

const walkVelocity$ = groundObstacle$.pipe(
  map((obs) => !!obs),
  map((obs) => (obs ? 0 : 1)),
  distinctUntilChanged()
);

merge(jumpVelocity$, walkVelocity$).subscribe((v) => {
  velocitySub$.next(v);
});

positionY$.subscribe((y) => {
  window.player.style.top = y + "px";
});
