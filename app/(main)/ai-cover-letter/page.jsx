import { getCoverLetters } from "../../../actions/cover-letter";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "../../../components/ui/button";
import CoverLetterList from "./_components/cover-letter-list";

export default async function CoverLetterPage() {
  const coverLetters = await getCoverLetters();

  return (
    // STRUCTURE CHANGE 1: Added 'container mx-auto' to center content on large screens
    // STRUCTURE CHANGE 2: Used 'py-6' for vertical spacing instead of random margins
    <div className="container mx-auto px-4 md:px-6 py-6 mt-17"> {/* Kept mt-17 if that's your header offset */}
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-2 items-center justify-between mb-8">
        <h1 className="text-4xl md:text-6xl font-bold gradient-title">
          My Cover Letters
        </h1>
        <Link href="/ai-cover-letter/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
        </Link>
      </div>

      {/* List Section */}
      <CoverLetterList coverLetters={coverLetters} />
    </div>
  );
}