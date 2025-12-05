"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";

const HeroSection = () => {
  const imageRef = useRef(null);

  useEffect(() => {
    const imageElement = imageRef.current;

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const scrollThreshold = 100;

      if (scrollPosition > scrollThreshold) {
        imageElement.classList.add("scrolled");
      } else {
        imageElement.classList.remove("scrolled");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="w-full pt-32 md:pt-40 pb-20 overflow-hidden mt-[-70px]">
      <div className="container mx-auto px-4">
        {/* New Grid Layout: 1 column on small screens, 2 columns on large screens (lg:) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column: Text and Buttons */}
          <div className="space-y-8 text-center lg:text-left animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="space-y-6">
              <h1 className="text-4xl font-bold md:text-5xl lg:text-6xl xl:text-7xl gradient-title animate-gradient leading-tight">
                Unlock Your Full Potential
                <br className="hidden lg:block" /> with AI-Powered Coaching
              </h1>
              <p className="mx-auto lg:mx-0 max-w-[600px] text-muted-foreground text-lg md:text-xl">
                Master your interviews, refine your resume, and land your dream job.
                Our advanced AI platform provides personalized insights and practice
                to accelerate your career growth.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
              <Link href="/interview">
                <Button size="lg" className="w-full sm:w-auto px-8 text-lg h-12 rounded-full cursor-pointer">
                  Get Started Free
                </Button>
              </Link>
              <Link href="#demo">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 text-lg h-12 rounded-full">
                  Watch Demo
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column: Image */}
          <div className="hero-image-wrapper mt-12 lg:mt-0 relative z-10 perspective-1000">
            <div  >
              <Image
                 src="/interview mirror background image.png"
                width={1200}
                height={605}
                alt="AI Career Coach Dashboard showing interview analysis"
                // The image will now fill its column width (w-full) and adjust height automatically (h-auto)
                className="mx-auto w-full h-auto rounded-2xl shadow-[0_20px_50px_rgba(99,102,241,0.25)] border border-primary/20 lg:max-w-none max-w-2xl"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default HeroSection;