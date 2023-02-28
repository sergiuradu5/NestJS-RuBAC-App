export class CompilationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class ExecutionError extends Error {
  constructor(message: string) {
    super(message);
  }
}
