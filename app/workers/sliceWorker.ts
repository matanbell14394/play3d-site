// --- MOCK SLICE WORKER ---
// In a real application, this would be a separate process that pulls jobs from a queue (e.g., Redis, RabbitMQ).
// It would not be directly invoked by the web server.

import { SliceStatus } from "@prisma/client";

// A placeholder for the SliceJob entity
interface SliceJob {
  id: string;
  orderId: string;
  status: SliceStatus;
  stlUrl?: string | null;
}

// A mock database of slice jobs
const jobQueue: Map<string, SliceJob> = new Map();

/**
 * Adds a job to the mock queue. In a real app, this would be an API call to a job queue service.
 */
export function addSliceJob(job: SliceJob) {
  jobQueue.set(job.id, job);
  console.log(`[Slice Worker] Job ${job.id} for order ${job.orderId} added to queue.`);
  // Immediately start processing for this mock implementation
  processNextJob();
}

/**
 * Simulates the worker processing a job from the queue.
 */
async function processNextJob() {
  if (jobQueue.size === 0) {
    return;
  }

  const entry = jobQueue.entries().next().value;
  if (!entry) return;
  const [jobId, job] = entry;
  jobQueue.delete(jobId);

  console.log(`[Slice Worker] Processing job ${job.id} for order ${job.orderId}...`);
  job.status = SliceStatus.PROCESSING;
  
  // --- This is where the core slicing logic would go ---
  // 1. Download the STL file from job.stlUrl or a file store.
  // 2. Execute the CLI slicer (e.g., PrusaSlicer) as a child process.
  // 3. Wait for the process to complete and parse the output.
  
  // Simulate a long-running process
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 4. Update the SliceJob and Order in the database with the results.
  const success = Math.random() > 0.1; // 90% success rate
  if (success) {
    job.status = SliceStatus.COMPLETED;
    console.log(`[Slice Worker] Job ${job.id} completed successfully.`);
    // Here you would update the database:
    // await sliceJobRepository.update(job.id, {
    //   status: SliceStatus.COMPLETED,
    //   estimatedTime: 3600,
    //   materialGrams: 150,
    //   ...
    // });
  } else {
    job.status = SliceStatus.FAILED;
    console.error(`[Slice Worker] Job ${job.id} failed.`);
  }
}

console.log("[Slice Worker] Mock worker initialized.");
