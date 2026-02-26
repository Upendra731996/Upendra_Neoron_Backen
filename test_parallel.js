const axios = require('axios');

async function runTest() {
    try {
        console.log("Starting PROMISE.ALL MODE test request...");
        const start = Date.now();
        // Request 100 requests using the new parallel mode
        const response = await axios.post('http://localhost:3000/load-test', {
            apiURl: "http://localhost:8000/health",
            method: "GET",
            time: 5,
            apicallingCount: 100,
            payload: {},
            useParallelMode: true
        });
        const end = Date.now();
        console.log("Load test completed in", (end - start) / 1000, "seconds");
        console.log("Response:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Data:", error.response.data);
        }
    }
}

runTest();
