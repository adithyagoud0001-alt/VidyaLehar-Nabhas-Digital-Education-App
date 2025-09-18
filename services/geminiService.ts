import { GoogleGenAI } from "@google/genai";
import type { Student, Teacher } from '../types';

// Per guidelines, the API key must be obtained from the environment.
// For browser-based apps using a build tool like Vite, this is done via `import.meta.env`.
// Fix: Cast `import.meta` to `any` to bypass TypeScript error "Property 'env' does not exist on type 'ImportMeta'".
const apiKey = (import.meta as any).env.VITE_API_KEY;

// Initialize the client only if the API key is available.
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;


// Fix: Add askAITutor function to be exported and used in AITutor.tsx component
export const askAITutor = async (
    question: string,
    lessonContext: string,
    lessonTitle: string,
    user: Student | Teacher,
    performanceContext: { attempts: number; bestScore: number } | null
): Promise<string> => {
    // Fix: Check if the GoogleGenAI instance was successfully created.
    if (!ai) {
      return "The AI Tutor is not configured. Please add a valid Gemini API key.";
    }

    const model = 'gemini-2.5-flash';

    const strippedContext = lessonContext.replace(/<[^>]+>/g, '');

    let performanceInfo = "The student has not attempted the quiz for this lesson yet.";
    if (performanceContext) {
        performanceInfo = `The student has attempted the quiz ${performanceContext.attempts} time(s) with a best score of ${performanceContext.bestScore}%.`;
    }

    const prompt = `
        You are a friendly and encouraging AI tutor for a student named ${user.name} in a rural school in India.
        Your goal is to help them understand their lesson better.
        - Explain concepts in simple, clear English.
        - Be patient and supportive.
        - Base your answers strictly on the provided lesson content.
        - If the question is unrelated to the lesson, politely state that you can only answer questions about the current topic.
        - Keep answers concise and focused.

        Here is the context for the student's question:
        Lesson Title: "${lessonTitle}"
        Lesson Content: "${strippedContext}"
        Student's prior performance: ${performanceInfo}

        Now, here is the student's question:
        "${question}"

        Please provide a helpful answer.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });

        // Fix: Directly access the 'text' property as per guidelines. It is guaranteed to exist on a successful response.
        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini API for AI tutor:", error);
        throw new Error("Failed to get a response from the AI tutor.");
    }
};

export const generateLessonSummary = async (
    lessonTitle: string,
    lessonContent: string
): Promise<string> => {
    // Fix: Check if the GoogleGenAI instance was successfully created.
     if (!ai) {
      return "AI Summary generation is not configured. Please add a valid Gemini API key.";
    }
    const model = 'gemini-2.5-flash';

    // Remove HTML tags for a cleaner prompt
    const strippedContent = lessonContent.replace(/<[^>]+>/g, '');

    const prompt = `
        You are an expert educator creating a lesson summary for students in a rural school in India.
        The summary should be concise, in simple English, and highlight 2-4 key learning points.
        Do not use markdown. The output should be a single paragraph.

        Lesson Title: "${lessonTitle}"
        Lesson Content: "${strippedContent}"

        Generate the summary.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });

        // Fix: Directly access the 'text' property as per guidelines.
        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini API for summary generation:", error);
        throw new Error("Failed to generate a summary from the AI.");
    }
};