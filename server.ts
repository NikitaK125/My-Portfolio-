import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 3000;

// Initialize Google GenAI client safely
const getGeminiClient = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not defined. AI features might fail.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// 1. API Route: Generate highly customized Python AI/ML projects
app.post("/api/project/generate", async (req, res) => {
  try {
    const preferences = req.body;
    const { skillLevel, targetArea, timeline, focus, additionalPrompt } = preferences;

    if (!skillLevel || !targetArea || !timeline || !focus) {
      return res.status(400).json({ error: "Missing required preferences fields" });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are a world-class Staff AI/ML Research Engineer and Open Source Tech Lead representing and acting as the automated Portfolio Agent of Nikita Kalbande.
Nikita Kalbande is a brilliant AI/ML and Full-Stack Engineer graduating in year 2025 with an excellent CGPA of 8.21.
Your goal is to explain and write a spectacular, pristine open-source Python or Full-Stack code structure for Nikita's selected repository.
Make sure the structure, README, and code comments mention that this is part of Nikita Kalbande's Class of 2025 engineering showcase.

Ensure the Python or JavaScript files you write are highly professional, syntactically complete, clean, with real metrics and execution patterns, with zero boilerplate TODOs.`;

    const prompt = `Generate the deep-dive code files and architecture specification for one of Nikita Kalbande's projects or a custom proposed repository based on:
- Project Name/Topic: ${additionalPrompt || "General AI/ML portfolio tracker"}
- Target Domain: ${targetArea} (computer-vision, NLP, tabular-ml, generative-ai, or reinforcement-learning)
- Target Skill Level: ${skillLevel} (Beginner, Intermediate, or Advanced)
- Development Timeline: ${timeline}
- Code Architecture Focus: ${focus}

Generate:
1. README.md: Beautiful Markdown including a high-impact overview, architectural blueprint, performance goals, and setup procedures for Nikita Kalbande's 2025 portfolio.
2. requirements.txt: Comprehensive package list.
3. train_pipeline.py or main.py: Clean, complete execution flow showcasing data handling and parameters logging.
4. app.py or evaluate.py: A robust FastAPI handler or modular test file.

Your output must be strict JSON matching the responseSchema. Do not wrap in markdown \`\`\`json blocks.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            tagline: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            estimatedTime: { type: Type.STRING },
            focusArea: { type: Type.STRING },
            targetMetrics: { type: Type.STRING },
            problemStatement: { type: Type.STRING },
            datasetDetails: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                urlOrSource: { type: Type.STRING },
                dataType: { type: Type.STRING }
              },
              required: ["name", "description", "urlOrSource", "dataType"]
            },
            architecture: { type: Type.STRING, description: "ASCII diagram or modular flow description representing pipeline" },
            phases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  tasks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        label: { type: Type.STRING },
                        notes: { type: Type.STRING }
                      },
                      required: ["id", "label"]
                    }
                  }
                },
                required: ["title", "duration", "tasks"]
              }
            },
            files: {
              type: Type.OBJECT,
              description: "Files mapping filename/filepath to complete written code content",
              properties: {} // Let it accept dynamic filename keys
            }
          },
          required: ["title", "tagline", "difficulty", "estimatedTime", "focusArea", "targetMetrics", "problemStatement", "datasetDetails", "architecture", "phases", "files"]
        }
      }
    });

    const textOutput = response.text || "{}";
    const cleanedText = textOutput.trim();

    // Parse the JSON safely
    const parsedProject = JSON.parse(cleanedText);
    res.json(parsedProject);

  } catch (error: any) {
    console.error("Project generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate project structure" });
  }
});

// 2. API Route: Dynamic AI Advisor Chat/Co-Pilot
app.post("/api/project/chat", async (req, res) => {
  try {
    const { messages, projectContext } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are "AI Interviewer and Portfolio Advisor representing Nikita Kalbande".
Nikita Kalbande is a Computer Engineering graduate class of 2025 with an 8.21/10 CGPA from Sant Gadge Baba Amravati University, and a Diploma in Computer Engineering from Government Polytechnic Arvi with a 77.33% score.

Nikita's core projects are:
1. "Voice Command Based System Controller" (Uses Python speech-recognition, PyAudio, system automation, and subprocessing to execute system-level commands through natural language).
2. "Smart Notification System" (Leveraged Angular, TypeScript, and .NET Core to engineer a low-latency, cross-platform notifications hub).

Nikita's core technical skills for a fresher role are:
- Languages: C, Python, Java, C#
- Web / Frontend: HTML5, CSS3, Angular (basic), TypeScript (basic)
- Backend & Frameworks: .NET Core, REST API, LINQ, Entity Framework
- Databases: MS SQL Server, Database Design
- ML & Data Analytics: NumPy, Pandas, Scikit-learn, Data Preprocessing
- Dev Tools: Git, GitHub, MS Azure, Google Analytics, Figma (basic)

Nikita holds the following certifications:
- Microsoft Azure AI Essentials Professional Certificate
- Blockchain 101 – Infosys Springboard
- Google Analytics for Beginners
- Python Training – IIT Bombay Spoken Tutorial
- Employability Skills Program – Mahindra Pride Classroom

You are speaking to recruiters, tech leads, or developers. Highlight Nikita's authentic skillset with high precision, professional integrity, and depth. Avoid bringing up any unmentioned projects or extra skills.`;

    // Convert messages array to model chat system rules
    const formattedContents = messages.map((m: any) => ({
      role: m.role === "model" ? "model" as const : "user" as const,
      parts: [{ text: m.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });

    res.json({ text: response.text || "I'm ready to help you build this project!" });

  } catch (error: any) {
    console.error("Chat co-pilot error:", error);
    res.status(500).json({ error: error.message || "Failed to communicate with project advisor" });
  }
});

// Setup Vite & Static Assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
