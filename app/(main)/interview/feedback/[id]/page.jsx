import { auth } from "@clerk/nextjs/server";
import { db } from "../../../../../lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "../../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../../../components/ui/accordion";
import { ArrowLeft, MessageSquare, Check, X, Star } from "lucide-react";
import { Badge } from "../../../../../components/ui/badge";

// Helper function to render a score as stars
const StarRating = ({ score }) => {
  const totalStars = 10;
  const filledStars = Math.round(score);
  return (
    <div className="flex items-center">
      <p className="font-bold text-lg mr-2">{score.toFixed(1)}/10</p>
      {Array.from({ length: totalStars }, (_, i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${
            i < filledStars ? "text-yellow-400 fill-yellow-400" : "text-muted"
          }`}
        />
      ))}
    </div>
  );
};

export default async function InterviewFeedbackPage({ params }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");
//   console.log(userId);  //clerkUserId ==userdId
// console.log(user);
  // Fetch the assessment AND securely check if it belongs to this user
  const assessment = await db.assessment.findFirst({
    where: {
      id,
      userId: user.id,
    },
  });

  // If no assessment found (or it doesn't belong to the user), show 404
  if (!assessment) {
    notFound();
  }

  // Handle cases where AI feedback might not have been generated
  if (
    assessment.type !== "VOICE" ||
    !assessment.feedback ||
    typeof assessment.feedback !== "object" ||
    !assessment.feedback.finalAssessment
  ) {
    return (
      <div className="container mx-auto space-y-4 py-6">
        <Link href="/interview">
          <Button variant="link" className="gap-2 pl-0">
            <ArrowLeft className="h-4 w-4" />
            Back to Interview Preparation
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Feedback Not Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              We couldn&apos;t find any feedback for this interview. This might
              be because the call ended early or an error occurred.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Safely parse the feedback data
  const feedback = assessment.feedback;
  const transcript = assessment.transcript || [];

  return (
    <div className="container mx-auto space-y-6 py-10 mt-10">
      <div>
        <Link href="/interview">
          <Button variant="link" className="gap-2 pl-0 -mt-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Interview Preparation
          </Button>
        </Link>
        <h1 className="text-5xl font-bold gradient-title mt-2">
          Interview Feedback
        </h1>
        <p className="text-lg text-muted-foreground">
          Review of your AI voice interview for{" "}
          <span className="font-semibold text-primary">
            {assessment.category}
          </span>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Detailed Feedback */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>AI Assessment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">{feedback.finalAssessment}</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Question by Question Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {feedback.individualFeedback &&
                  feedback.individualFeedback.map((item, index) => (
                    <AccordionItem value={`item-${index}`} key={index}>
                      <AccordionTrigger>
                        <div className="flex flex-col md:flex-row md:items-center justify-between w-full pr-4">
                          <span className="text-left font-medium md:w-3/4">
                            Q: {item.question}
                          </span>
                          <Badge
                            variant={item.score > 7 ? "default" : item.score > 4 ? "secondary" : "destructive"}
                            className="mt-2 md:mt-0"
                          >
                            Score: {item.score.toFixed(1)} / 10
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="p-4 bg-muted/50 rounded-md">
                          <p className="font-semibold">Your Answer:</p>
                          <p className="text-muted-foreground">
                            &quot;{item.answer}&quot;
                          </p>
                        </div>
                        <div className="p-4 bg-primary/5 rounded-md border-l-4 border-primary">
                          <p className="font-semibold">AI Feedback:</p>
                          <p className="text-muted-foreground">
                            {item.feedback}
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Score & Transcript */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-lg sticky top-6">
            <CardHeader>
              <CardTitle>Overall Score</CardTitle>
            </CardHeader>
            <CardContent>
              <StarRating score={feedback.totalScore} />
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Full Transcript</CardTitle>
              <CardDescription>
                A complete log of your conversation.
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto space-y-4">
              {transcript.map((item, index) => (
                <div key={index} className="flex flex-col">
                  <span
                    className={`font-semibold ${
                      item.role === "user" ? "text-blue-500" : "text-primary"
                    }`}
                  >
                    {item.role === "user" ? "You" : "Alex (AI)"}
                  </span>
                  <p className="text-muted-foreground">{item.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}