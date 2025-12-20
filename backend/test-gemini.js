require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  console.log('Testing Gemini API...');
  console.log('Key present:', !!process.env.GEMINI_API_KEY);
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // List available models
    /*
    const modelsToTest = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];
    
    for (const modelName of modelsToTest) {
       // ...
    }
    */
   
    // List models
    const modelList = await genAI.getGenerativeModel({ model: "gemini-pro" }).apiKey; // Hack to get instance? No.
    // The SDK doesn't have a direct listModels on the client instance usually, it's on the GoogleGenerativeAI class or similar?
    // Actually, looking at docs, it might not be directly exposed in this simple way in the JS SDK without a specific call.
    // But wait, the error message said "Call ListModels".
    
    // Let's try to just use "gemini-1.5-flash-latest" or similar if I can guess.
    // But better to try to find the right name.
    
    // Let's try a different approach: just print the error fully to see if it lists anything?
    // No, let's try "gemini-1.5-flash-001" or "gemini-1.5-pro".
    
    const modelsToTest = ["models/gemini-2.0-flash-exp", "models/gemini-2.0-flash", "models/gemini-flash-latest"];
    
    for (const modelName of modelsToTest) {
      console.log(`\nTesting model: ${modelName}...`);
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const prompt = "Hello";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log(`SUCCESS with ${modelName}! Response:`, response.text());
        return;
      } catch (e) {
        console.log(`FAILED with ${modelName}: ${e.message.split('\n')[0]}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testGemini();