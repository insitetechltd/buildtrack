const fs = require('fs');

let adapterCode = fs.readFileSync('src/ui/viewAdapters/useCreateTaskViewAdapter.ts', 'utf8');

// We will add photo uploading and prefilling to the adapter.
// Wait, if I just use `Write` tool for the adapter, it's simpler.

