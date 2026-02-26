// removed node-fetch

// Actually, node 18+ has fetch. If not, I'll use http.
// To be safe, I'll use native http module or just assume recent node.
// Let's use standard http to avoid dependency issues if node-fetch isn't there (though I could install it).
// Or better, just use a simple curl command in the next step. 
// Actually, writing a small node script with http is robust.

const http = require('http');

const data = JSON.stringify({
  apiURl: 'http://localhost:3000/ping',
  method: 'GET',
  time: 5,
  lapicallin: 1000,
  payload: {}
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/load-test',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response Body:', body);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
