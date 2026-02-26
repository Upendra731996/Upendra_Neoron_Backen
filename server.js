const express = require('express');
const autocannon = require('autocannon');
// CRITICAL PERFORMANCE FIX: Increase thread pool for DNS lookups
process.env.UV_THREADPOOL_SIZE = 256;

const app = express();
const port = 3000;

process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught Exception:', err);
    // Keep running
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
    // Keep running
});

app.use(express.json());

// Simple ping endpoint for target testing
app.get('/ping', (req, res) => {
    res.send('pong');
});

// Load testing endpoint
app.post('/load-test', (req, res) => {
    const { apiURl, method, time, lapicallin, apicallingCount, payload } = req.body;

    if (!apiURl || !time) {
        return res.status(400).json({ error: 'Missing required fields: apiURl, time' });
    }

    const targetCount = apicallingCount || lapicallin;
    
    // 1. Pre-flight Debug Check (Native Node Request)
    try {
        const urlObj = new URL(apiURl);
        const lib = urlObj.protocol === 'https:' ? require('https') : require('http');
        const checkReq = lib.request(apiURl, {
            method: 'GET',
            headers: { 'User-Agent': 'PostmanRuntime/7.32.3' },
            timeout: 10000, // Increased timeout
            family: 4, 
            rejectUnauthorized: false 
        }, (res) => {
            console.log(`[Diagnostic] Pre-flight Check: Connected! Status: ${res.statusCode} Message: ${res.statusMessage}`);
            res.resume(); 
        });
        
        checkReq.on('error', (e) => {
            // "socket hang up" is common if server blocks us or timeouts
            console.error(`[Diagnostic] Pre-flight Check FAILED: ${e.message}`);
        });
        
        checkReq.on('timeout', () => {
             console.error(`[Diagnostic] Pre-flight Check TIMED OUT`);
             checkReq.destroy(); // This might trigger 'error' event above, which is handled.
        });
        
        checkReq.end();
    } catch (e) {
        console.error(`[Diagnostic] Invalid URL: ${e.message}`);
    }

    // STRESS MODE VS SAFE MODE
    // To protect the laptop from crashing, running out of memory, or socket exhaustion (EMFILE),
    // we strictly cap connections. 100 connections are more than enough to handle thousands of reqs/sec.
    const MAX_SAFE_CONNECTIONS = 200; 

    // Allow user to explicitly set connections, otherwise use safe default.
    let safeConnections = req.body.connections ? parseInt(req.body.connections) : 50;
    let pipelineDepth = 10; // Default pipelining

    // AGGRESSIVE MODE
    // Activated ONLY if explicitly requested. A high target count shouldn't break the laptop!
    if (req.body.aggressive === true) {
        console.log('[MODE] AGGRESSIVE / BREAKER MODE ACTIVATED (WARNING: High load on local system)');
        pipelineDepth = 20; // Slight increase, avoid maxing out OS TCP pipeline
        if (!req.body.connections && targetCount) {
             safeConnections = Math.min(parseInt(targetCount), MAX_SAFE_CONNECTIONS);
        }
    } else {
         // Normal scaling for safety - fixed connections instead of 1:1 scaling
         // This is purely to ensure safe load generation without crashing
         if (!req.body.connections) {
             safeConnections = 50; 
         }
    }
    
    // SAFETY CLIP (The "Make sure laptop doesn't die" part)
    if (safeConnections > MAX_SAFE_CONNECTIONS) {
        console.warn(`[SAFETY] Capping connections from ${safeConnections} to ${MAX_SAFE_CONNECTIONS} to protect local system.`);
        safeConnections = MAX_SAFE_CONNECTIONS;
    }
    // Ensure at least 10 connections
    if (safeConnections < 10) safeConnections = 10;

    console.log(`[CONFIG] Target: ${targetCount || 'Unlimited'} | Connections: ${safeConnections} | Pipelining: ${pipelineDepth}`);

    // Calculate rate if we have a target count and duration
    // overallRate = requests / seconds
    let rate = undefined;
    if (targetCount && time && !req.body.aggressive) {
        // Distribute the requests evenly over the total specified time
        rate = Math.ceil(parseInt(targetCount) / parseInt(time));
        console.log(`[RATE LIMITING] Target: ${targetCount} reqs evenly spread over ${time}s -> Rate: ${rate} req/s`);
    } else if (req.body.aggressive) {
        console.log(`[RATE LIMITING] DISABLED (Aggressive Mode)`);
    }

    const autocannonConfig = {
        url: apiURl,
        method: method || 'GET',
        duration: time,
        connections: safeConnections, 
        pipelining: pipelineDepth, // High throughput via pipelining
        body: payload ? JSON.stringify(payload) : undefined,
        headers: {
            'content-type': 'application/json',
            'User-Agent': 'PostmanRuntime/7.32.3',
            'Accept': '*/*',
            'Cache-Control': 'no-cache',
            'Postman-Token': Date.now().toString(),
            'Host': new URL(apiURl).host,
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            ...(payload ? {} : {}) 
        },
        amount: targetCount ? parseInt(targetCount) : undefined,
        overallRate: rate, // Apply rate limit only if safe
        timeout: 10, 
    };

    

    
    // Debug: Log the exact config we are using
    console.log('Autocannon Config:', JSON.stringify({
        url: autocannonConfig.url,
        headers: autocannonConfig.headers,
        timeout: autocannonConfig.timeout
    }, null, 2));
    
    // If user provided payload, we should override/merge content-type
    if (payload) {
        autocannonConfig.headers['content-type'] = 'application/json';
    }
    
    // Calcluate rate if we have a target count and duration
    // overallRate = requests / seconds


    // We do NOT set overallRate here anymore, so it runs at max speed until 'amount' or 'duration' is reached.

    // MODE SELECTION:
    // If 'useParallelMode' is true, we use the user-requested "Promise.all" custom engine.
    // Otherwise, we use Autocannon (standard).
    
    if (req.body.useParallelMode) {
        console.log(`[MODE] Switching to Custom Promise.all Runner (User Request)`);
        
        const axios = require('axios');
        let completed = 0;
        let success = 0;
        let failed = 0;
        let details = { timeouts: 0, connection_errors: 0, status_codes: {} };
        const startTime = Date.now();
        
        // We can't fire 40,000 promises at once (will crash Node). We must batch/limit concurrency.
        const totalRequests = targetCount ? parseInt(targetCount) : (parseInt(time) * 20 || 200); 
        
        // AUTO-SCALE CONCURRENCY:
        // Huge concurrency breaks the laptop. Limiting to max 100 ensures we don't blow up OS sockets or Node memory.
        let concurrencyLimit = req.body.concurrency ? parseInt(req.body.concurrency) : 50;
        if (concurrencyLimit > 200) concurrencyLimit = 200; // Strict safety cap
        
        console.log(`[Parallel Mode] Starting ${totalRequests} requests. Max Concurrency: ${concurrencyLimit} (Laptop Safe)`);

        const queue = Array(totalRequests).fill(0);
        let activeRequests = 0;
        
        // Log status every 500ms
        const statusInterval = setInterval(() => {
            if (activeRequests > 0) {
                 process.stdout.write(`\r[Parallel] Active: ${activeRequests} | Completed: ${completed}/${totalRequests} | Success: ${success} | Fail: ${failed}`);
            }
        }, 500);
        
        // Create Agents ONCE to ensure connections are reused (Keep-Alive)
        const httpAgent = new require('http').Agent({ keepAlive: true, maxSockets: concurrencyLimit });
        const httpsAgent = new require('https').Agent({ keepAlive: true, maxSockets: concurrencyLimit });

        const runRequest = async () => {
             const startReq = Date.now();
             try {
                const response = await axios({
                    method: method || 'GET',
                    url: apiURl,
                    data: payload,
                    timeout: 10000,
                    httpAgent: httpAgent,
                    httpsAgent: httpsAgent,
                    validateStatus: () => true // Handle 4xx/5xx as valid responses, not exceptions
                });
                
                success++;
                if (!details.status_codes[response.status]) details.status_codes[response.status] = 0;
                details.status_codes[response.status]++;
                
             } catch (err) {
                 failed++;
                 if (err.code === 'ECONNABORTED') details.timeouts++;
                 else details.connection_errors++;
             } finally {
                 completed++;
                 activeRequests--;
                 processQueue();
             }
        };

        const processQueue = () => {
            // While we have items in queue AND we have slots in concurrency limit
            while (queue.length > 0 && activeRequests < concurrencyLimit) {
                queue.pop();
                activeRequests++;
                runRequest();
            }
            
            // Completion check
            if (queue.length === 0 && activeRequests === 0) {
                 clearInterval(statusInterval);
                 const duration = (Date.now() - startTime) / 1000;
                 const result = {
                    target: apiURl,
                    duration_seconds: duration,
                    total_requests: totalRequests,
                    success_count: success,
                    failure_count: failed,
                    other_stats: details
                 };
                 console.log('\n[Parallel] Finished!', JSON.stringify(result, null, 2));
                 return res.json(result);
            }
        };
        
        // Kickoff
        processQueue();
        return; // Stop function execution here, do not run autocannon
    }

    // Prepare autocannon instance
    const instance = autocannon(autocannonConfig, (err, result) => {
        if (err) {
            console.error('Autocannon error:', err);
            return res.status(500).json({ error: 'Load test failed to start' });
        }

        // Result handling
        // result.2xx is a count of 2xx responses
        // result.non2xx is a count of non-2xx responses
        
        const responseData = {
            target: apiURl,
            duration_seconds: result.duration,
            total_requests: result.requests.total,
            success_count: result['2xx'],
            // success is strictly 2xx. failures is everything else.
            failure_count: result.non2xx + result.timeouts + result.errors, 
            other_stats: {
                timeouts: result.timeouts,
                connection_errors: result.errors,
                // breakdowns
                status_codes: result.statusCodeStats
            }
        };

        console.log('\nLoad test finished.', JSON.stringify(responseData, null, 2));
        res.json(responseData);
    });

    // Real-time logging of progress
    let requestCounter = 0;
    instance.on('response', (client, statusCode, resBytes, responseTime) => {
        requestCounter++;
        const statusStr = statusCode >= 200 && statusCode < 300 ? 'SUCCESS' : 'FAIL';
        // If target is small, log every request. If large, log periodically.
        if (!targetCount || targetCount <= 50 || requestCounter % 1000 === 0) {
            process.stdout.write(`\rRequests: ${requestCounter} | Last Status: ${statusCode} (${statusStr}) `);
        }
    });

    // Ensure we track progress or errors if needed, but the callback above handles completion.
    autocannon.track(instance, { renderProgressBar: false });
});

app.listen(port, () => {
    console.log(`Load testing server running on http://localhost:${port}`);
});
