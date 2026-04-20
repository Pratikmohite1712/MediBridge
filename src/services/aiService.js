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

exports.checkSymptoms = async (symptoms, language = 'en') => {
  if (isMock) {
    console.warn('[Mock AI] Proceeding with mock symptom check response');
    return { ...mockResponse, aiUnavailable: false };
  }

  try {
    // Basic REST payload for Gemini API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const prompt = `${getSystemPrompt(language)}\nUser Symptoms: ${symptoms.join(', ')}`;
    
    // Since Node 18, global fetch is available natively
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;
    
    return JSON.parse(resultText);

  } catch (error) {
    console.error('AI check exception:', error.message);
    return { ...mockResponse, aiUnavailable: true, errorFallback: true };
  }
};
