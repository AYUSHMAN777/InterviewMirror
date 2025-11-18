import { auth } from "@clerk/nextjs/server";
import { db } from "../../../lib/prisma";
import  QuizList  from "./_components/quiz-list";
import  VoiceAssessmentList  from "./_components/voice-assessment-list"; // <-- Import new component
import StatsCard from "./_components/stats-card";
import PerformanceChart from "./_components/performance-chart";
import { Button } from "../../../components/ui/button";
import Link from "next/link";
import { Mic, FileText } from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card"; // Import Card
import { getAssessments } from "../../../actions/interview"; // Import your action

export default async function InterviewPage() {
  let allAssessments = [];
  try {
    // Use your server action to get data
    allAssessments = (await getAssessments()) || [];
  } catch (error) {
    console.error("Failed to fetch assessments:", error);
    // Continue with empty assessments
  }

  // --- THIS IS THE NEW LOGIC ---
  // Separate assessments by type
  const quizAssessments = allAssessments.filter(
    (a) => a.type === "QUIZ" || !a.type // Handle old data without a type
  );
  
  const voiceAssessments = allAssessments.filter(
    (a) => a.type === "VOICE"
  );
  // --- END OF NEW LOGIC ---

  const totalAssessments = allAssessments.length;
  const averageScore =
    totalAssessments > 0
      ? allAssessments.reduce((acc, a) => acc + (a.quizScore || 0), 0) /
        totalAssessments
      : 0;

  return (
    <div className="container mx-auto space-y-8 py-10 mt-10">
      <div>
        <h1 className="text-5xl font-bold gradient-title">
          Interview Preparation
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
          Hone your skills with AI-powered quizzes and mock interviews.
        </p>
      </div>

      {/* --- NEW START SECTION --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <FileText className="h-12 w-12 text-blue-500 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Technical Quiz</h2>
            <p className="text-muted-foreground mb-4">
              Test your knowledge with multiple-choice quizzes.
            </p>
            <Link href="/interview/mock" className="w-full">
              <Button className="w-full" variant="outline">Start Quiz</Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <Mic className="h-12 w-12 text-primary mb-4" />
            <h2 className="text-2xl font-semibold mb-2">AI Voice Interview</h2>
            <p className="text-muted-foreground mb-4">
              Practice a live interview with an AI agent.
            </p>
            <Link href="/interview/agent-mock-interview" className="w-full">
              <Button className="w-full">Start AI Interview</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-8">
          
          {/* --- RENDER VOICE INTERVIEWS --- */}
          <div>
            <h2 className="text-3xl font-semibold mb-4">
              Recent Voice Interviews
            </h2>
            <VoiceAssessmentList assessments={voiceAssessments} />
          </div>

          {/* --- RENDER QUIZZES --- */}
          <div>
            <h2 className="text-3xl font-semibold mb-4">Recent Quizzes</h2>
            {/* Pass the filtered list to your existing component */}
            <QuizList assessments={quizAssessments} />
          </div>

        </div>
        <div className="space-y-6 lg:col-span-1">
          <h2 className="text-3xl font-semibold">Your Stats</h2>
          <StatsCard
            assessments={allAssessments}
          />
            <PerformanceChart assessments={allAssessments} />
        </div>
      </div>
    </div>
  );
}