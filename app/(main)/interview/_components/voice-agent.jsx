"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import Vapi from "@vapi-ai/web";
import { toast } from "sonner"; // Using your existing sonner component
import { startVoiceInterview, saveVoiceInterviewFeedback } from "../../../../actions/interview";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Mic, MicOff, PhoneOff, Loader2 } from "lucide-react";

// --- Submit Button Component ---
// This is a helper for our form so the button shows a loading state
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Starting...
        </>
      ) : (
        "Start Voice Interview"
      )}
    </Button>
  );
}

// --- Main Voice Agent Component ---
export function VoiceAgent() {
  const router = useRouter();
  const [vapi, setVapi] = useState(null);
  const [callStatus, setCallStatus] = useState("idle"); // idle, starting, active, finished
  const [isMuted, setIsMuted] = useState(false);
  const [assessmentId, setAssessmentId] = useState(null);
  const [currentMessage, setCurrentMessage] = useState(null);
  const transcriptRef = useRef([]); // Stores the full transcript { role, message }

  // This is a CLIENT function that calls our SERVER ACTION
  const handleStartInterview = async (formData) => {
    setCallStatus("starting");

    // 1. Call the Server Action to create the Assessment in our DB
    const result = await startVoiceInterview(formData);
    // in result we get assessmentId and questions;

    if (result.error) {
      toast.error("Failed to start interview", { description: result.error });
      setCallStatus("idle");
      return;
    }

    // 2. The action was successful. Save the ID
    setAssessmentId(result.assessmentId);

    // 3. Now, start the Vapi call using the questions from the action
    startVapiCall(result.assessmentId, result.questions);
  };

  // This function initializes and starts the Vapi call
  const startVapiCall = (newAssessmentId, newQuestions) => {
    // 1. Initialize Vapi using the Token from your .env.local file
    const vapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN);
    setVapi(vapiInstance);

    // --- 2. Set up Vapi Listeners ---
    vapiInstance.on("call-start", () => {
      setCallStatus("active");
      toast.success("Interview started! Good luck.");
      transcriptRef.current = []; // Clear transcript at the start of a call
    });

    vapiInstance.on("call-end", async () => {
      setCallStatus("finished");
      toast.info("Interview ended. Saving your feedback...");

      // 5. When call ends, get the full transcript
      const finalTranscript = transcriptRef.current;

      // 6. Call our server action to save the transcript and feedback
      const result = await saveVoiceInterviewFeedback(newAssessmentId, finalTranscript);

      if (result.error) {
        toast.error("Failed to save feedback", { description: result.error });
        router.push("/interview"); // Go back to interview page even if save fails
      } else {
        toast.success("Feedback saved!");
        // We will create this feedback page in the next step
        router.push(`/interview/feedback/${result.assessmentId}`);
      }
    });

    vapiInstance.on("message", (message) => {
      // 4. While the call is active, log the conversation
      if (message.type === "transcript" && message.transcriptType === "final") {
        const role = message.role;
        const text = message.transcript;

        // Add to transcript ref
        transcriptRef.current.push({ role, message: text });

        // Update live message for UI
        setCurrentMessage({ role, text });
      }
    });

    vapiInstance.on("error", (e) => {
      console.error(e);
      toast.error("An error occurred during the call", { description: e.message });
      setCallStatus("idle"); // Reset UI on error
    });

    // --- 3. Format the Questions ---
    // We format the questions as a single string to pass to the assistant
    const formattedQuestions = newQuestions.map((q, i) =>
      `Question ${i + 1}: ${q.question}\nFollow-up ${i + 1}: ${q.followUp}`
    ).join("\n\n"); // Join questions with a double newline

    // --- 4. Start the Vapi Call ---
    // This uses the Assistant ID you created on the Vapi dashboard
    vapiInstance.start(
      process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID, // 1. The ID as the first argument
      {
        variableValues: { // 2. The key is 'variableValues'
          questions: formattedQuestions
        }
      }
    );
  };

  // --- Call Control Functions ---
  const handleEndCall = () => {
    vapi?.stop(); // This will trigger the "call-end" event
  };

  const toggleMute = () => {
    if (!vapi) return;
    const newMutedState = !isMuted;
    vapi.setMuted(newMutedState);
    setIsMuted(newMutedState);
  };

  // --- UI Rendering ---

  // In-Call and Connecting UI
  if (callStatus === "active" || callStatus === "starting") {
    return (
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg font-medium">
            {callStatus === "starting" ? "Connecting..." : "Interview in Progress"}
          </p>

          <div className="w-full h-24 p-2 border rounded-md bg-background overflow-y-auto">
            {currentMessage ? (
              <p>
                <span className={`font-semibold ${currentMessage.role === 'user' ? 'text-blue-500' : 'text-primary'}`}>
                  {currentMessage.role === 'user' ? 'You: ' : 'Alex: '}
                </span>
                {currentMessage.text}
              </p>
            ) : (
              <p className="text-muted-foreground">Waiting for call to start...</p>
            )}
          </div>

          <div className="flex gap-4">
            <Button
              onClick={toggleMute}
              variant="outline"
              size="lg"
              className="rounded-full p-4"
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
            <Button
              onClick={handleEndCall}
              variant="destructive"
              size="lg"
              className="rounded-full p-4"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default "Start" UI
  return (
    <div className="border rounded-lg p-6 bg-card">
      <form action={handleStartInterview} className="space-y-4">
        <div>
          <label htmlFor="topic" className="block text-sm font-medium mb-1">
            Interview Topic
          </label>
          <Input
            id="topic"
            name="topic"
            placeholder="e.g., React, Java, Marketing (or leave blank for your profile topic)"
            className="max-w-md"
          />
          <p className="text-xs text-muted-foreground mt-1">
            If you leave this blank, we'll use the industry from your profile.
          </p>
        </div>
        <SubmitButton />
      </form>
    </div>
  );
}