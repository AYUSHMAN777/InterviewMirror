"use server";

import { db } from "../lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai"; // Using your existing import
import { revalidatePath } from "next/cache";
import { redis } from "../lib/redis";
import { Resend } from "resend";
// Using your existing 'ai' constant initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ""
});
// Initialize Resend 
const resend = new Resend(process.env.RESEND_API_KEY)

// --- Helper function to generate questions (using @google/genai) ---
async function generateAIQuestions(topic, level, existingQuestions = []) {
  try {
    const model = "gemini-2.0-flash"; // Using a model that supports JSON generation

    const prompt = `
      You are an expert technical interviewer. Generate 5 unique interview questions for a ${level} ${topic} position.
      Provide a simple one-sentence follow-up question for each.
      Do not repeat any of these previous questions: ${existingQuestions.join(", ")}.
      
      Return ONLY a JSON object in this exact format:
      {
        "questions": [
          {
            "question": "string",
            "followUp": "string"
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      // generationConfig: {
      //   responseType: "json", // Request JSON output
      // },
    });


    const text = response.text;
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const data = JSON.parse(cleanedText);

    // console.log("Generated Questions:", data);
    // console.log(data.questions);
    return data.questions;

  } catch (error) {
    console.error("Error generating AI questions:", error);
    // Fallback to mock data on error
    return [
      { question: `Tell me about your experience with ${topic}?`, followUp: "Can you give a specific example?" },
      { question: "What is a project you are proud of?", followUp: "What was the biggest challenge?" },
    ];
  }
}

// --- Helper function to generate feedback (for VOICE) ---
async function generateAIFeedback(transcriptMessages) {
  try {
    const model = "gemini-2.0-flash";
    const transcriptText = transcriptMessages.map(msg => `${msg.role}: ${msg.message}`).join("\n");

    if (transcriptText.trim().length === 0) {
      throw new Error("Transcript is empty");
    }

    const prompt = `
      You are an expert interview coach. Analyze the following interview transcript.
      Provide constructive feedback and a score (from 1 to 10) for each question answered by the user.
      Also provide an overall summary and a final score from 1-10.
      The user's answers are from the 'user' role.
      
      Return ONLY a JSON object in this exact format:
      {
        "totalScore": 10,
        "finalAssessment": "string",
        "individualFeedback": [
          {
            "question": "string",
            "answer": "string",
            "feedback": "string",
            "score": 10
          }
        ]
      }
      
      Transcript:
      ${transcriptText}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      // generationConfig: {
      //   responseType: "json",
      // },
    });

    const text = response.text;
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const data = JSON.parse(cleanedText);

    // console.log(data);
    return data;

  } catch (error) {
    console.error("Error generating AI feedback:", error);
    // Fallback to mock data on error
    return {
      totalScore: 7.5,
      finalAssessment: "Good effort! You provided solid answers but could be more specific with your examples. (AI analysis fallback)",
      individualFeedback: [
        { question: "Transcript was unclear or empty", answer: "N/A", feedback: "AI analysis failed or transcript was empty.", score: 0 }
      ]
    };
  }
}

// ===============================================
// === NEW SERVER ACTION 1: STARTVOICEINTERVIEW ===
// ===============================================
export async function startVoiceInterview(formData) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");


    const topic = formData.get("topic") || user.industry || "General";
    const level = "Mid-level";

    const questions = await generateAIQuestions(topic, level, []);
    if (!questions || questions.length === 0) {
      return { error: "Failed to generate interview questions." };
    }

    const newAssessment = await db.assessment.create({
      data: {
        userId: user.id,
        type: "VOICE", // <-- HERE! We explicitly set the type
        category: topic,
        questions: questions,
        quizScore: 0,
        improvementTip: "Interview in progress...",
        transcript: [],
        feedback: {},
      },
    });
    await redis.del(`assessments:${userId}`);
    revalidatePath("/interview");

    return {
      success: true,
      assessmentId: newAssessment.id,
      questions: newAssessment.questions,
    };

  } catch (error) {
    console.error("Error starting voice interview:", error);
    return { error: `An unexpected error occurred: ${error.message}` };
  }
}

