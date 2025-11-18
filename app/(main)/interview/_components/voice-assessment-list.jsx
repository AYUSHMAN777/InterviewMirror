import Link from "next/link";
import { Mic, Clock } from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";

export default function VoiceAssessmentList({ assessments }) {
  if (!assessments || assessments.length === 0) {
    return (
      <Card className="shadow-lg border-dashed">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            You haven&apos;t completed any voice interviews yet.
          </p>
          <Link href="/interview/agent-mock-interview">
            <Button className="w-full mt-4" variant="outline">
              Start Your First AI Interview
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {assessments.map((assessment) => (
        <Card key={assessment.id} className="shadow-lg flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-center mb-2">
              <Mic className="h-10 w-10 text-primary p-2 bg-primary/10 rounded-lg" />
              <Badge variant="outline" className="capitalize">
                {assessment.category}
              </Badge>
            </div>
            <CardTitle>AI Voice Interview</CardTitle>
            <CardDescription className="flex items-center gap-2 pt-1">
              <Clock className="h-4 w-4" />
              {new Date(assessment.createdAt).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col justify-end">
            <div className="flex items-baseline justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">Score</p>
                    <p className="text-4xl font-bold text-primary">
                        {/* We use 10 as the max score from our AI feedback prompt */}
                        {assessment.quizScore.toFixed(1)}
                        <span className="text-lg text-muted-foreground">/ 10</span>
                    </p>
                </div>
                {/* We will create this feedback page in the next step */}
                <Link href={`/interview/feedback/${assessment.id}`}>
                    <Button>View Feedback</Button>
                </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}