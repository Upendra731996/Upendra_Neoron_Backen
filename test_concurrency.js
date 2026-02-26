const axios = require('axios');

async function runTest() {
    try {
        console.log("Starting CONCURRENCY TEST...");
        // This will verify that we can set a higher concurrency (e.g. 50)
        // We use a small target count (200) so it finishes quickly, but shows the logic.
        const response = await axios.post('http://localhost:3000/load-test', {
            apiURl: "http://localhost:8000/health",
            method: "GET",
            time: 10,
            apicallingCount: 500,
            useParallelMode: true,
            concurrency: 50
        });
        console.log("Response:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("Error:", error.message);
    }
}

runTest();
