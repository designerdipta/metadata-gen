import { Groq } from 'groq-sdk';

class GroqService {
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
    // Round Robin: increment for next time
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return key;
  }

  async generateMetadata(base64Image, options) {
    const { titleLen, descLen, keywordCount, model = "meta-llama/llama-4-scout-17b-16e-instruct" } = options;
    
    // Retry logic for fallback
    let attempts = 0;
    const maxAttempts = this.apiKeys.length;

    while (attempts < maxAttempts) {
      const apiKey = this.getNextKey();
      if (!apiKey) throw new Error("No API keys configured");

      try {
        const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
        
        const prompt = `Analyze this image and provide metadata in JSON format with exactly three keys: "title", "description", and "keywords".

STRICT MANDATORY REQUIREMENTS:
1. Title: MUST be a COMPLETE sentence ending with a period (.). Target length: exactly or slightly less than ${titleLen[1]} characters. NEVER exceed ${titleLen[1]} characters. ABSOLUTE PRIORITY: DO NOT STOP MID-SENTENCE.
2. Keywords: MUST be an array of exactly ${keywordCount[1]} unique descriptive keywords.
3. Description: MUST consist of complete sentences and aim for approximately ${descLen[1]} characters.

Guidelines:
- Title: Descriptive, factual, and very long (to meet the requirement). Avoid brands or artist names.
- Keywords: Ordered by importance, including moods, and specific details.
- Output: ONLY the JSON object. No extra text.`;

        const response = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: base64Image,
                  },
                },
              ],
            },
          ],
          model: model,
          response_format: { type: "json_object" },
        });

        const content = JSON.parse(response.choices[0].message.content);
        return content;

      } catch (error) {
        console.error(`Attempt ${attempts + 1} failed with key ${apiKey.substring(0, 8)}...`, error);
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error("All API keys failed or were exhausted.");
        }
      }
    }
  }

  async generatePrompt(base64Image, options) {
    const { promptLen = 450, model = "meta-llama/llama-4-scout-17b-16e-instruct" } = options;
    
    let attempts = 0;
    const maxAttempts = this.apiKeys.length;

    while (attempts < maxAttempts) {
      const apiKey = this.getNextKey();
      if (!apiKey) throw new Error("No API keys configured");

      try {
        const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
        
        const prompt = `Analyze this image and provide a highly detailed, creative, and descriptive manual prompt that could be used to recreate this image. Focus on style, lighting, composition, and subject details. YOUR DESCRIPTION MUST BE APPROXIMATELY ${promptLen} CHARACTERS LONG. Output only the prompt text.`;

        const response = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: base64Image,
                  },
                },
              ],
            },
          ],
          model: model,
        });

        return response.choices[0].message.content;

      } catch (error) {
        console.error(`Attempt ${attempts + 1} failed with key ${apiKey.substring(0, 8)}...`, error);
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error("All API keys failed or were exhausted.");
        }
      }
    }
  }

  // Retry logic for fallback

  // Helper to convert File to Base64
  static fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }
}

export const groqService = new GroqService();
export default GroqService;
