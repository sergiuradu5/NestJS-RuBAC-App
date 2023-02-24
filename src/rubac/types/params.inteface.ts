// Here we are storing resolved parameters in a lookup format
// {
//  'ip_address': (request) => request.getIpAddress() 
// }

export interface IParams {
  [name: string]: (...args: any[]) => any;
}