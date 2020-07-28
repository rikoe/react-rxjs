import {
  map,
  withLatestFrom,
  pluck,
  share,
  takeWhile,
  switchMapTo,
  delay,
} from "rxjs/operators"
import { TestScheduler } from "rxjs/testing"
import { selfDependant } from "./"
import { merge, Observable, defer, asyncScheduler, of } from "rxjs"

const scheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected)
  })

const inc = (x: number) => x + 1
describe("selfDependant", () => {
  it("emits the key of the stream that emitted the value - asap", () => {
    scheduler().run(({ expectObservable, expectSubscriptions, cold }) => {
      let source: Observable<any>

      const clicks$ = defer(() => source)
      const [_resetableCounter$, connect] = selfDependant<number>(
        asyncScheduler,
      )
      const inc$ = clicks$.pipe(
        withLatestFrom(_resetableCounter$),
        pluck("1"),
        map(inc),
        share(),
      )

      const delayedZero$ = of(0).pipe(delay(2))
      const reset$ = inc$.pipe(switchMapTo(delayedZero$))

      const resetableCounter$ = merge(inc$, reset$, of(0)).pipe(
        connect(),
        takeWhile((x) => x < 4, true),
      )

      source = cold("    -***---**---*****--")
      const sourceSub = "^--------------!   "
      const expected = " abcd-a-bc-a-bcd(e|)"

      expectObservable(resetableCounter$).toBe(expected, {
        a: 0,
        b: 1,
        c: 2,
        d: 3,
        e: 4,
      })
      expectSubscriptions((source as any).subscriptions).toBe(sourceSub)
    })
  })

  it("emits the key of the stream that emitted the value - async", () => {
    scheduler().run(({ expectObservable, expectSubscriptions, cold }) => {
      let source: Observable<any>

      const clicks$ = defer(() => source)
      const [_resetableCounter$, connect] = selfDependant<number>()
      const inc$ = clicks$.pipe(
        withLatestFrom(_resetableCounter$),
        pluck("1"),
        map(inc),
        share(),
      )

      const delayedZero$ = of(0).pipe(delay(2))
      const reset$ = inc$.pipe(switchMapTo(delayedZero$))

      const resetableCounter$ = merge(inc$, reset$, of(0)).pipe(
        connect(),
        takeWhile((x) => x < 4, true),
      )

      source = cold("    -***---**---*****--")
      const sourceSub = "^--------------!   "
      const expected = " abcd-a-bc-a-bcd(e|)"

      expectObservable(resetableCounter$).toBe(expected, {
        a: 0,
        b: 1,
        c: 2,
        d: 3,
        e: 4,
      })
      expectSubscriptions((source as any).subscriptions).toBe(sourceSub)
    })
  })
})
