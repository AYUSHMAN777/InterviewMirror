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
  
  // Vapi state
  const [vapi, setVapi] = useState(null);
  const [callStatus, setCallStatus] = useState("idle"); // idle, starting, active, finished
  const [isMuted, setIsMuted] = useState(false);
  
  // Interview data state
  const [assessmentId, setAssessmentId] =useState(null);
  const [currentMessage, setCurrentMessage] = useState(null);
  
  // UseRef for transcript to avoid re-renders
  // We will store all messages here
  const transcriptRef = useRef([]);

  // This function is called by the form's 'action'
  // It's a client-side function that calls our server action
  const handleStartInterview = async (formData) => {
    setCallStatus("starting");
    
    // 1. Call the server action to create the assessment in our DB
    const result = await startVoiceInterview(formData);

    if (result.error) {
      toast.error("Failed to start interview", { description: result.error });
      setCallStatus("idle");
      return;
    }
    
    // 2. We got the questions and assessmentId, now start Vapi call
    setAssessmentId(result.assessmentId);
    
    // 3. Initialize and start Vapi
    startVapiCall(result.assessmentId, result.questions);
  };

  // This function initializes and starts the Vapi call
  const startVapiCall = (newAssessmentId, newQuestions) => {
    // Make sure VAPI_PUBLIC_KEY is in your .env.local
    const vapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);
    setVapi(vapiInstance);
    
    // --- 1. Set up Vapi Listeners ---
    
    vapiInstance.on("call-start", () => {
      setCallStatus("active");
      toast.success("Interview started! Good luck.");
      transcriptRef.current = []; // Clear transcript
    });

    vapiInstance.on("call-end", async () => {
      setCallStatus("finished");
      toast.info("Interview ended. Saving your feedback...");
      
      // Call the server action to save the feedback
      const finalTranscript = transcriptRef.current;
      const result = await saveVoiceInterviewFeedback(newAssessmentId, finalTranscript);
      
      if (result.error) {
        toast.error("Failed to save feedback", { description: result.error });
        router.push("/interview"); // Go back even if save fails
      } else {
        toast.success("Feedback saved!");
        // We will create this feedback page in the next step
        router.push(`/interview/feedback/${result.assessmentId}`);
      }
    });

    vapiInstance.on("message", (message) => {
      // 'transcript' message is the final user/assistant speech
      if (message.type === "transcript") {
        const role = message.role;
        const text = message.transcript;
        
        // Add to our transcript log
        transcriptRef.current.push({ role, message: text });
        
        // Show the latest message on screen
        setCurrentMessage({ role, text });
      }
    });

    vapiInstance.on("error", (e) => {
      console.error(e);
      toast.error("An error occurred during the call", { description: e.message });
      setCallStatus("idle");
    });
    //how vapi works
    // Think of it like a voice router that:
    // Captures what you say (audio input)
    // Converts it to text (speech-to-text)
    // Sends the text to your AI model (Gemini, GPT, etc.)
    // Takes the model’s text response
    // Converts it back to speech (text-to-speech)
    // Streams it back to your speakers — in real time
    // --- 2. Start the Vapi Call ---
    vapiInstance.start({
      model: {
        provider: "google", 
        model: "gemini-1.5-flash",
        // This system prompt tells the AI how to behave
        systemPrompt: `You are an expert technical interviewer named 'Alex'. Your goal is to conduct a professional and helpful mock interview.
        The user's interview topic and a list of questions are provided in the 'variables'.
        1. Start by introducing yourself ("Hi, I'm Alex") and stating the interview topic.
        2. Ask the questions from the 'questions' variable one by one. Each item has a "question" and a "followUp".
        3. After the user answers a question, DO NOT give feedback.
        4. Simply acknowledge their answer ("Got it, thank you.", "Okay, thanks for sharing.") and then ask the corresponding 'followUp' question.
        5. After they answer the follow-up, acknowledge it and move to the next main question.
        6. Be friendly, professional, and conversational.
        7. After you have asked ALL questions, say "That's all the questions I have. Thank you for your time. Your feedback report will be generated now. Have a great day!" and then end the call.`,
      },
      voice: "jennifer-playht", // A good, clear voice
      variables: {
        assessmentId: newAssessmentId,
        questions: JSON.stringify(newQuestions), // Send questions to the AI
      }
    });
  };

  // --- Call Control Functions ---
  const handleEndCall = () => {
    vapi?.stop(); // This will trigger the 'call-end' listener
  };

  const toggleMute = () => {
    if (!vapi) return;
    const newMutedState = !isMuted;
    vapi.setMuted(newMutedState);
    setIsMuted(newMutedState);
  };
  
  // --- UI Rendering ---

  // Show this UI when the call is active or starting
  if (callStatus === "active" || callStatus === "starting") {
    return (
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg font-medium">
            {callStatus === "starting" ? "Connecting..." : "Interview in Progress"}
          </p>
          
          {/* Transcript Display */}
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

          {/* Call Controls */}
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

  // Show this UI before the call starts ("idle" or "finished")
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

