const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const isMock = !GEMINI_API_KEY || GEMINI_API_KEY === 'mock_gemini_key';

const getSystemPrompt = (language) => {
  return `You are a medical triage assistant for MediBridge AI, a telehealth platform.
DO NOT ACT AS A DOCTOR. You must evaluate symptoms provided by the user.
Your response MUST be strict JSON in the following format ONLY:
{
  "possibleConditions": ["Condition1", "Condition2"],
  "severity": "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
  "recommendation": "Brief triage instructions",
  "suggestedSpecialty": "Recommended doctor specialty, e.g. General Physician"
}
Always recommend consulting a real doctor in your recommendation.
Respond in language code: ${language}.`;
}

const mockResponse = {
  possibleConditions: ["Common Cold", "Viral Fever"],
  severity: "LOW",
  recommendation: "Please rest and drink plenty of fluids. Consult a General Physician for a formal diagnosis. This is an AI assessment and does not constitute medical advice.",
  suggestedSpecialty: "General Physician"
};

let genAI;
let model;
if (!isMock) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
}

exports.checkSymptoms = async (symptoms, language = 'en') => {
  if (isMock) {
    console.warn('[Mock AI] Proceeding with mock symptom check response');
    return { ...mockResponse, aiUnavailable: false };
  }

  try {
    const prompt = `${getSystemPrompt(language)}\nUser Symptoms: ${symptoms.join(', ')}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const resultText = response.text();
    
    return JSON.parse(resultText);

  } catch (error) {
    console.error('AI check exception:', error.message);
    return { ...mockResponse, aiUnavailable: true, errorFallback: true };
  }
};
