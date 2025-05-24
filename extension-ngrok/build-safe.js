const fs = require("fs")
const path = require("path")

// Safely create dist directory if it doesn't exist
const distDir = path.join(__dirname, "dist")
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

console.log("Build directories prepared safely")
