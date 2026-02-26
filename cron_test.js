const cron = require('node-cron');
const autocannon = require('autocannon');

console.log("=========================================");
console.log("CRON LOAD TEST STARTED");
console.log("Press Ctrl+C to stop.");
console.log("=========================================");

// IMPORTANT: Set your test details here
const TARGET_API_URL = 'https://api.unite-india.com/api/web/website/getAlwebData?schoolName=smart-kids-english-medium-school'; // Change this to the API you want to test
const TARGET_COUNT = 50000;  // How many requests per run
const DURATION_SECONDS = 300; // Should be less than 10 seconds since cron runs every 10 seconds!

let isRunning = false;

// Cron har 1 minute me chalega (check karega): '* * * * *'
// Aapka time 300 seconds (5 min) hai, isliye isRunning property test ko overlap hone se rokegi
cron.schedule('* * * * *', () => {
    // Agar pichla test abhi tak khatam nahi hua, toh naya test start na kare (to save laptop crash)
    if (isRunning) {
        console.log('[CRON] Previous test still running. Skipping this 10-second cycle...');
        return;
    }

    console.log(`\n--- CRON FIRED at ${new Date().toLocaleTimeString()} ---`);
    isRunning = true;

    // Call memory clearing before starting (Requires node --expose-gc)
    clearMemory();

    const safeConnections = 50; 
    let rate = Math.ceil(TARGET_COUNT / DURATION_SECONDS);

    const autocannonConfig = {
        url: TARGET_API_URL,
        method: 'GET',
        duration: DURATION_SECONDS,
        connections: safeConnections, 
        pipelining: 10,
        headers: {
            'content-type': 'application/json',
            'User-Agent': 'PostmanRuntime/7.32.3',
            'Accept': '*/*, application/json',
            'Cache-Control': 'no-cache',
        },
        amount: TARGET_COUNT,
        overallRate: rate, 
        timeout: 10, 
    };

    const instance = autocannon(autocannonConfig, (err, result) => {
        if (err) {
            console.error('[ERROR] Autocannon failed:', err);
        } else {
            console.log(`[RESULTS] Total Reqs: ${result.requests.total} | Success: ${result['2xx']} | Fails: ${result.non2xx + result.timeouts + result.errors}`);
        }
        
        // Mark as finished so next cron tick can start
        isRunning = false;
        
        // Clear memory after test concludes
        clearMemory();
    });
});

function clearMemory() {
    if (global.gc) {
        global.gc();
        const mem = process.memoryUsage();
        console.log(`[MEMORY] GC Cleared Memory. Current RAM usage: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    } else {
        console.log('[MEMORY] global.gc() not available. Memory will clear automatically.');
        console.log('         TIP: Next time, start this script with: node --expose-gc cron_test.js');
    }
}
