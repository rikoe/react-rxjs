import { Observable, Subscription, Subject } from "rxjs"
import { SUSPENSE } from "../SUSPENSE"
import { BehaviorObservable } from "./BehaviorObservable"
import { EMPTY_VALUE } from "./empty-value"
import { noop } from "./noop"

const shareLatest = <T>(complete = true, teardown = noop) => (
  source$: Observable<T>,
): BehaviorObservable<T> => {
  let subject: Subject<T> | undefined
  let subscription: Subscription | undefined
  let refCount = 0
  let currentValue: { value: T }

  const result = new Observable<T>(subscriber => {
    refCount++
    let innerSub: Subscription
    if (!subject) {
      currentValue = { value: EMPTY_VALUE }
      subject = new Subject<T>()
      innerSub = subject.subscribe(subscriber)
      subscription = source$.subscribe({
        next(value) {
          subject!.next((currentValue.value = value))
        },
        error(err) {
          subscription = undefined
          subject!.error(err)
        },
        complete() {
          if (complete) {
            subscription = undefined
            subject!.complete()
          }
        },
      })
    } else {
      innerSub = subject.subscribe(subscriber)
      if (currentValue.value !== EMPTY_VALUE) {
        subscriber.next(currentValue.value)
      }
    }

    return () => {
      refCount--
      innerSub.unsubscribe()
      if (refCount === 0) {
        currentValue.value = EMPTY_VALUE
        subject = undefined
        teardown()
        if (subscription) {
          subscription.unsubscribe()
          subscription = undefined
        }
      }
    }
  }) as BehaviorObservable<T>
  result.getValue = () => {
    if (
      currentValue.value === EMPTY_VALUE ||
      currentValue.value === (SUSPENSE as any)
    ) {
      throw currentValue.value
    }
    return currentValue.value
  }

  return result
}
export default shareLatest