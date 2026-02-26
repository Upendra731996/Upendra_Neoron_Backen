const axios = require('axios');

async function runTest() {
    try {
        console.log("Starting load test request...");
        const start = Date.now();
        const response = await axios.post('http://localhost:3000/load-test', {
            apiURl: "http://localhost:8000/health",
            method: "GET",
            time: 10,
            apicallingCount: 200,
            payload: {}
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
