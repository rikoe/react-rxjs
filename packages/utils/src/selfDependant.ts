import {
  SchedulerLike,
  Observable,
  Subject,
  asapScheduler,
  MonoTypeOperatorFunction,
} from "rxjs"
import { observeOn, share, tap } from "rxjs/operators"

/**
 * A creation operator that helps at creating observables that have circular
 * dependencies
 *
 * @ param scheduler (= asapScheduler) SchedulerLike to observe the inner subject
 * @returns [1, 2]
 * 1. The inner subject observed on the provided scheduler and shared
 * 2. A pipable operator that taps into the inner Subject
 */
export const selfDependant = <T>(
  scheduler: SchedulerLike = asapScheduler,
): [Observable<T>, () => MonoTypeOperatorFunction<T>] => {
  const mirrored$ = new Subject<T>()
  return [
    mirrored$.pipe(observeOn(scheduler), share()),
    () => tap(mirrored$) as MonoTypeOperatorFunction<T>,
  ]
}
