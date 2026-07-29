"use strict";

const fs = require("fs");
const path = require("path");

const JOB_STORE_DIR = path.join(
  __dirname,
  "..",
  "..",
  "job-store"
);

async function initializeJobStore() {
  await fs.promises.mkdir(
    JOB_STORE_DIR,
    { recursive: true }
  );
}

function getJobFilePath(sessionId) {
  return path.join(
    JOB_STORE_DIR,
    `${sessionId}.json`
  );
}

async function saveJob(jobData) {
  const filePath = getJobFilePath(
    jobData.session_id
  );

  await fs.promises.writeFile(
    filePath,
    JSON.stringify(
      jobData,
      null,
      2
    ),
    "utf8"
  );

  return jobData;
}

async function getJob(sessionId) {
  const filePath =
    getJobFilePath(sessionId);

  const content =
    await fs.promises.readFile(
      filePath,
      "utf8"
    );

  return JSON.parse(content);
}

async function updateJob(
  sessionId,
  updates
) {
  const existing =
    await getJob(sessionId);

  const merged = {
    ...existing,
    ...updates,
    updated_at:
      new Date().toISOString()
  };

  await saveJob(merged);

  return merged;
}

module.exports = {
  initializeJobStore,
  saveJob,
  getJob,
  updateJob
};