import { Observable, of, Subscription } from "rxjs"
import { delay, take, filter, tap } from "rxjs/operators"
import { SUSPENSE } from "../SUSPENSE"
import { BehaviorObservable } from "./BehaviorObservable"
import { EMPTY_VALUE } from "./empty-value"
import { noop } from "./noop"
import { getBatch } from "./batch"
import { COMPLETE } from "./COMPLETE"

let queue: Array<() => void> = []
let promise: Promise<void> | null = null
const flush = () => {
  promise = null
  const originalQueue = queue
  queue = []
  getBatch()(() => {
    originalQueue.forEach((fn) => fn())
  })
}

const push = (fn: () => void) => {
  queue.push(fn)
  if (!promise) {
    promise = Promise.resolve().then(flush)
  }
}

const reactEnhancer = <T>(
  source$: Observable<T>,
  delayTime: number,
  asap: boolean,
): BehaviorObservable<T> => {
  let finalizeLastUnsubscription = noop
  const result = new Observable<T>((subscriber) => {
    let isActive = true
    let latestValue = EMPTY_VALUE

    let next = subscriber.next.bind(subscriber)
    let error = subscriber.error.bind(subscriber)
    if (asap) {
      next = (x) => push(() => next(x))
      error = (e) => push(() => error(e))
    }

    const subscription = source$.subscribe((value) => {
      if (
        isActive &&
        value !== (COMPLETE as any) &&
        !Object.is(latestValue, value)
      ) {
        next((latestValue = value))
      }
    }, error)
    finalizeLastUnsubscription()
    return () => {
      finalizeLastUnsubscription()
      isActive = false
      let timeoutSub: Subscription | undefined =
        delayTime < Infinity
          ? of(null)
              .pipe(delay(delayTime))
              .subscribe(() => {
                timeoutSub = undefined
                subscription.unsubscribe()
              })
          : undefined
      finalizeLastUnsubscription = () => {
        timeoutSub?.unsubscribe()
        subscription.unsubscribe()
        finalizeLastUnsubscription = noop
      }
    }
  }) as BehaviorObservable<T>

  let promise: any
  let error = EMPTY_VALUE
  let valueResult: { type: "v"; payload: any } | undefined
  const getValue = () => {
    if (error !== EMPTY_VALUE) {
      throw error
    }

    try {
      const latest = (source$ as BehaviorObservable<T>).getValue()
      return valueResult && Object.is(valueResult.payload, latest)
        ? valueResult
        : (valueResult = { type: "v", payload: latest })
    } catch (e) {
      if (promise) return promise

      let value = EMPTY_VALUE
      let isSyncError = false
      promise = {
        type: "s",
        payload: reactEnhancer(source$, delayTime, false)
          .pipe(
            filter((value) => value !== (SUSPENSE as any)),
            take(1),
            tap({
              next(v) {
                value = v
              },
              error(e) {
                error = e
                setTimeout(() => {
                  error = EMPTY_VALUE
                }, 200)
              },
            }),
          )
          .toPromise()
          .catch((e) => {
            if (isSyncError) return
            throw e
          })
          .finally(() => {
            promise = undefined
            valueResult = undefined
          }),
      }

      if (value !== EMPTY_VALUE) {
        return (valueResult = { type: "v", payload: value })
      }

      if (error !== EMPTY_VALUE) {
        isSyncError = true
        throw error
      }

      return promise
    }
  }

  result.getValue = getValue as () => T | Promise<T>
  return result
}

export default reactEnhancer
