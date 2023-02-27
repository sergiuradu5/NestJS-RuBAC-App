export interface IParams {
  [name: string]: (...args: any[]) => any;
}