#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log(' Generating amplify_outputs.json from template and secrets...');

const projectRoot = path.resolve(__dirname, '..');
// Input path is the TEMPLATE file
const templatePath = path.join(projectRoot, 'amplify_outputs.template.json');
// Output path is the final config file needed by the build
const outputPath = path.join(projectRoot, 'amplify_outputs.json');

// Get secret values directly from environment variables set by eas.json referencing EAS Secrets
// EAS populates these based on the 'env' mapping in eas.json
const authSecretJsonString = process.env.AMPLIFY_AUTH_SECRET;
const dataUrlSecretString = process.env.AMPLIFY_DATA_URL_SECRET;

// --- Robust Error Handling ---
if (!authSecretJsonString) {
  console.error('Error: Required environment variable AMPLIFY_AUTH_SECRET is not set.');
  console.error('Ensure it is defined in eas.json and the corresponding EAS Secret (e.g., AMPLIFY_AUTH_DEV_JSON) exists.');
  process.exit(1); // Signal failure to EAS Build
}
if (!dataUrlSecretString) {
    console.error('Error: Required environment variable AMPLIFY_DATA_URL_SECRET is not set.');
    console.error('Ensure it is defined in eas.json and the corresponding EAS Secret (e.g., AMPLIFY_DATA_URL_DEV) exists.');
    process.exit(1); // Signal failure to EAS Build
}

try {
  // Read the TEMPLATE base file
  if (!fs.existsSync(templatePath)) {
     console.error(`Error: Base template file not found at ${templatePath}.`);
     console.error('Ensure amplify_outputs.template.json is committed to the repository.');
     process.exit(1); // Signal failure
  }
  console.log(`Reading template file from: ${templatePath}`);
  const templateContent = fs.readFileSync(templatePath, 'utf8');

  // Parse the template configuration
  let config;
  try {
      config = JSON.parse(templateContent);
      console.log('Successfully parsed template file.');
  } catch (parseError) {
      console.error(`Error parsing template file ${templatePath}:`, parseError);
      process.exit(1); // Signal failure
  }

  // Parse the auth secret (which is a JSON string itself) and inject it
  try {
      // Ensure the 'auth' key exists before assignment, or handle potential template variations
      config.auth = JSON.parse(authSecretJsonString);
      console.log('Successfully parsed and injected auth secret.');
  } catch (parseError) {
      console.error('Error parsing AMPLIFY_AUTH_SECRET JSON string:', parseError);
      console.error('Ensure the EAS secret (e.g., AMPLIFY_AUTH_DEV_JSON) contains a valid JSON string.');
      process.exit(1); // Signal failure
  }

  // Inject the data URL string
  // Ensure the 'data' key exists in the parsed config before accessing 'url'
  if (!config.data) {
     console.warn('Warning: "data" key missing in template, initializing.');
     config.data = {}; // Initialize if missing in template to prevent errors
  }
  config.data.url = dataUrlSecretString;
  console.log('Successfully injected data URL.');

  // Stringify the final configuration (pretty print with 2 spaces)
  const finalJson = JSON.stringify(config, null, 2);

  // Write the final amplify_outputs.json file (overwriting if it exists)
  console.log(`Writing final configuration to: ${outputPath}`);
  fs.writeFileSync(outputPath, finalJson, 'utf8');

  console.log(`Successfully generated ${outputPath} for the target environment.`);
  process.exit(0); // Signal success

} catch (error) {
  // Catch any other unexpected errors during file I/O or processing
  console.error('Error processing Amplify config during build hook:', error);
  process.exit(1); // Signal failure
}