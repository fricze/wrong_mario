import {
  withLatestFrom,
  zip,
  combineLatest,
  interval,
  fromEvent,
  merge,
} from "rxjs";
import { scan, sample, startWith, mapTo, filter, map } from "rxjs/operators";

const keyDown$ = fromEvent(document, "keydown");
const keyUp$ = fromEvent(document, "keyup");

const [x0, y0] = [0, 0];

const leftState = merge(
  keyDown$.pipe(
    filter(({ key }) => key === "ArrowLeft"),
    mapTo({ playerMove: [-2, 0] })
  ),
  keyUp$.pipe(
    filter(({ key }) => key === "ArrowLeft"),
    mapTo({ playerMove: [0, 0] })
  )
).pipe(startWith({ playerMove: [0, 0] }));

const rightState = merge(
  keyDown$.pipe(
    filter(({ key }) => key === "ArrowRight"),
    mapTo({ playerMove: [2, 0] })
  ),
  keyUp$.pipe(
    filter(({ key }) => key === "ArrowRight"),
    mapTo({ playerMove: [0, 0] })
  )
).pipe(startWith({ playerMove: [0, 0] }));

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

const position = sampledMoves
  .pipe(
    startWith([0, 0]),
    scan(([x0, y0], [x, y]) => [
      parseInt(x0) + parseInt(x),
      parseInt(y0) + parseInt(y),
    ])
  )
  .subscribe(([x, y]) => {
    window.player.style.left = x + "px";
    window.player.style.top = y + "px";
  });