// ========================================================
// === NEW SERVER ACTION 2: SAVEVOICEINTERVIEWFEEDBACK ===
// ========================================================
export async function saveVoiceInterviewFeedback(assessmentId, transcriptMessages) {
  try {
    const { userId } = await auth();
    if (!assessmentId) return { error: "Assessment ID is missing" };
    if (!transcriptMessages || !Array.isArray(transcriptMessages)) return { error: "Transcript data is missing or invalid" };

    if (transcriptMessages.length === 0) {
      await db.assessment.update({
        where: { id: assessmentId },
        data: {
          improvementTip: "Interview ended before any conversation was recorded.",
          quizScore: 0,
          feedback: {
            totalScore: 0,
            finalAssessment: "Interview ended before any conversation was recorded.",
            individualFeedback: []
          },
        },
      });
      console.warn(`Assessment ${assessmentId}: Saved empty transcript.`);
      return { success: true, assessmentId: assessmentId };
    }

    const aiFeedback = await generateAIFeedback(transcriptMessages);
    console.log(aiFeedback);
    const updatedAssessment = await db.assessment.update({
      where: { id: assessmentId },
      data: {
        transcript: transcriptMessages,
        feedback: aiFeedback,
        quizScore: aiFeedback.totalScore,
        improvementTip: aiFeedback.finalAssessment,
      },
      include: { // <--- IMPORTANT: Fetch the user data so we can get their email(for Resend)
        user: true
      }
    });
    // Send feedback email via Resend
    if (updatedAssessment.user?.email) {
      await resend.emails.send({
        from: 'InterviewMirror <onboarding@resend.dev>', // Use your verified domain or this test one
        to: updatedAssessment.user.email,
        subject: `Interview Feedback: ${aiFeedback.totalScore}/10`,
        html: `
                <h1>Your Interview Feedback is Ready!</h1>
                <p>Great job completing your mock interview. Here is your summary:</p>
                <h2>Score: <strong>${aiFeedback.totalScore}/10</strong></h2>
                <h3>Overall Feedback:</h3>
                <p>${aiFeedback.finalAssessment}</p>
                <br />
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/interview/feedback/${assessmentId}">
                    View Full Detailed Feedback
                </a>
            `
      });
    }
    if (userId) {
      await redis.del(`assessments:${userId}`);
    }
    revalidatePath("/interview");

    return { success: true, assessmentId: updatedAssessment.id };

  } catch (error) {
    console.error(`Error saving feedback for assessment ${assessmentId}:`, error);
    try {
      await db.assessment.update({
        where: { id: assessmentId },
        data: {
          improvementTip: `Failed to process feedback: ${error.message}`,
          transcript: transcriptMessages || [],
          feedback: {
            totalScore: 0,
            finalAssessment: `Failed to generate feedback: ${error.message}`,
            individualFeedback: []
          },
        },
      });
    } catch (updateError) {
      console.error(`Failed to update assessment ${assessmentId} with error status:`, updateError);
    }
    return { error: `Failed to save feedback: ${error.message}` };
  }
}

// =====================================================
// === YOUR EXISTING FUNCTIONS (Slightly improved) ===
// =====================================================
export async function generateQuiz() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      industry: true,
      skills: true,
    },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    Generate 10 technical interview questions for a ${user.industry
    } professional${user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
    }.
    
    Each question should be multiple choice with 4 options.
    
    Return the response in this JSON format only, no additional text:
    {
      "questions": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": "string",
          "explanation": "string"
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const text = response.text;
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const quiz = JSON.parse(cleanedText);

    return quiz.questions;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Failed to generate quiz questions");
  }
}

export async function saveQuizResult(questions, answers, score) {//questions is array question 
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const questionResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));
  // console.log(questionResults)

  // Get wrong answers
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  // Only generate improvement tips if there are wrong answers
  let improvementTip = null;
  if (wrongAnswers.length > 0) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvementPrompt = `
      The user got the following ${user.industry} technical interview questions wrong:

      ${wrongQuestionsText}

      Based on these mistakes, provide a concise, specific improvement tip.
      Focus on the knowledge gaps revealed by these wrong answers.
      Keep the response under 2 sentences and make it encouraging.
      Don't explicitly mention the mistakes, instead focus on what to learn/practice.
    `;

    try {
      const tipResponse = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: improvementPrompt,
      });

      improvementTip = tipResponse.text.trim();
      // console.log(improvementTip);
    } catch (error) {
      console.error("Error generating improvement tip:", error);
      // Continue without improvement tip if generation fails
    }
  }
//save to db
  try {
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip,
      },

    });
    // --- 4. SEND EMAIL NOTIFICATION ---
    if (user.email) {
      const tipText = improvementTip ? `<p><strong>Tip for next time:</strong> ${improvementTip}</p>` : "<p>Perfect score! Keep it up.</p>";

      await resend.emails.send({
        from: 'InterviewMirror <onboarding@resend.dev>',
        to: user.email,
        subject: `Quiz Results: ${score.toFixed(1)}%`,
        html: `
                <h1>Your Quiz Results are In!</h1>
                <p>You just completed a technical quiz. Here is how you did:</p>
                <h2>Score: <strong>${score.toFixed(1)}%</strong></h2>
                ${tipText}
                <br />
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/interview">
                    View Your Progress
                </a>
            `
      });
    }
    await redis.del(`assessments:${userId}`);
    // console.log(data);
    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

export async function getAssessments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");
  const cacheKey = `assessments:${userId}`;

  try {
    // 1. Try to fetch from Redis
    const cachedAssessments = await redis.get(cacheKey);
    if (cachedAssessments) {
      console.log(`CACHE HIT: Assessments for ${userId}`);
      return cachedAssessments;
    }

    console.log(`CACHE MISS: Assessments for ${userId}`);

    // 2. If miss, fetch from Database
    const assessments = await db.assessment.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    await redis.set(cacheKey, assessments, { ex: 3600 });

    return assessments;
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Failed to fetch assessments");
  }
}
