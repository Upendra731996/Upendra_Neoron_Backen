const https = require('https');

const url = "https://api.unite-india.com/api/web/website/getAlwebData?schoolName=smart-kids-english-medium-school";

console.log(`Testing connectivity to: ${url}`);

const req = https.get(url, {
    headers: {
        'User-Agent': 'PostmanRuntime/7.32.3',
        'Accept': '*/*',
        'Connection': 'keep-alive'
    },
    timeout: 10000
}, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log(`Body length: ${data.length}`);
        console.log(`First 100 chars: ${data.substring(0, 100)}`);
    });
});

req.on('error', (e) => {
    console.error(`ERROR: ${e.message}`);
});

req.on('timeout', () => {
    req.destroy();
    console.error(`TIMEOUT`);
});
