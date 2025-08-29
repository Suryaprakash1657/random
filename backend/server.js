import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAttractions } from "./utils/retriever.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Load local attractions dataset ---
const dataPath = path.resolve("data/attractions.json");
let attractions = [];
try {
  const rawData = fs.readFileSync(dataPath, "utf-8");
  attractions = JSON.parse(rawData);
  console.log("✅ Attractions data loaded:", attractions.length, "entries");
} catch (err) {
  console.error("❌ Failed to load attractions.json:", err.message);
}

// Weather API route
app.get("/api/weather", async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) {
      return res.status(400).json({ error: "City is required" });
    }

    const weatherKey = process.env.WEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${weatherKey}&units=metric`;

    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error("❌ Weather API Error:", error.message);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

// Trip planner route (Hybrid: RAG + Gemini)
app.post("/api/plan-trip", async (req, res) => {
  try {
    const { destination, days, budget } = req.body;

    // Step 1: RAG retrieval
    const localAttractions = getAttractions(destination);

    // Step 2: Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.9,
        topP: 0.9,
        topK: 40,
        stopSequences: ["END_OF_PLAN"],
      },
    });

    // Step 3: Build hybrid prompt
    const systemPrompt = `
You are a travel planner AI. Plan a ${days}-day trip to ${destination}.

Rules:
1. The total budget MUST be exactly $${budget}.
2. Distribute the budget across accommodation, food, activities/transport, shopping/miscellaneous.
3. Use these local attractions if relevant:
${localAttractions.map(a => `- ${a.name} (${a.type}): ${a.description}`).join("\n")}
4. Output in valid JSON only with the structure:
{
  "destination": "...",
  "days": ...,
  "daily_plan": [
    { 
      "day": 1, 
      "plan": {
        "morning": "...",
        "afternoon": "...",
        "evening": "..."
      }
    },
    { 
      "day": 2, 
      "plan": {
        "morning": "...",
        "afternoon": "...",
        "evening": "..."
      }
    }
  ],
  "budget_estimate": {
    "total": ${budget},
    "breakdown": {
      "accommodation": ...,
      "food": ...,
      "activities_and_transport": ...,
      "shopping_and_miscellaneous": ...
    }
  }
}
Return JSON only. Do not add explanations. Finish output with "END_OF_PLAN".
`;
    const userPrompt = `Plan a trip to ${destination} for ${days} days with a budget of $${budget}.`;
    const prompt = `${systemPrompt}\n\nUser request: ${userPrompt}`;

    // Step 4: Generate with Gemini
    const result = await model.generateContent(prompt);

    let raw = result.response.text();
    raw = raw.replace(/```json|```/g, "").replace(/END_OF_PLAN/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("❌ JSON Parse Error:", e.message, "\nRaw Output:", raw);
      return res.status(500).json({ error: "AI returned invalid JSON" });
    }

    const usage = result.response.usageMetadata;
    console.log("🔹 Token Usage:", usage);

    // Step 5: Return hybrid response (AI + RAG)
    res.json({
      plan: parsed,
      attractions: localAttractions, // explicitly include RAG results
      tokens: usage,
    });
  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    res.status(500).json({ error: "Failed to fetch plan." });
  }
});

// RAG test endpoint
app.get("/test-rag", (req, res) => {
  const attraction = getAttractions("Chennai");
  res.json({ query: "What attractions are in Chennai?", results: attraction });
});

// Start server
const PORT = process.env.PORT || 5000;
console.log("Gemini API Key loaded:", !!process.env.GEMINI_API_KEY);
console.log("Weather API Key loaded:", !!process.env.WEATHER_API_KEY);

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
