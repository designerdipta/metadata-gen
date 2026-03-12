
class GeminiService {
  constructor() {
    this.apiKeys = [];
    this.currentKeyIndex = 0;
  }

  setApiKeys(keys) {
    this.apiKeys = keys.filter(k => k && k.trim() !== '');
    this.currentKeyIndex = 0;
  }

  getNextKey() {
    if (this.apiKeys.length === 0) return null;
    const key = this.apiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return key;
  }

  async fetchGemini(apiKey, model, parts) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: parts
        }],
        generationConfig: {
            response_mime_type: "application/json"
        }
      })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Gemini API error');
    }

    return await response.json();
  }

  async generateMetadata(base64Image, options) {
    const { titleLen, descLen, keywordCount, model = "gemini-2.5-flash" } = options;
    
    // Strip data prefix if exists
    const base64Data = base64Image.split(',')[1] || base64Image;
    const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/jpeg';

    const prompt = `Analyze this image and provide metadata in JSON format with exactly three keys: "title", "description", and "keywords".

STRICT MANDATORY REQUIREMENTS:
1. Title: MUST be a COMPLETE, grammatically correct sentence ending with a period (.).
   - TARGET LENGTH: It MUST be within 5-8 characters of ${titleLen[1]} (e.g., if target is 110, aim for 102-110).
   - COMPLETENESS: It is CRITICAL that the sentence is fully finished. NEVER cut off mid-word or mid-thought.
   - MAXIMUM: Never exceed ${titleLen[1]} characters under any circumstances.
2. Keywords: MUST be an array of exactly ${keywordCount[1]} unique descriptive keywords.
3. Description: MUST consist of complete sentences and aim for approximately ${descLen[1]} characters.

Guidelines:
- Title: Descriptive, factual, and very long (to meet the requirement). Avoid brands or artist names.
- Keywords: Ordered by importance, including moods, and specific details.
- Output: ONLY the JSON object. No extra text.`;

    const parts = [
      { inline_data: { mime_type: mimeType, data: base64Data } },
      { text: prompt }
    ];

    let attempts = 0;
    const maxAttempts = this.apiKeys.length;

    while (attempts < maxAttempts) {
      const apiKey = this.getNextKey();
      try {
        const result = await this.fetchGemini(apiKey, model, parts);
        const text = result.candidates[0].content.parts[0].text;
        // Gemini sometimes wraps JSON in markdown blocks
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(jsonStr);
      } catch (error) {
        console.error(`Gemini attempt ${attempts + 1} failed:`, error);
        attempts++;
        if (attempts >= maxAttempts) throw error;
      }
    }
  }

  async generatePrompt(base64Image, options) {
    const { promptLen = 450, model = "gemini-2.5-flash" } = options;
    const base64Data = base64Image.split(',')[1] || base64Image;
    const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/jpeg';

    const prompt = `Analyze this image and provide a highly detailed, creative, and descriptive manual prompt that could be used to recreate this image. Focus on style, lighting, composition, and subject details. YOUR DESCRIPTION MUST BE APPROXIMATELY ${promptLen} CHARACTERS LONG. Output only the prompt text.`;

    const parts = [
      { inline_data: { mime_type: mimeType, data: base64Data } },
      { text: prompt }
    ];

    let attempts = 0;
    const maxAttempts = this.apiKeys.length;

    while (attempts < maxAttempts) {
      const apiKey = this.getNextKey();
      try {
        const result = await this.fetchGemini(apiKey, model, parts);
        return result.candidates[0].content.parts[0].text;
      } catch (error) {
        console.error(`Gemini prompt attempt ${attempts + 1} failed:`, error);
        attempts++;
        if (attempts >= maxAttempts) throw error;
      }
    }
  }
}

export const geminiService = new GeminiService();
export default GeminiService;
