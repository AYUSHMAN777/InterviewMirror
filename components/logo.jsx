import React from "react";
import { Sparkles } from "lucide-react";

export const Logo = () => {
  return (
    <div className="flex items-center gap-2 group">
      {/* Icon Container with Gradient Background */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/0 border border-primary/20 shadow-sm transition-all duration-300 group-hover:shadow-primary/20 group-hover:border-primary/40">
        <Sparkles className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
      </div>
      
      {/* Text Logo */}
      <span className="text-xl font-bold tracking-tight text-foreground">
        Interview
        <span className="text-primary">Mirror</span>
      </span>
    </div>
  );
};

export default Logo;