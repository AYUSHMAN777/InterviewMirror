import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { VoiceAgent } from "../_components/voice-agent"; // We will create this next
import { Suspense } from "react";

export default function AgentMockInterviewPage() {
  return (
    <div className="container mx-auto space-y-4 py-6">
      <div className="flex flex-col space-y-2 mx-2">
        <Link href="/interview">
          <Button variant="link" className="gap-2 pl-0">
            <ArrowLeft className="h-4 w-4" />
            Back to Interview Preparation
          </Button>
        </Link>

        <div>
          <h1 className="text-6xl font-bold gradient-title">
            AI Voice Interview
          </h1>
          <p className="text-muted-foreground">
            Practice your speaking skills with an AI interviewer.
          </p>
        </div>
      </div>

      {/* Suspense is good practice for client components */}
      <Suspense fallback={<div className="p-4 rounded-lg border bg-card">Loading Voice Agent...</div>}>
        <VoiceAgent />
      </Suspense>
    </div>
  );
}

