# How Parallel Load Testing Works

## Check the "Active" Count
I have updated the server to show a real-time log:
`[Parallel] Active: 1000 | Completed: 5000/40000 ...`

- **Active: 1000** means there are currently **1000 requests in flight** (waiting for a response).
- As soon as one request finishes, another takes its place instantly.

## Why does it still take time?
It depends on the **Target Server's Speed**.

**Formula:**
`Time = (Total Requests / Concurrency) * Server Response Time`

**Example:**
- **Total Requests**: 40,000
- **Concurrency**: 1,000 (We send 1000 at a time)
- **Target Server Response Time**: 0.5 seconds (500ms)

`Time = (40,000 / 1,000) * 0.5s = 20 seconds`

Even if we send requests instantly, we have to wait for the server to reply.

## How to go faster?
1. **Increase Concurrency**: You can now pass `"concurrency": 2000` in the JSON body.
   - *Warning*: Too high (e.g., 5000+) might crash your internet or network card.
2. **Optimize Target**: If the target server is slow, the test will be slow.
