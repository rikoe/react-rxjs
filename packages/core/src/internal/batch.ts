type Batch = (fn: () => void) => void

const defaultBatch: Batch = (fn: () => void) => {
  fn()
}

let batch: Batch = defaultBatch

export const setBatch = (input: Batch) => {
  batch = input
}

export const getBatch = () => batch
