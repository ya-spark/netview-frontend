// Test to verify that the logger handles circular references safely
import './logger-init';

console.log('Testing circular reference handling...');

// Create an object with circular reference
const obj: any = { name: 'test' };
obj.self = obj;

// This should not throw an error
console.log('Object with circular reference:', obj);
console.error('Error with circular reference:', obj);
console.warn('Warning with circular reference:', obj);

// Test with BigInt
const bigIntValue = BigInt(9007199254740991);
console.log('BigInt value:', bigIntValue);

// Test with complex nested objects
const req = {
  method: 'GET',
  url: '/test',
  headers: {
    'user-agent': 'test'
  },
  socket: {
    remoteAddress: '127.0.0.1'
  }
};

console.log('Complex object:', req);

console.log('All tests passed - no exceptions thrown');
